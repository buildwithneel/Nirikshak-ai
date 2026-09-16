import uuid
import json
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_
from database.models import (
    InspectionDB,
    InspectionAnalysisDB,
    OfficerObservationDB,
    OfficerVerificationDB,
    ComplaintDB,
    UserDB,
)
from audit.service import log_audit_event, get_audit_events_for_entity
from notifications.service import create_notification


VALID_INSPECTION_STATUSES = [
    "DRAFT",
    "IN_PROGRESS",
    "PENDING_OFFICER_REVIEW",
    "VERIFIED",
    "REPORT_GENERATED",
    "CLOSED",
]

ALLOWED_TRANSITIONS = {
    "DRAFT": ["IN_PROGRESS", "CLOSED"],
    "IN_PROGRESS": ["PENDING_OFFICER_REVIEW", "VERIFIED", "DRAFT", "CLOSED"],
    "PENDING_OFFICER_REVIEW": ["VERIFIED", "IN_PROGRESS", "CLOSED"],
    "VERIFIED": ["REPORT_GENERATED", "CLOSED"],
    "REPORT_GENERATED": ["CLOSED", "VERIFIED"],
    "CLOSED": [],
}


def create_inspection(
    db: Session,
    current_user: UserDB,
    product_name: str,
    brand: Optional[str] = None,
    retail_point: Optional[str] = None,
    category: Optional[str] = None,
    complaint_id: Optional[str] = None,
    package_image_url: Optional[str] = None,
    source: str = "FIELD_INSPECTION",
) -> InspectionDB:
    """Creates a new official inspection record in the database."""
    today_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    rand_hex = uuid.uuid4().hex[:6].upper()
    inspection_id = f"INSP-{today_str}-{rand_hex}"
    now = datetime.now(timezone.utc).isoformat()

    complaint_ref = None
    if complaint_id:
        c = db.query(ComplaintDB).filter(ComplaintDB.id == complaint_id).first()
        if c:
            complaint_ref = c.complaint_reference

    inspection = InspectionDB(
        id=inspection_id,
        inspection_reference=inspection_id,
        complaint_id=complaint_id,
        complaint_reference=complaint_ref,
        officer_id=current_user.id,
        product_name=product_name,
        brand=brand,
        retail_point=retail_point or "Field Surveillance Point",
        category=category or "Packaged Commodity",
        source=source,
        status="IN_PROGRESS",
        verification_state="UNVERIFIED",
        compliance_score=0,
        package_image_url=package_image_url,
        report_status="NOT_GENERATED",
        report_pdf_path=None,
        created_at=now,
        updated_at=now,
        completed_at=None,
    )
    db.add(inspection)
    db.commit()
    db.refresh(inspection)

    # Audit event
    log_audit_event(
        db=db,
        actor_user_id=current_user.id,
        actor_email=current_user.email,
        action="INSPECTION_CREATED",
        entity_type="INSPECTION",
        entity_id=inspection_id,
        metadata={"product_name": product_name, "complaint_id": complaint_id},
    )

    create_notification(
        db=db,
        title="Inspection Initiated",
        message=f"Official inspection {inspection_id} started for {product_name}.",
        role_target="OFFICER",
        link=f"/inspections/{inspection_id}/workspace",
    )

    return inspection


def get_inspections(
    db: Session,
    current_user: UserDB,
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
) -> List[InspectionDB]:
    """List inspection records with pagination (Officers only)."""
    query = db.query(InspectionDB)

    if status and status != "ALL":
        query = query.filter(InspectionDB.status == status)

    if search:
        s = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                InspectionDB.id.ilike(s),
                InspectionDB.product_name.ilike(s),
                InspectionDB.brand.ilike(s),
                InspectionDB.complaint_id.ilike(s),
            )
        )

    offset = max(0, (page - 1) * page_size)
    return query.order_by(InspectionDB.created_at.desc()).offset(offset).limit(page_size).all()


def get_inspection_by_id(db: Session, inspection_id: str) -> Optional[InspectionDB]:
    """Fetch complete inspection entity."""
    return db.query(InspectionDB).filter(InspectionDB.id == inspection_id).first()


def update_inspection_status(
    db: Session, current_user: UserDB, inspection_id: str, new_status: str
) -> InspectionDB:
    """Enforces state machine transitions on inspection records."""
    inspection = db.query(InspectionDB).filter(InspectionDB.id == inspection_id).first()
    if not inspection:
        raise ValueError(f"Inspection {inspection_id} not found.")

    curr = inspection.status
    if curr != new_status:
        allowed = ALLOWED_TRANSITIONS.get(curr, [])
        if new_status not in allowed:
            raise ValueError(f"Illegal state transition from {curr} to {new_status}. Allowed: {allowed}")

        inspection.status = new_status
        inspection.updated_at = datetime.now(timezone.utc).isoformat()
        if new_status == "CLOSED":
            inspection.completed_at = datetime.now(timezone.utc).isoformat()

        db.commit()
        db.refresh(inspection)

        log_audit_event(
            db=db,
            actor_user_id=current_user.id,
            actor_email=current_user.email,
            action="INSPECTION_STATUS_TRANSITION",
            entity_type="INSPECTION",
            entity_id=inspection_id,
            metadata={"from": curr, "to": new_status},
        )

    return inspection


def save_inspection_analysis(
    db: Session,
    current_user: UserDB,
    inspection_id: str,
    ocr_text: str,
    ocr_lines: List[Dict[str, Any]],
    declarations: Dict[str, Any],
    findings: List[Dict[str, Any]],
    compliance_score: int,
    processing_time_ms: float = 0.0,
    evidence_metadata: Optional[Dict[str, Any]] = None,
) -> InspectionAnalysisDB:
    """Stores AI analysis results structured in database and updates compliance score."""
    inspection = db.query(InspectionDB).filter(InspectionDB.id == inspection_id).first()
    if not inspection:
        raise ValueError(f"Inspection {inspection_id} not found.")

    now = datetime.now(timezone.utc).isoformat()

    analysis = (
        db.query(InspectionAnalysisDB)
        .filter(InspectionAnalysisDB.inspection_id == inspection_id)
        .first()
    )

    if not analysis:
        analysis = InspectionAnalysisDB(
            id=f"analysis-{uuid.uuid4().hex[:10]}",
            inspection_id=inspection_id,
            ocr_text=ocr_text,
            ocr_lines_json=json.dumps(ocr_lines),
            declarations_json=json.dumps(declarations),
            normalized_values_json=json.dumps({}),
            statutory_findings_json=json.dumps(findings),
            evidence_metadata_json=json.dumps(evidence_metadata or {}),
            analysis_timestamp=now,
            ocr_processing_time_ms=processing_time_ms,
        )
        db.add(analysis)
    else:
        analysis.ocr_text = ocr_text
        analysis.ocr_lines_json = json.dumps(ocr_lines)
        analysis.declarations_json = json.dumps(declarations)
        analysis.statutory_findings_json = json.dumps(findings)
        analysis.evidence_metadata_json = json.dumps(evidence_metadata or {})
        analysis.analysis_timestamp = now
        analysis.ocr_processing_time_ms = processing_time_ms

    inspection.compliance_score = compliance_score
    inspection.status = "PENDING_OFFICER_REVIEW"
    inspection.updated_at = now

    db.commit()
    db.refresh(analysis)
    db.refresh(inspection)

    log_audit_event(
        db=db,
        actor_user_id=current_user.id,
        actor_email=current_user.email,
        action="AI_ANALYSIS_COMPLETED",
        entity_type="INSPECTION",
        entity_id=inspection_id,
        metadata={"compliance_score": compliance_score, "findings_count": len(findings)},
    )

    return analysis


def save_officer_observation(
    db: Session,
    current_user: UserDB,
    inspection_id: str,
    category: str,
    observation: str,
) -> OfficerObservationDB:
    """Records a physical observation for package conditions AI cannot determine."""
    inspection = db.query(InspectionDB).filter(InspectionDB.id == inspection_id).first()
    if not inspection:
        raise ValueError(f"Inspection {inspection_id} not found.")

    obs_id = f"obs-{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()

    obs = OfficerObservationDB(
        id=obs_id,
        inspection_id=inspection_id,
        officer_id=current_user.id,
        category=category,
        observation=observation,
        created_at=now,
        updated_at=now,
    )
    db.add(obs)
    db.commit()
    db.refresh(obs)

    log_audit_event(
        db=db,
        actor_user_id=current_user.id,
        actor_email=current_user.email,
        action="OFFICER_OBSERVATION_ADDED",
        entity_type="INSPECTION",
        entity_id=inspection_id,
        metadata={"category": category},
    )

    return obs


def record_officer_verification(
    db: Session,
    current_user: UserDB,
    inspection_id: str,
    reviewed_ai_findings: bool,
    reviewed_visual_evidence: bool,
    recorded_physical_observations: bool,
    officer_decision: str,
    officer_notes: Optional[str] = None,
    legal_basis: Optional[str] = None,
    officer_justification: Optional[str] = None,
    decision_type: str = "STANDARD",
) -> OfficerVerificationDB:
    """
    Submits formal officer verification checklist and decision with provenance tracking.
    Transitions inspection state to VERIFIED.
    """
    inspection = db.query(InspectionDB).filter(InspectionDB.id == inspection_id).first()
    if not inspection:
        raise ValueError(f"Inspection {inspection_id} not found.")

    now = datetime.now(timezone.utc).isoformat()

    verif = (
        db.query(OfficerVerificationDB)
        .filter(OfficerVerificationDB.inspection_id == inspection_id)
        .first()
    )

    if not verif:
        verif = OfficerVerificationDB(
            id=f"verif-{uuid.uuid4().hex[:10]}",
            inspection_id=inspection_id,
            officer_id=current_user.id,
            reviewed_ai_findings=reviewed_ai_findings,
            reviewed_visual_evidence=reviewed_visual_evidence,
            recorded_physical_observations=recorded_physical_observations,
            officer_decision=officer_decision,
            officer_notes=officer_notes,
            legal_basis=legal_basis,
            officer_justification=officer_justification,
            decision_type=decision_type,
            verified_at=now,
        )
        db.add(verif)
    else:
        verif.reviewed_ai_findings = reviewed_ai_findings
        verif.reviewed_visual_evidence = reviewed_visual_evidence
        verif.recorded_physical_observations = recorded_physical_observations
        verif.officer_decision = officer_decision
        verif.officer_notes = officer_notes
        verif.legal_basis = legal_basis
        verif.officer_justification = officer_justification
        verif.decision_type = decision_type
        verif.verified_at = now

    inspection.status = "VERIFIED"
    inspection.verification_state = officer_decision
    inspection.updated_at = now

    # If linked to a complaint, update complaint status accordingly
    if inspection.complaint_id:
        complaint = db.query(ComplaintDB).filter(ComplaintDB.id == inspection.complaint_id).first()
        if complaint:
            complaint.status = "UNDER_REVIEW" if officer_decision == "REVIEW_REQUIRED" else "RESOLVED"
            complaint.officer_notes = f"Inspection {inspection_id} verified with decision: {officer_decision}."
            complaint.updated_at = now

    db.commit()
    db.refresh(verif)
    db.refresh(inspection)

    log_audit_event(
        db=db,
        actor_user_id=current_user.id,
        actor_email=current_user.email,
        action="INSPECTION_VERIFIED",
        entity_type="INSPECTION",
        entity_id=inspection_id,
        metadata={
            "decision": officer_decision,
            "decision_type": decision_type,
            "legal_basis": legal_basis,
        },
    )

    create_notification(
        db=db,
        title="Inspection Verified",
        message=f"Inspection {inspection_id} verified: {officer_decision}.",
        role_target="OFFICER",
        link=f"/inspections/{inspection_id}/workspace",
    )

    return verif
