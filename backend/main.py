import os
import io
import time
import logging
from typing import List, Optional, Any, Dict
import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import Response, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from rapidocr_onnxruntime import RapidOCR
from report_generator import generate_pdf_report

# Configure developer logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("nirikshak-ocr")

app = FastAPI(
    title="NIRIKSHAK AI — Real OCR Engine",
    description="Statutory packaging OCR API using RapidOCR (PaddleOCR ONNX) and OpenCV",
    version="1.0.0"
)

# CORS configuration: configurable via CORS_ORIGINS, with institutional defaults
cors_origins_env = os.environ.get("CORS_ORIGINS", "")
if cors_origins_env:
    allowed_origins = [orig.strip() for orig in cors_origins_env.split(",") if orig.strip()]
else:
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "https://nirikshak-ai.vercel.app",
    ]

# If in dev mode and not explicitly restricted, allow wildcard for testing
if os.environ.get("ENVIRONMENT", "development").lower() != "production" and not cors_origins_env:
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from middleware.logging_middleware import RequestLoggingMiddleware
from middleware.rate_limit import RateLimiterMiddleware

# Add request tracking and rate limiting middlewares
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RateLimiterMiddleware)

# Initialize RapidOCR engine once on startup
logger.info("Initializing RapidOCR engine (PaddleOCR ONNX)...")
ocr_engine = RapidOCR()
logger.info("RapidOCR engine ready.")

# Supported image types
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB


from declaration_extractor import DeclarationExtractor
from compliance_rules import LegalMetrologyRuleEngine
from database.migrations import run_migrations
from auth.routes import auth_router
from complaints.routes import complaints_router
from inspections.routes import inspections_router
from notifications.routes import notifications_router
from dashboard.routes import dashboard_router
from images.routes import images_router
from analytics.routes import analytics_router
from products.routes import products_router
from legal.routes import legal_router
from audit.routes import audit_router
from copilot.routes import copilot_router

# Run database migrations and seeding
try:
    logger.info("Running database migrations and seed data check...")
    run_migrations()
    logger.info("Database migrations successfully verified.")
except Exception as e:
    logger.error(f"Migration error: {e}", exc_info=True)

# Mount application routers
app.include_router(auth_router)
app.include_router(complaints_router)
app.include_router(inspections_router)
app.include_router(notifications_router)
app.include_router(dashboard_router)
app.include_router(images_router)
app.include_router(analytics_router)
app.include_router(products_router)
app.include_router(legal_router)
app.include_router(audit_router)
app.include_router(copilot_router)

# Initialize singletons on startup
declaration_extractor = DeclarationExtractor()
compliance_engine = LegalMetrologyRuleEngine()
START_TIME = time.time()



class BoundingBox(BaseModel):
    x: int
    y: int
    width: int
    height: int


class NormalizedBox(BaseModel):
    x: float
    y: float
    width: float
    height: float


class OCRLine(BaseModel):
    id: str
    text: str
    confidence: float  # 0.0 - 1.0
    bounding_box: BoundingBox
    normalized_box: NormalizedBox


class OCRResponse(BaseModel):
    success: bool
    image_width: int
    image_height: int
    text: str
    lines: List[OCRLine]
    processing_time_ms: float
    line_count: int
    error: Optional[str] = None


# --- Prompt 4: Compliance & Declaration Models ---
class ComplianceAnalysisRequest(BaseModel):
    lines: List[OCRLine]
    text: Optional[str] = ""
    image_width: Optional[int] = 0
    image_height: Optional[int] = 0


class DeclarationFieldResponse(BaseModel):
    key: str
    label: str
    detected_value: Optional[str] = None
    normalized_value: Optional[Any] = None
    confidence: float  # Extraction confidence (0.0 - 1.0)
    status: str  # "detected" | "missing" | "uncertain"
    source_line_ids: List[str]
    notes: Optional[str] = None


class ComplianceFindingResponse(BaseModel):
    id: str
    rule_id: str
    rule_reference: str
    statutory_title: str
    declaration_key: str
    status: str  # "COMPLIANT" | "REVIEW_REQUIRED" | "POTENTIAL_VIOLATION"
    what_detected: str
    what_expected: str
    reason: str
    extraction_confidence: int  # 0 - 100
    source_line_ids: List[str]


class ComplianceSummaryResponse(BaseModel):
    total_rules: int
    compliant_count: int
    review_required_count: int
    potential_violation_count: int


class ComplianceAnalysisResponse(BaseModel):
    success: bool
    declarations: Dict[str, DeclarationFieldResponse]
    findings: List[ComplianceFindingResponse]
    overall_status: str  # "COMPLIANT" | "REVIEW_REQUIRED" | "POTENTIAL_VIOLATION"
    compliance_score: int  # 0 - 100
    summary: ComplianceSummaryResponse
    processing_time_ms: float
    error: Optional[str] = None


from database.connection import engine, get_db_type, is_postgres
from storage.service import storage_service
from sqlalchemy import text


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "NIRIKSHAK AI OCR & Compliance Engine",
        "version": "1.2.0",
        "engine": "PaddleOCR ONNX Runtime + Legal Metrology Rule 6 Engine",
    }


@app.get("/api/health/live")
def liveness_probe():
    """Liveness probe: verifies that the process is responsive."""
    return {
        "status": "alive",
        "uptime_seconds": round(time.time() - START_TIME, 2),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


@app.get("/api/health/ready")
def readiness_probe():
    """Readiness probe: verifies all subsystems are ready to serve statutory requests."""
    db_ok = False
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception as e:
        logger.warning(f"Database readiness check failed: {e}")

    ocr_ok = ocr_engine is not None
    rules_ok = compliance_engine is not None

    all_ready = db_ok and ocr_ok and rules_ok

    if not all_ready:
        return JSONResponse(
            status_code=503,
            content={
                "status": "not_ready",
                "database": "connected" if db_ok else "unreachable",
                "ocr_engine": "ready" if ocr_ok else "unavailable",
                "rule_engine": "ready" if rules_ok else "unavailable",
            },
        )

    return {
        "status": "ready",
        "database": "connected",
        "ocr_engine": "ready",
        "rule_engine": "ready",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


@app.get("/api/health/detailed")
def detailed_health():
    """Detailed health check for production monitoring and field diagnostics."""
    db_status = "connected"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {str(e)}"

    storage_status = "writable"
    try:
        upload_dir = getattr(storage_service.provider, "base_dir", "uploads")
        if not os.path.exists(upload_dir) or not os.access(upload_dir, os.W_OK):
            storage_status = "not_writable"
    except Exception:
        storage_status = "unverified"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "version": "1.2.0",
        "service": "NIRIKSHAK AI Legal Metrology Platform",
        "uptime_seconds": round(time.time() - START_TIME, 2),
        "components": {
            "database": {
                "status": db_status,
                "engine": get_db_type(),
                "schema_version": 5,
            },
            "ocr_engine": {
                "name": "RapidOCR (PaddleOCR ONNX)",
                "status": "operational" if ocr_engine is not None else "unavailable",
                "runtime": "onnxruntime",
            },
            "compliance_engine": {
                "name": "LegalMetrologyRuleEngine",
                "status": "operational" if compliance_engine is not None else "unavailable",
                "rules_loaded": 10,
                "authority": "Ministry of Consumer Affairs, Legal Metrology (Packaged Commodities) Rules, 2011",
            },
            "storage": {
                "status": storage_status,
                "type": type(storage_service.provider).__name__,
            },
            "rate_limiter": {
                "status": "active",
                "type": "SlidingWindowMemory",
            },
        },
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


@app.post("/api/compliance/analyze", response_model=ComplianceAnalysisResponse)
async def analyze_compliance(payload: ComplianceAnalysisRequest):
    start_time = time.perf_counter()
    logger.info(f"Received compliance analysis request with {len(payload.lines)} OCR lines.")

    try:
        raw_lines = [line.model_dump() for line in payload.lines]
        declarations = declaration_extractor.extract_all(raw_lines, payload.text or "")
        evaluation = compliance_engine.evaluate_all(declarations)
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 1)

        return ComplianceAnalysisResponse(
            success=True,
            declarations=declarations,
            findings=evaluation["findings"],
            overall_status=evaluation["overall_status"],
            compliance_score=evaluation["compliance_score"],
            summary=ComplianceSummaryResponse(**evaluation["summary"]),
            processing_time_ms=elapsed_ms,
        )
    except Exception as e:
        logger.error(f"Compliance evaluation error: {e}", exc_info=True)
        return ComplianceAnalysisResponse(
            success=False,
            declarations={},
            findings=[],
            overall_status="REVIEW_REQUIRED",
            compliance_score=0,
            summary=ComplianceSummaryResponse(
                total_rules=0, compliant_count=0, review_required_count=0, potential_violation_count=0
            ),
            processing_time_ms=0.0,
            error=str(e),
        )


@app.post("/api/reports/generate-pdf")
async def generate_inspection_report(payload: Dict[str, Any]):
    """
    Generate professional AI-assisted Legal Metrology inspection report using ReportLab.
    """
    try:
        insp_id = payload.get("id", "INSP-UNASSIGNED")
        logger.info(f"Generating PDF report for inspection {insp_id}...")
        pdf_stream = generate_pdf_report(payload)
        pdf_bytes = pdf_stream.getvalue()

        clean_id = str(insp_id).replace(" ", "_")
        filename = f"NIRIKSHAK_AI_{clean_id}.pdf"

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Length": str(len(pdf_bytes)),
            },
        )
    except Exception as e:
        logger.error(f"Error generating PDF report: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate inspection PDF: {str(e)}")


def preprocess_image(image_bytes: bytes) -> tuple[np.ndarray, int, int]:
    """Reads image safely into OpenCV numpy array and extracts dimensions."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image bytes. Image may be corrupted or invalid.")
    height, width = img.shape[:2]
    return img, width, height


@app.post("/api/ocr", response_model=OCRResponse)
async def process_ocr(image: UploadFile = File(...)):
    start_time = time.perf_counter()
    logger.info(f"Received OCR request for file: {image.filename}, content_type: {image.content_type}")

    # 1. Validation
    if image.content_type and image.content_type.lower() not in ALLOWED_CONTENT_TYPES:
        filename_lower = (image.filename or "").lower()
        if not any(filename_lower.endswith(ext) for ext in ALLOWED_EXTENSIONS):
            logger.warning(f"Rejected invalid content type: {image.content_type}")
            return OCRResponse(
                success=False,
                image_width=0,
                image_height=0,
                text="",
                lines=[],
                processing_time_ms=0,
                line_count=0,
                error="Unsupported image format. Please upload JPG, PNG, or WEBP."
            )

    # 2. Read image content safely with size limit
    image_bytes = await image.read()
    if len(image_bytes) == 0:
        return OCRResponse(
            success=False,
            image_width=0,
            image_height=0,
            text="",
            lines=[],
            processing_time_ms=0,
            line_count=0,
            error="Empty image file received."
        )

    if len(image_bytes) > MAX_FILE_SIZE:
        return OCRResponse(
            success=False,
            image_width=0,
            image_height=0,
            text="",
            lines=[],
            processing_time_ms=0,
            line_count=0,
            error=f"File exceeds maximum allowed size of {MAX_FILE_SIZE // (1024*1024)}MB."
        )

    # 3. Decode with OpenCV
    try:
        cv_img, img_w, img_h = preprocess_image(image_bytes)
    except Exception as e:
        logger.error(f"Image decode failed: {e}")
        return OCRResponse(
            success=False,
            image_width=0,
            image_height=0,
            text="",
            lines=[],
            processing_time_ms=0,
            line_count=0,
            error="Corrupted or unreadable image file."
        )

    # 4. Execute Real OCR Engine
    try:
        # RapidOCR returns: list of [dt_boxes, text, score] or None
        ocr_result, elapse_list = ocr_engine(cv_img)
    except Exception as e:
        logger.error(f"OCR execution error: {e}", exc_info=True)
        return OCRResponse(
            success=False,
            image_width=img_w,
            image_height=img_h,
            text="",
            lines=[],
            processing_time_ms=(time.perf_counter() - start_time) * 1000,
            line_count=0,
            error=f"OCR engine failure: {str(e)}"
        )

    # 5. Process and structure OCR output
    lines: List[OCRLine] = []
    extracted_text_list: List[str] = []

    if ocr_result:
        for idx, item in enumerate(ocr_result):
            # item = [box_points, text, confidence]
            box_points = item[0]
            detected_text = str(item[1]).strip()
            confidence = float(item[2])

            if not detected_text:
                continue

            extracted_text_list.append(detected_text)

            # box_points is [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
            pts = np.array(box_points, dtype=np.int32)
            min_x = int(np.min(pts[:, 0]))
            max_x = int(np.max(pts[:, 0]))
            min_y = int(np.min(pts[:, 1]))
            max_y = int(np.max(pts[:, 1]))

            width_px = max(1, max_x - min_x)
            height_px = max(1, max_y - min_y)

            # Normalized percentage coordinates for responsive visual overlays
            norm_x = round((min_x / img_w) * 100, 2)
            norm_y = round((min_y / img_h) * 100, 2)
            norm_w = round((width_px / img_w) * 100, 2)
            norm_h = round((height_px / img_h) * 100, 2)

            lines.append(
                OCRLine(
                    id=f"ocr-line-{idx + 1}",
                    text=detected_text,
                    confidence=round(confidence, 3),
                    bounding_box=BoundingBox(
                        x=min_x,
                        y=min_y,
                        width=width_px,
                        height=height_px,
                    ),
                    normalized_box=NormalizedBox(
                        x=norm_x,
                        y=norm_y,
                        width=norm_w,
                        height=norm_h,
                    ),
                )
            )

    full_text = "\n".join(extracted_text_list)
    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 1)

    logger.info(
        f"OCR finished in {elapsed_ms}ms. Detected {len(lines)} lines. Characters: {len(full_text)}"
    )

    return OCRResponse(
        success=True,
        image_width=img_w,
        image_height=img_h,
        text=full_text,
        lines=lines,
        processing_time_ms=elapsed_ms,
        line_count=len(lines),
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "8000"))
    host = os.environ.get("HOST", "0.0.0.0" if os.environ.get("PORT") else "127.0.0.1")
    logger.info(f"Starting NIRIKSHAK AI API on {host}:{port}")
    uvicorn.run(app, host=host, port=port)
