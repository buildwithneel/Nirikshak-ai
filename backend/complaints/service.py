import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_
from database.models import ComplaintDB, InspectionDB, UserDB
from audit.service import log_audit_event
from notifications.service import create_notification


VALID_COMPLAINT_STATUSES = {
    "SUBMITTED",
    "UNDER_REVIEW",
    "INSPECTION_REQUIRED",
    "INSPECTION_IN_PROGRESS",
    "RESOLVED",
    "CLOSED",
}


def create_complaint(
    db: Session,
    current_user: UserDB,
    product_name: str,
    issue_category: str,
    description: str,
    contact_email: Optional[str] = None,
    image_reference: Optional[str] = None,
    product_description: Optional[str] = None,
) -> ComplaintDB:
    """Submits a citizen grievance complaint backed by relational database."""
    ref_hex = uuid.uuid4().hex[:8].upper()
    complaint_id = f"CMP-{ref_hex}"
    now = datetime.now(timezone.utc).isoformat()
    email = contact_email or current_user.email

    complaint = ComplaintDB(
        id=complaint_id,
        complaint_reference=complaint_id,
        user_id=current_user.id,
        consumer_email=email,
        product_name=product_name,
        product_description=product_description or "Packaged Commodity",
        complaint_description=description,
        issue_category=issue_category,
        image_reference=image_reference,
        status="SUBMITTED",
        created_at=now,
        updated_at=now,
        reviewed_by=None,
        reviewed_at=None,
        officer_notes=None,
        linked_inspection_id=None,
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    # Log audit event
    log_audit_event(
        db=db,
        actor_user_id=current_user.id,
        actor_email=current_user.email,
        action="COMPLAINT_SUBMITTED",
        entity_type="COMPLAINT",
        entity_id=complaint_id,
        metadata={"product_name": product_name, "issue_category": issue_category},
    )

    # In-app notifications
    create_notification(
        db=db,
        title="New Grievance Submitted",
        message=f"New packaging grievance {complaint_id} received for {product_name}.",
        role_target="OFFICER",
        link=f"/complaints/{complaint_id}",
    )
    create_notification(
        db=db,
        title="Grievance Registered",
        message=f"Your complaint {complaint_id} for '{product_name}' was registered successfully.",
        user_id=current_user.id,
        link=f"/my-complaints/{complaint_id}",
    )

    return complaint


def get_complaints(
    db: Session,
    current_user: UserDB,
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
) -> List[ComplaintDB]:
    """
    Role-governed complaint query with pagination:
    - Officers receive all complaints across jurisdiction.
    - Consumers receive strictly their own submissions.
    """
    query = db.query(ComplaintDB)

    if current_user.role != "OFFICER":
        query = query.filter(ComplaintDB.user_id == current_user.id)

    if status and status != "ALL":
        query = query.filter(ComplaintDB.status == status)

    if search:
        s = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                ComplaintDB.id.ilike(s),
                ComplaintDB.product_name.ilike(s),
                ComplaintDB.consumer_email.ilike(s),
            )
        )

    offset = max(0, (page - 1) * page_size)
    return query.order_by(ComplaintDB.created_at.desc()).offset(offset).limit(page_size).all()


def get_complaint_by_id(
    db: Session, current_user: UserDB, complaint_id: str
) -> Optional[ComplaintDB]:
    """Retrieves single complaint enforcing strict role and ownership data boundary."""
    complaint = db.query(ComplaintDB).filter(ComplaintDB.id == complaint_id).first()
    if not complaint:
        return None

    # Consumer data separation: Cannot view other citizens' complaints
    if current_user.role != "OFFICER" and complaint.user_id != current_user.id:
        return None

    return complaint


def update_complaint_status(
    db: Session,
    current_user: UserDB,
    complaint_id: str,
    status: str,
    officer_notes: Optional[str] = None,
) -> Optional[ComplaintDB]:
    """Officer action to update grievance status and append observations."""
    if current_user.role != "OFFICER":
        return None

    if status not in VALID_COMPLAINT_STATUSES:
        raise ValueError(f"Invalid complaint status: {status}")

    complaint = db.query(ComplaintDB).filter(ComplaintDB.id == complaint_id).first()
    if not complaint:
        return None

    now = datetime.now(timezone.utc).isoformat()
    complaint.status = status
    complaint.reviewed_by = current_user.id
    complaint.reviewed_at = now
    complaint.updated_at = now
    if officer_notes is not None:
        complaint.officer_notes = officer_notes

    db.commit()
    db.refresh(complaint)

    # Log audit event
    log_audit_event(
        db=db,
        actor_user_id=current_user.id,
        actor_email=current_user.email,
        action="COMPLAINT_STATUS_UPDATED",
        entity_type="COMPLAINT",
        entity_id=complaint_id,
        metadata={"new_status": status, "officer_notes": officer_notes},
    )

    # Notify consumer of status change
    create_notification(
        db=db,
        title="Complaint Status Updated",
        message=f"Grievance {complaint_id} status changed to {status.replace('_', ' ')}.",
        user_id=complaint.user_id,
        link=f"/my-complaints/{complaint_id}",
    )

    return complaint


def initiate_inspection_from_complaint(
    db: Session, current_user: UserDB, complaint_id: str
) -> InspectionDB:
    """
    Spawns an official field Inspection record linked to the consumer complaint.
    Preserves original complaint evidence and carries over metadata.
    """
    if current_user.role != "OFFICER":
        raise PermissionError("Only authorized officers can initiate inspections.")

    complaint = db.query(ComplaintDB).filter(ComplaintDB.id == complaint_id).first()
    if not complaint:
        raise ValueError(f"Complaint {complaint_id} not found.")

    # Check if an inspection is already linked
    if complaint.linked_inspection_id:
        existing = db.query(InspectionDB).filter(InspectionDB.id == complaint.linked_inspection_id).first()
        if existing:
            return existing

    today_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    rand_hex = uuid.uuid4().hex[:6].upper()
    inspection_id = f"INSP-{today_str}-{rand_hex}"
    now = datetime.now(timezone.utc).isoformat()

    inspection = InspectionDB(
        id=inspection_id,
        inspection_reference=inspection_id,
        complaint_id=complaint.id,
        complaint_reference=complaint.complaint_reference,
        officer_id=current_user.id,
        product_name=complaint.product_name,
        brand=None,
        retail_point="Consumer Grievance Intake",
        category=complaint.issue_category,
        source="COMPLAINT_INITIATED",
        status="IN_PROGRESS",
        verification_state="PENDING",
        compliance_score=0,
        package_image_url=complaint.image_reference,
        report_status="NOT_GENERATED",
        report_pdf_path=None,
        created_at=now,
        updated_at=now,
        completed_at=None,
    )
    db.add(inspection)

    # If complaint has an image reference, preserve it as a CONSUMER_SUBMISSION inspection image
    if complaint.image_reference:
        from database.models import InspectionImageDB
        consumer_img = InspectionImageDB(
            id=f"img-{uuid.uuid4().hex[:12]}",
            inspection_id=inspection_id,
            panel_type="CONSUMER_SUBMISSION",
            file_reference=complaint.image_reference,
            original_filename="consumer_complaint_package.jpg",
            mime_type="image/jpeg",
            source="CONSUMER_SUBMISSION",
            width=800,
            height=600,
            ocr_status="PENDING",
            created_at=now,
            uploaded_by=complaint.user_id,
        )
        db.add(consumer_img)

    # Update complaint status to reflect active inspection
    complaint.status = "INSPECTION_IN_PROGRESS"
    complaint.linked_inspection_id = inspection_id
    complaint.updated_at = now
    if not complaint.officer_notes:
        complaint.officer_notes = f"Official inspection {inspection_id} initiated by {current_user.display_name}."

    db.commit()
    db.refresh(inspection)

    # Log audit event
    log_audit_event(
        db=db,
        actor_user_id=current_user.id,
        actor_email=current_user.email,
        action="INSPECTION_INITIATED_FROM_COMPLAINT",
        entity_type="INSPECTION",
        entity_id=inspection_id,
        metadata={
            "complaint_id": complaint.id,
            "product_name": complaint.product_name,
        },
    )

    # In-app notifications
    create_notification(
        db=db,
        title="Official Inspection Initiated",
        message=f"Inspection {inspection_id} launched for complaint {complaint.id}.",
        role_target="OFFICER",
        link=f"/inspections/{inspection_id}/workspace",
    )
    create_notification(
        db=db,
        title="Official Inspection Launched",
        message=f"Your grievance {complaint.id} has proceeded to official field inspection ({inspection_id}).",
        user_id=complaint.user_id,
        link=f"/my-complaints/{complaint.id}",
    )

    return inspection
