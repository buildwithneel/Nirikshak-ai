import os
import io
import uuid
import json
import hashlib
import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
import cv2
import numpy as np

from database.connection import get_db
from database.models import UserDB, InspectionDB, InspectionImageDB
from auth.dependencies import get_current_user, require_officer
from storage.service import storage_service
from audit.service import log_audit_event
from inspections.intelligence import run_cross_image_intelligence
from image_quality.analyzer import ImageQualityAnalyzer
from rapidocr_onnxruntime import RapidOCR

logger = logging.getLogger("nirikshak-images")
images_router = APIRouter(tags=["Inspection Images"])

# Shared OCR engine instance
ocr_engine = RapidOCR()

MAX_IMAGES_PER_INSPECTION = 10
VALID_PANEL_TYPES = {
    "FRONT", "BACK", "SIDE", "LEFT_SIDE", "RIGHT_SIDE", "TOP", "BOTTOM", "OTHER", "CONSUMER_SUBMISSION", "UNKNOWN"
}
VALID_SOURCES = {"CAMERA", "UPLOAD", "CONSUMER_SUBMISSION", "OFFICER_ADDED"}


class ImageResponseSchema(BaseModel):
    id: str
    inspection_id: str
    panel_type: str
    file_reference: str
    original_filename: Optional[str] = None
    mime_type: str
    source: str
    width: int
    height: int
    ocr_status: str
    created_at: str
    uploaded_by: Optional[str] = None
    image_hash: Optional[str] = None
    quality_json: Optional[str] = None

    class Config:
        from_attributes = True


class PanelUpdateSchema(BaseModel):
    panel_type: str


@images_router.post("/api/inspections/{inspection_id}/images", response_model=ImageResponseSchema)
async def upload_inspection_image(
    inspection_id: str,
    image: UploadFile = File(...),
    panel_type: Optional[str] = Form("UNKNOWN"),
    source: Optional[str] = Form("OFFICER_ADDED"),
    current_user: UserDB = Depends(require_officer),
    db: Session = Depends(get_db),
):
    """
    Upload and register a package image for a specific inspection.
    Validates MIME type, file size, OpenCV decoding, and stores in storage service.
    """
    inspection = db.query(InspectionDB).filter(InspectionDB.id == inspection_id).first()
    if not inspection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inspection not found.")

    # Check maximum image limit per inspection (Section 45)
    existing_count = (
        db.query(InspectionImageDB)
        .filter(InspectionImageDB.inspection_id == inspection_id, InspectionImageDB.deleted_at == None)
        .count()
    )
    if existing_count >= MAX_IMAGES_PER_INSPECTION:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum limit of {MAX_IMAGES_PER_INSPECTION} images per inspection reached.",
        )

    # Validate panel type and source
    clean_panel = (panel_type or "UNKNOWN").upper().strip()
    if clean_panel not in VALID_PANEL_TYPES:
        clean_panel = "UNKNOWN"

    clean_source = (source or "OFFICER_ADDED").upper().strip()
    if clean_source not in VALID_SOURCES:
        clean_source = "OFFICER_ADDED"

    file_bytes = await image.read()

    try:
        file_ref, width, height = storage_service.store_image(
            file_bytes=file_bytes,
            filename=image.filename or "package.jpg",
            mime_type=image.content_type or "image/jpeg",
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))

    now = datetime.now(timezone.utc).isoformat()
    image_id = f"img-{uuid.uuid4().hex[:12]}"

    # Cryptographic SHA-256 evidence integrity hash
    image_hash = hashlib.sha256(file_bytes).hexdigest()

    # Deterministic image quality evaluation
    quality_data = ImageQualityAnalyzer.analyze_bytes(file_bytes)

    img_record = InspectionImageDB(
        id=image_id,
        inspection_id=inspection_id,
        panel_type=clean_panel,
        file_reference=file_ref,
        image_hash=image_hash,
        quality_json=json.dumps(quality_data),
        original_filename=image.filename or "package.jpg",
        mime_type=image.content_type or "image/jpeg",
        source=clean_source,
        width=width,
        height=height,
        ocr_status="PENDING",
        created_at=now,
        uploaded_by=current_user.id,
    )
    db.add(img_record)

    # Set as primary image if inspection has none
    if not inspection.package_image_url:
        inspection.package_image_url = f"/api/inspection-images/{image_id}/content"

    inspection.updated_at = now
    db.commit()
    db.refresh(img_record)

    log_audit_event(
        db=db,
        actor_user_id=current_user.id,
        actor_email=current_user.email,
        action="IMAGE_UPLOADED",
        entity_type="INSPECTION_IMAGE",
        entity_id=img_record.id,
        metadata={
            "inspection_id": inspection_id,
            "panel_type": clean_panel,
            "source": clean_source,
            "width": width,
            "height": height,
            "filename": image.filename,
            "sha256": image_hash,
            "quality_grade": quality_data.get("quality", "UNKNOWN"),
        },
    )

    return ImageResponseSchema.model_validate(img_record)


@images_router.get("/api/inspections/{inspection_id}/images", response_model=List[ImageResponseSchema])
async def list_inspection_images(
    inspection_id: str,
    current_user: UserDB = Depends(require_officer),
    db: Session = Depends(get_db),
):
    """Lists all active packaging panel images associated with an inspection."""
    records = (
        db.query(InspectionImageDB)
        .filter(InspectionImageDB.inspection_id == inspection_id, InspectionImageDB.deleted_at == None)
        .order_by(InspectionImageDB.created_at.asc())
        .all()
    )
    return [ImageResponseSchema.model_validate(r) for r in records]


@images_router.get("/api/inspection-images/{image_id}/content")
@images_router.get("/api/inspections/images/{image_id}/content")
async def get_image_content(
    image_id: str,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Streams image content for canvas display with evidence integrity verification
    and RBAC isolation.
    """
    record = db.query(InspectionImageDB).filter(InspectionImageDB.id == image_id).first()
    if not record or record.deleted_at:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found.")

    # Authorization check: only officers or the consumer who submitted the image can access
    if current_user.role != "OFFICER":
        if record.uploaded_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access to officer surveillance evidence is restricted to authorized personnel."
            )

    raw_bytes = storage_service.retrieve_image_bytes(record.file_reference)
    if not raw_bytes:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image file unavailable.")

    headers = {
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": f'inline; filename="{record.original_filename or "evidence.jpg"}"',
    }

    # Cryptographic evidence integrity verification
    if record.image_hash:
        current_hash = hashlib.sha256(raw_bytes).hexdigest()
        if current_hash != record.image_hash:
            logger.warning(f"EVIDENCE INTEGRITY WARNING: SHA-256 mismatch for image {image_id}")
            headers["X-Evidence-Integrity"] = "WARNING_MISMATCH"
        else:
            headers["X-Evidence-Integrity"] = "VERIFIED_INTACT"

    return Response(
        content=raw_bytes,
        media_type=record.mime_type,
        headers=headers,
    )


@images_router.patch("/api/inspection-images/{image_id}", response_model=ImageResponseSchema)
async def update_image_panel(
    image_id: str,
    payload: PanelUpdateSchema,
    current_user: UserDB = Depends(require_officer),
    db: Session = Depends(get_db),
):
    """Updates the classified package panel type (FRONT, BACK, SIDE, etc.)."""
    record = db.query(InspectionImageDB).filter(InspectionImageDB.id == image_id).first()
    if not record or record.deleted_at:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found.")

    clean_panel = payload.panel_type.upper().strip()
    if clean_panel not in VALID_PANEL_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid panel type '{payload.panel_type}'. Permitted: {', '.join(sorted(VALID_PANEL_TYPES))}",
        )

    old_panel = record.panel_type
    record.panel_type = clean_panel
    db.commit()
    db.refresh(record)

    log_audit_event(
        db=db,
        actor_user_id=current_user.id,
        actor_email=current_user.email,
        action="IMAGE_CLASSIFIED",
        entity_type="INSPECTION_IMAGE",
        entity_id=record.id,
        metadata={"old_panel": old_panel, "new_panel": clean_panel, "inspection_id": record.inspection_id},
    )

    # Re-run cross-image intelligence to update panel mapping
    inspection = db.query(InspectionDB).filter(InspectionDB.id == record.inspection_id).first()
    if inspection:
        run_cross_image_intelligence(inspection=inspection, db=db, actor_user=current_user)

    return ImageResponseSchema.model_validate(record)


@images_router.post("/api/inspection-images/{image_id}/ocr")
@images_router.post("/api/inspections/images/{image_id}/ocr")
async def execute_image_ocr(
    image_id: str,
    current_user: UserDB = Depends(require_officer),
    db: Session = Depends(get_db),
):
    """
    Executes RapidOCR ONNX specifically on the selected package image.
    Associates all extracted lines with image_id and updates cross-image intelligence.
    """
    record = db.query(InspectionImageDB).filter(InspectionImageDB.id == image_id).first()
    if not record or record.deleted_at:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found.")

    raw_bytes = storage_service.retrieve_image_bytes(record.file_reference)
    if not raw_bytes:
        record.ocr_status = "FAILED"
        db.commit()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image bytes not found.")

    try:
        record.ocr_status = "PROCESSING"
        db.commit()

        nparr = np.frombuffer(raw_bytes, np.uint8)
        cv_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if cv_img is None:
            record.ocr_status = "FAILED"
            db.commit()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to decode image bytes for OCR.")

        ocr_result, elapse_list = ocr_engine(cv_img)
        lines = []
        text_lines = []

        if ocr_result:
            for idx, item in enumerate(ocr_result):
                box_points = item[0]
                detected_text = str(item[1]).strip()
                confidence = float(item[2])

                if not detected_text:
                    continue

                text_lines.append(detected_text)
                pts = np.array(box_points, dtype=np.int32)
                min_x = int(np.min(pts[:, 0]))
                max_x = int(np.max(pts[:, 0]))
                min_y = int(np.min(pts[:, 1]))
                max_y = int(np.max(pts[:, 1]))

                width_px = max(1, max_x - min_x)
                height_px = max(1, max_y - min_y)

                norm_x = round((min_x / record.width) * 100, 2)
                norm_y = round((min_y / record.height) * 100, 2)
                norm_w = round((width_px / record.width) * 100, 2)
                norm_h = round((height_px / record.height) * 100, 2)

                lines.append({
                    "id": f"{image_id}-line-{idx + 1}",
                    "image_id": image_id,
                    "panel_type": record.panel_type,
                    "text": detected_text,
                    "confidence": round(confidence, 3),
                    "bounding_box": {
                        "x": min_x,
                        "y": min_y,
                        "width": width_px,
                        "height": height_px,
                    },
                    "normalized_box": {
                        "x": norm_x,
                        "y": norm_y,
                        "width": norm_w,
                        "height": norm_h,
                    },
                })

        record.ocr_text = "\n".join(text_lines)
        record.ocr_lines_json = json.dumps(lines)
        record.ocr_status = "COMPLETED"
        db.commit()

        log_audit_event(
            db=db,
            actor_user_id=current_user.id,
            actor_email=current_user.email,
            action="OCR_COMPLETED",
            entity_type="INSPECTION_IMAGE",
            entity_id=record.id,
            metadata={"lines_detected": len(lines), "panel": record.panel_type},
        )

        # Trigger cross-image intelligence aggregation
        inspection = db.query(InspectionDB).filter(InspectionDB.id == record.inspection_id).first()
        intelligence_result = {}
        if inspection:
            intelligence_result = run_cross_image_intelligence(
                inspection=inspection, db=db, actor_user=current_user
            )

        return {
            "success": True,
            "image_id": image_id,
            "lines_count": len(lines),
            "ocr_status": "COMPLETED",
            "intelligence": intelligence_result,
        }

    except Exception as e:
        logger.error(f"OCR execution failed on image {image_id}: {e}", exc_info=True)
        record.ocr_status = "FAILED"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OCR execution failed: {str(e)}",
        )


@images_router.delete("/api/inspection-images/{image_id}")
async def delete_inspection_image(
    image_id: str,
    current_user: UserDB = Depends(require_officer),
    db: Session = Depends(get_db),
):
    """Soft deletes an inspection image and recalculates cross-image evidence."""
    record = db.query(InspectionImageDB).filter(InspectionImageDB.id == image_id).first()
    if not record or record.deleted_at:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found.")

    now = datetime.now(timezone.utc).isoformat()
    record.deleted_at = now
    db.commit()

    log_audit_event(
        db=db,
        actor_user_id=current_user.id,
        actor_email=current_user.email,
        action="IMAGE_DELETED",
        entity_type="INSPECTION_IMAGE",
        entity_id=record.id,
        metadata={"inspection_id": record.inspection_id, "panel_type": record.panel_type},
    )

    # Recompute cross-image evidence without this image
    inspection = db.query(InspectionDB).filter(InspectionDB.id == record.inspection_id).first()
    if inspection:
        run_cross_image_intelligence(inspection=inspection, db=db, actor_user=current_user)

    return {"success": True, "message": "Image evidence soft-deleted."}
