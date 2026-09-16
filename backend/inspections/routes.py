import json
import hashlib
import logging
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import UserDB, InspectionDB, InspectionImageDB
from auth.dependencies import get_current_user, require_officer
from audit.service import get_audit_events_for_entity, log_audit_event
from report_generator import generate_pdf_report
from .service import (
    create_inspection,
    get_inspections,
    get_inspection_by_id,
    update_inspection_status,
    save_inspection_analysis,
    save_officer_observation,
    record_officer_verification,
)

logger = logging.getLogger("nirikshak-inspections")
inspections_router = APIRouter(prefix="/api/inspections", tags=["Inspections"])


# --- Schemas ---

class InspectionCreateSchema(BaseModel):
    product_name: str
    brand: Optional[str] = None
    retail_point: Optional[str] = None
    category: Optional[str] = None
    complaint_id: Optional[str] = None
    package_image_url: Optional[str] = None
    source: Optional[str] = "FIELD_INSPECTION"


class InspectionStatusUpdateSchema(BaseModel):
    status: str


class InspectionAnalysisSchema(BaseModel):
    ocr_text: str
    ocr_lines: Optional[List[Dict[str, Any]]] = None
    ocr_lines_json: Optional[str] = None
    declarations: Optional[Dict[str, Any]] = None
    declarations_json: Optional[str] = None
    findings: Optional[List[Dict[str, Any]]] = None
    statutory_findings_json: Optional[str] = None
    compliance_score: int
    processing_time_ms: Optional[float] = 0.0
    ocr_processing_time_ms: Optional[float] = 0.0
    evidence_metadata: Optional[Dict[str, Any]] = None


class OfficerObservationCreateSchema(BaseModel):
    category: str
    observation: str


class OfficerVerificationSchema(BaseModel):
    reviewed_ai_findings: bool
    reviewed_visual_evidence: bool
    recorded_physical_observations: bool
    officer_decision: Optional[str] = None
    verification_decision: Optional[str] = None
    statutory_action: Optional[str] = None
    legal_basis: Optional[str] = None
    officer_notes: Optional[str] = None
    officer_justification: Optional[str] = None


class AuditEventResponse(BaseModel):
    id: str
    actor_user_id: str
    actor_email: str
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    timestamp: str
    metadata: Optional[Dict[str, Any]] = None


# --- Endpoints ---

@inspections_router.post("", response_model=Dict[str, Any])
async def create_inspection_endpoint(
    payload: InspectionCreateSchema,
    current_user: UserDB = Depends(require_officer),
    db: Session = Depends(get_db),
):
    """Create a new official inspection."""
    insp = create_inspection(
        db=db,
        current_user=current_user,
        product_name=payload.product_name,
        brand=payload.brand,
        retail_point=payload.retail_point,
        category=payload.category,
        complaint_id=payload.complaint_id,
        package_image_url=payload.package_image_url,
        source=payload.source or "FIELD_INSPECTION",
    )
    return {
        "id": insp.id,
        "inspection_reference": insp.inspection_reference,
        "status": insp.status,
        "product_name": insp.product_name,
        "created_at": insp.created_at,
    }


@inspections_router.get("", response_model=List[Dict[str, Any]])
async def list_inspections_endpoint(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: UserDB = Depends(require_officer),
    db: Session = Depends(get_db),
):
    """List inspections with filter, search, and pagination."""
    records = get_inspections(
        db=db,
        current_user=current_user,
        status=status_filter,
        search=search,
        page=page,
        page_size=page_size,
    )
    results = []
    for r in records:
        results.append({
            "id": r.id,
            "inspection_reference": r.inspection_reference,
            "complaint_id": r.complaint_id,
            "complaint_reference": r.complaint_reference,
            "product_name": r.product_name,
            "brand": r.brand,
            "category": r.category,
            "retail_point": r.retail_point,
            "source": r.source,
            "status": r.status,
            "verification_state": r.verification_state,
            "compliance_score": r.compliance_score,
            "report_status": r.report_status,
            "created_at": r.created_at,
            "updated_at": r.updated_at,
        })
    return results


@inspections_router.get("/{inspection_id}", response_model=Dict[str, Any])
async def get_inspection_detail_endpoint(
    inspection_id: str,
    current_user: UserDB = Depends(require_officer),
    db: Session = Depends(get_db),
):
    """Get full inspection workspace payload."""
    insp = get_inspection_by_id(db, inspection_id)
    if not insp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inspection not found.")

    # Format structured analysis if present
    analysis_data = None
    if insp.analysis:
        analysis_data = {
            "ocr_text": insp.analysis.ocr_text,
            "ocr_lines": json.loads(insp.analysis.ocr_lines_json or "[]"),
            "declarations": json.loads(insp.analysis.declarations_json or "{}"),
            "findings": json.loads(insp.analysis.statutory_findings_json or "[]"),
            "evidence_metadata": json.loads(insp.analysis.evidence_metadata_json or "{}"),
            "processing_time_ms": insp.analysis.ocr_processing_time_ms,
            "analysis_timestamp": insp.analysis.analysis_timestamp,
        }

    # Format observations
    observations_data = []
    for obs in insp.observations:
        observations_data.append({
            "id": obs.id,
            "category": obs.category,
            "observation": obs.observation,
            "created_at": obs.created_at,
        })

    # Format verification
    verification_data = None
    if insp.verification:
        verification_data = {
            "reviewed_ai_findings": insp.verification.reviewed_ai_findings,
            "reviewed_visual_evidence": insp.verification.reviewed_visual_evidence,
            "recorded_physical_observations": insp.verification.recorded_physical_observations,
            "officer_decision": insp.verification.officer_decision,
            "officer_notes": insp.verification.officer_notes,
            "verified_at": insp.verification.verified_at,
        }

    # Complaint details if originating from grievance
    complaint_info = None
    if insp.complaint:
        complaint_info = {
            "id": insp.complaint.id,
            "complaint_reference": insp.complaint.complaint_reference,
            "consumer_email": insp.complaint.consumer_email,
            "description": insp.complaint.complaint_description,
            "image_reference": insp.complaint.image_reference,
            "status": insp.complaint.status,
            "created_at": insp.complaint.created_at,
        }

    return {
        "id": insp.id,
        "inspection_reference": insp.inspection_reference,
        "complaint_id": insp.complaint_id,
        "complaint_reference": insp.complaint_reference,
        "officer_id": insp.officer_id,
        "product_name": insp.product_name,
        "brand": insp.brand,
        "retail_point": insp.retail_point,
        "category": insp.category,
        "source": insp.source,
        "status": insp.status,
        "verification_state": insp.verification_state,
        "compliance_score": insp.compliance_score,
        "package_image_url": insp.package_image_url,
        "report_status": insp.report_status,
        "created_at": insp.created_at,
        "updated_at": insp.updated_at,
        "completed_at": insp.completed_at,
        "analysis": analysis_data,
        "observations": observations_data,
        "verification": verification_data,
        "complaint": complaint_info,
    }


@inspections_router.patch("/{inspection_id}", response_model=Dict[str, Any])
async def update_inspection_status_endpoint(
    inspection_id: str,
    payload: InspectionStatusUpdateSchema,
    current_user: UserDB = Depends(require_officer),
    db: Session = Depends(get_db),
):
    """Update inspection status respecting state machine."""
    try:
        insp = update_inspection_status(db, current_user, inspection_id, payload.status)
        return {"id": insp.id, "status": insp.status, "updated_at": insp.updated_at}
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))


@inspections_router.post("/{inspection_id}/analysis", response_model=Dict[str, Any])
async def save_analysis_endpoint(
    inspection_id: str,
    payload: InspectionAnalysisSchema,
    current_user: UserDB = Depends(require_officer),
    db: Session = Depends(get_db),
):
    """Save AI OCR and Legal Metrology compliance findings."""
    try:
        # Extract ocr_lines
        ocr_lines = payload.ocr_lines
        if ocr_lines is None and payload.ocr_lines_json:
            try:
                ocr_lines = json.loads(payload.ocr_lines_json)
            except Exception:
                ocr_lines = []
        if ocr_lines is None:
            ocr_lines = []

        # Extract declarations
        declarations = payload.declarations
        if declarations is None and payload.declarations_json:
            try:
                declarations = json.loads(payload.declarations_json)
            except Exception:
                declarations = {}
        if declarations is None:
            declarations = {}

        # Extract findings
        findings = payload.findings
        if findings is None and payload.statutory_findings_json:
            try:
                findings = json.loads(payload.statutory_findings_json)
            except Exception:
                findings = []
        if findings is None:
            findings = []

        analysis = save_inspection_analysis(
            db=db,
            current_user=current_user,
            inspection_id=inspection_id,
            ocr_text=payload.ocr_text,
            ocr_lines=ocr_lines,
            declarations=declarations,
            findings=findings,
            compliance_score=payload.compliance_score,
            processing_time_ms=payload.ocr_processing_time_ms or payload.processing_time_ms or 0.0,
            evidence_metadata=payload.evidence_metadata,
        )
        return {
            "success": True,
            "inspection_id": inspection_id,
            "compliance_score": payload.compliance_score,
            "timestamp": analysis.analysis_timestamp,
        }
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))


@inspections_router.post("/{inspection_id}/observations", response_model=Dict[str, Any])
async def add_observation_endpoint(
    inspection_id: str,
    payload: OfficerObservationCreateSchema,
    current_user: UserDB = Depends(require_officer),
    db: Session = Depends(get_db),
):
    """Add a physical inspection observation."""
    try:
        obs = save_officer_observation(
            db=db,
            current_user=current_user,
            inspection_id=inspection_id,
            category=payload.category,
            observation=payload.observation,
        )
        return {
            "id": obs.id,
            "category": obs.category,
            "observation": obs.observation,
            "created_at": obs.created_at,
        }
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))


@inspections_router.post("/{inspection_id}/verify", response_model=Dict[str, Any])
async def verify_inspection_endpoint(
    inspection_id: str,
    payload: OfficerVerificationSchema,
    current_user: UserDB = Depends(require_officer),
    db: Session = Depends(get_db),
):
    """
    Submits formal officer verification with statutory gates and decision provenance.
    Enforces that visual evidence, AI findings, and physical observations have been reviewed.
    """
    # Section 44 Verification Gate: Mandatory prerequisites
    if not payload.reviewed_visual_evidence:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification gate failed: Officer must confirm review of packaging visual evidence."
        )
    if not payload.reviewed_ai_findings:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification gate failed: Officer must confirm review of AI-assisted findings."
        )
    if not payload.recorded_physical_observations:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification gate failed: Officer must confirm physical observations before legal verification."
        )

    insp = db.query(InspectionDB).filter(InspectionDB.id == inspection_id).first()
    if not insp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Inspection {inspection_id} not found.")

    decision = payload.verification_decision or payload.officer_decision or "CONFIRM_VIOLATION"
    notes = payload.officer_justification or payload.officer_notes or ""

    # Check for AI override provenance
    decision_type = "STANDARD"
    if (insp.compliance_score >= 80 and "VIOLATION" in decision.upper()) or \
       (insp.compliance_score < 50 and "COMPLIANT" in decision.upper()):
        decision_type = "OVERRIDE_AI"
        if not notes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Statutory justification is required when officer decision overrides AI compliance findings."
            )

    try:
        verif = record_officer_verification(
            db=db,
            current_user=current_user,
            inspection_id=inspection_id,
            reviewed_ai_findings=payload.reviewed_ai_findings,
            reviewed_visual_evidence=payload.reviewed_visual_evidence,
            recorded_physical_observations=payload.recorded_physical_observations,
            officer_decision=decision,
            officer_notes=notes,
            legal_basis=payload.legal_basis or "Rule 6, Legal Metrology (Packaged Commodities) Rules, 2011",
            officer_justification=payload.officer_justification or notes,
            decision_type=decision_type,
        )
        return {
            "success": True,
            "decision": verif.officer_decision,
            "verification_decision": verif.officer_decision,
            "decision_type": verif.decision_type,
            "legal_basis": verif.legal_basis,
            "verified_at": verif.verified_at,
        }
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))


@inspections_router.get("/{inspection_id}/audit", response_model=List[AuditEventResponse])
async def get_inspection_audit_endpoint(
    inspection_id: str,
    current_user: UserDB = Depends(require_officer),
    db: Session = Depends(get_db),
):
    """Retrieve immutable audit timeline for this inspection."""
    events = get_audit_events_for_entity(db, entity_id=inspection_id)
    results = []
    for ev in events:
        meta = json.loads(ev.metadata_json) if ev.metadata_json else None
        results.append(
            AuditEventResponse(
                id=ev.id,
                actor_user_id=ev.actor_user_id,
                actor_email=ev.actor_email,
                action=ev.action,
                entity_type=ev.entity_type,
                entity_id=ev.entity_id,
                timestamp=ev.timestamp,
                metadata=meta,
            )
        )
    return results


@inspections_router.post("/{inspection_id}/generate-report")
@inspections_router.get("/{inspection_id}/report")
async def generate_report_endpoint(
    inspection_id: str,
    current_user: UserDB = Depends(require_officer),
    db: Session = Depends(get_db),
):
    """Generates official ReportLab PDF from persisted inspection data."""
    insp = get_inspection_by_id(db, inspection_id)
    if not insp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inspection not found.")

    # Build report dictionary
    findings_list = []
    declarations_dict = {}
    if insp.analysis:
        findings_list = json.loads(insp.analysis.statutory_findings_json or "[]")
        declarations_dict = json.loads(insp.analysis.declarations_json or "{}")

    # Format declarations list expected by report generator
    formatted_declarations = []
    for k, d in declarations_dict.items():
        if isinstance(d, dict):
            status_clean = "COMPLIANT" if d.get("status") == "detected" else "POTENTIAL_VIOLATION" if d.get("status") == "missing" else "REVIEW_REQUIRED"
            formatted_declarations.append({
                "ruleNumber": "Rule 6",
                "name": d.get("label", k),
                "status": status_clean,
                "detectedValue": d.get("detected_value") or "Not Detected",
                "requiredFormat": "Standard statutory declaration",
            })

    # Gather multi-image evidence
    from storage.service import storage_service
    images_records = (
        db.query(InspectionImageDB)
        .filter(InspectionImageDB.inspection_id == insp.id, InspectionImageDB.deleted_at == None)
        .order_by(InspectionImageDB.created_at.asc())
        .all()
    )
    images_list = []
    for im in images_records:
        raw_b = storage_service.retrieve_image_bytes(im.file_reference)
        images_list.append({
            "id": im.id,
            "panel_type": im.panel_type,
            "source": im.source,
            "raw_bytes": raw_b,
            "original_filename": im.original_filename,
        })

    # Gather conflicts & evidence locations
    conflicts_list = []
    evidence_locations_list = []
    ocr_lines_list = []
    if insp.analysis:
        if insp.analysis.evidence_metadata_json:
            try:
                meta = json.loads(insp.analysis.evidence_metadata_json)
                conflicts_list = meta.get("conflicts", [])
                evidence_locations_list = meta.get("evidence_locations", [])
            except Exception:
                pass
        if insp.analysis.ocr_lines_json:
            try:
                ocr_lines_list = json.loads(insp.analysis.ocr_lines_json)
            except Exception:
                pass

    # Gather observations
    observations_list = [
        {"category": obs.category, "observation": obs.observation, "created_at": obs.created_at}
        for obs in insp.observations
    ]

    # Gather audit events
    audit_records = get_audit_events_for_entity(db, entity_id=insp.id)
    audit_events_list = [
        {
            "action": ev.action,
            "actor": ev.actor_email,
            "timestamp": ev.timestamp,
            "entity": ev.entity_type,
        }
        for ev in audit_records[:10]
    ]

    report_payload = {
        "id": insp.id,
        "productName": insp.product_name,
        "brand": insp.brand or "Generic Brand",
        "category": insp.category or "Packaged Commodity",
        "retailPoint": insp.retail_point,
        "overallStatus": "COMPLIANT" if insp.compliance_score >= 80 else "POTENTIAL_VIOLATION" if insp.compliance_score < 50 else "REVIEW_REQUIRED",
        "complianceScore": insp.compliance_score,
        "declarations": formatted_declarations,
        "findings": findings_list,
        "images": images_list,
        "conflicts": conflicts_list,
        "evidenceLocations": evidence_locations_list,
        "ocrLines": ocr_lines_list,
        "observations": observations_list,
        "verification": {
            "decision": insp.verification.officer_decision if insp.verification else "UNVERIFIED",
            "notes": insp.verification.officer_notes if insp.verification else None,
            "verified_at": insp.verification.verified_at if insp.verification else None,
        } if insp.verification else None,
        "auditEvents": audit_events_list,
        "officerNotes": insp.verification.officer_notes if insp.verification else None,
        "complaintReference": insp.complaint_reference,
    }

    try:
        pdf_stream = generate_pdf_report(report_payload)
        pdf_bytes = pdf_stream.getvalue()

        # Compute cryptographic report integrity hash
        report_sha256 = hashlib.sha256(pdf_bytes).hexdigest()
        new_version = (insp.report_version or 1) if insp.report_status != "GENERATED" else (insp.report_version or 1) + 1

        # Update report metadata in DB
        insp.report_sha256 = report_sha256
        insp.report_version = new_version
        insp.report_status = "GENERATED"
        insp.status = "REPORT_GENERATED"
        db.commit()

        log_audit_event(
            db=db,
            actor_user_id=current_user.id,
            actor_email=current_user.email,
            action="REPORT_GENERATED",
            entity_type="INSPECTION",
            entity_id=insp.id,
            metadata={
                "report_version": new_version,
                "sha256": report_sha256,
                "byte_size": len(pdf_bytes),
            },
        )

        filename = f"NIRIKSHAK_{insp.id}_v{new_version}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Length": str(len(pdf_bytes)),
                "X-Report-SHA256": report_sha256,
                "X-Report-Version": str(new_version),
            },
        )
    except Exception as e:
        logger.error(f"Error generating PDF report for {inspection_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate inspection report: {str(e)}")


@inspections_router.get("/{inspection_id}/evidence")
async def get_inspection_evidence_endpoint(
    inspection_id: str,
    current_user: UserDB = Depends(require_officer),
    db: Session = Depends(get_db),
):
    """
    Returns unified evidence intelligence model linking:
    Findings <-> Declarations <-> OCR Lines <-> Images <-> Bounding Boxes.
    """
    insp = db.query(InspectionDB).filter(InspectionDB.id == inspection_id).first()
    if not insp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inspection not found.")

    evidence_meta = {}
    if insp.analysis and insp.analysis.evidence_metadata_json:
        try:
            evidence_meta = json.loads(insp.analysis.evidence_metadata_json)
        except Exception:
            evidence_meta = {}

    declarations = {}
    if insp.analysis and insp.analysis.declarations_json:
        try:
            declarations = json.loads(insp.analysis.declarations_json)
        except Exception:
            declarations = {}

    findings = []
    if insp.analysis and insp.analysis.statutory_findings_json:
        try:
            findings = json.loads(insp.analysis.statutory_findings_json)
        except Exception:
            findings = []

    # Get active images
    images = (
        db.query(InspectionImageDB)
        .filter(InspectionImageDB.inspection_id == inspection_id, InspectionImageDB.deleted_at == None)
        .order_by(InspectionImageDB.created_at.asc())
        .all()
    )

    return {
        "inspection_id": inspection_id,
        "compliance_score": insp.compliance_score,
        "images": [
            {
                "id": img.id,
                "panel_type": img.panel_type,
                "source": img.source,
                "width": img.width,
                "height": img.height,
                "ocr_status": img.ocr_status,
                "created_at": img.created_at,
            }
            for img in images
        ],
        "declarations": declarations,
        "findings": findings,
        "evidence_locations": evidence_meta.get("evidence_locations", []),
        "conflicts": evidence_meta.get("conflicts", []),
        "review_signals": evidence_meta.get("review_signals", []),
    }


@inspections_router.get("/{inspection_id}/conflicts")
async def get_inspection_conflicts_endpoint(
    inspection_id: str,
    current_user: UserDB = Depends(require_officer),
    db: Session = Depends(get_db),
):
    """Returns detected cross-panel declaration conflicts for an inspection."""
    insp = db.query(InspectionDB).filter(InspectionDB.id == inspection_id).first()
    if not insp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inspection not found.")

    conflicts = []
    if insp.analysis and insp.analysis.evidence_metadata_json:
        try:
            meta = json.loads(insp.analysis.evidence_metadata_json)
            conflicts = meta.get("conflicts", [])
        except Exception:
            conflicts = []

    return conflicts
