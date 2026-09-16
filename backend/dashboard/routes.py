from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from database.connection import get_db
from database.models import UserDB, ComplaintDB, InspectionDB
from auth.dependencies import require_officer

dashboard_router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@dashboard_router.get("/stats", response_model=Dict[str, Any])
async def get_dashboard_stats_endpoint(
    current_user: UserDB = Depends(require_officer),
    db: Session = Depends(get_db),
):
    """Fetches real database statistics for the officer surveillance dashboard."""
    # 1. Complaints breakdown
    total_complaints = db.query(ComplaintDB).count()
    open_complaints = (
        db.query(ComplaintDB)
        .filter(ComplaintDB.status.in_(["SUBMITTED", "UNDER_REVIEW", "INSPECTION_REQUIRED", "INSPECTION_IN_PROGRESS"]))
        .count()
    )
    submitted_count = db.query(ComplaintDB).filter(ComplaintDB.status == "SUBMITTED").count()
    under_review_count = db.query(ComplaintDB).filter(ComplaintDB.status == "UNDER_REVIEW").count()
    inspection_required_count = db.query(ComplaintDB).filter(ComplaintDB.status == "INSPECTION_REQUIRED").count()
    resolved_count = db.query(ComplaintDB).filter(ComplaintDB.status == "RESOLVED").count()

    # 2. Inspections breakdown
    total_inspections = db.query(InspectionDB).count()
    active_inspections = (
        db.query(InspectionDB)
        .filter(InspectionDB.status.in_(["DRAFT", "IN_PROGRESS", "PENDING_OFFICER_REVIEW"]))
        .count()
    )
    pending_review = (
        db.query(InspectionDB)
        .filter(
            or_(
                InspectionDB.status == "PENDING_OFFICER_REVIEW",
                InspectionDB.verification_state == "PENDING",
            )
        )
        .count()
    )
    reports_generated = (
        db.query(InspectionDB)
        .filter(InspectionDB.report_status == "GENERATED")
        .count()
    )
    verified_compliant = (
        db.query(InspectionDB)
        .filter(InspectionDB.compliance_score >= 80)
        .count()
    )

    from sqlalchemy import func
    avg_score = db.query(func.avg(InspectionDB.compliance_score)).scalar() or 0.0

    return {
        "total_complaints": total_complaints,
        "total_inspections": total_inspections,
        "pending_review_inspections": pending_review,
        "verified_inspections": verified_compliant,
        "closed_inspections": resolved_count,
        "average_compliance_score": round(float(avg_score), 1),
        "openComplaints": open_complaints,
        "activeInspections": active_inspections,
        "pendingReview": pending_review,
        "reportsGenerated": reports_generated,
        "totalInspections": total_inspections,
        "totalComplaints": total_complaints,
        "compliantCount": verified_compliant,
        "complaintsBreakdown": {
            "submitted": submitted_count,
            "underReview": under_review_count,
            "inspectionRequired": inspection_required_count,
            "resolved": resolved_count,
        },
    }


@dashboard_router.get("/search", response_model=List[Dict[str, Any]])
async def global_search_endpoint(
    q: str = Query(..., min_length=1),
    current_user: UserDB = Depends(require_officer),
    db: Session = Depends(get_db),
):
    """
    Global officer search across:
    Inspection ID, Complaint ID, Product name, Brand, Consumer email, Retail point.
    Returns unified SearchResultItem list.
    """
    term = f"%{q.strip().lower()}%"

    inspections = (
        db.query(InspectionDB)
        .filter(
            or_(
                InspectionDB.id.ilike(term),
                InspectionDB.product_name.ilike(term),
                InspectionDB.brand.ilike(term),
                InspectionDB.retail_point.ilike(term),
                InspectionDB.complaint_id.ilike(term),
            )
        )
        .limit(10)
        .all()
    )

    complaints = (
        db.query(ComplaintDB)
        .filter(
            or_(
                ComplaintDB.id.ilike(term),
                ComplaintDB.product_name.ilike(term),
                ComplaintDB.consumer_email.ilike(term),
            )
        )
        .limit(10)
        .all()
    )

    results = []
    for c in complaints:
        results.append({
            "id": c.id,
            "type": "COMPLAINT",
            "title": c.product_name,
            "subtitle": f"{c.complaint_reference} • {c.status}",
            "status": c.status,
            "url": f"/complaints/{c.id}",
        })
    for i in inspections:
        results.append({
            "id": i.id,
            "type": "INSPECTION",
            "title": i.product_name,
            "subtitle": f"{i.inspection_reference} • {i.status}",
            "status": i.status,
            "url": f"/inspections/{i.id}/workspace",
        })

    return results


@dashboard_router.get("/work-queue", response_model=Dict[str, Any])
async def get_officer_work_queue_endpoint(
    timeframe: Optional[str] = Query("7d"),
    current_user: UserDB = Depends(require_officer),
    db: Session = Depends(get_db),
):
    """
    Returns prioritized operational work queues for the Officer Command Center:
    - requires_attention (conflicts, low compliance, urgent items)
    - pending_verification (awaiting human officer review)
    - recently_updated (latest activity)
    - recently_submitted_complaints (new grievances)
    """
    # 1. Pending Verification
    pending_inspections = (
        db.query(InspectionDB)
        .filter(InspectionDB.status == "PENDING_OFFICER_REVIEW")
        .order_by(InspectionDB.updated_at.desc())
        .limit(10)
        .all()
    )

    # 2. Recently Submitted Complaints
    recent_complaints = (
        db.query(ComplaintDB)
        .filter(ComplaintDB.status == "SUBMITTED")
        .order_by(ComplaintDB.created_at.desc())
        .limit(10)
        .all()
    )

    # 3. Requires Attention: Inspections with score < 60 or conflicts
    attention_inspections = (
        db.query(InspectionDB)
        .filter(
            or_(
                InspectionDB.compliance_score < 70,
                InspectionDB.verification_state == "UNVERIFIED",
            ),
            InspectionDB.status.in_(["IN_PROGRESS", "PENDING_OFFICER_REVIEW"]),
        )
        .order_by(InspectionDB.updated_at.desc())
        .limit(10)
        .all()
    )

    # 4. Recently Updated
    recently_updated = (
        db.query(InspectionDB)
        .order_by(InspectionDB.updated_at.desc())
        .limit(10)
        .all()
    )

    return {
        "requires_attention": [
            {
                "id": i.id,
                "reference": i.inspection_reference,
                "product_name": i.product_name,
                "status": i.status,
                "compliance_score": i.compliance_score,
                "signal": "Review Required" if i.compliance_score < 70 else "Awaiting Verification",
                "updated_at": i.updated_at,
                "url": f"/inspections/{i.id}/workspace",
            }
            for i in attention_inspections
        ],
        "pending_verification": [
            {
                "id": i.id,
                "reference": i.inspection_reference,
                "product_name": i.product_name,
                "status": i.status,
                "compliance_score": i.compliance_score,
                "updated_at": i.updated_at,
                "url": f"/inspections/{i.id}/workspace",
            }
            for i in pending_inspections
        ],
        "recently_submitted_complaints": [
            {
                "id": c.id,
                "reference": c.complaint_reference,
                "product_name": c.product_name,
                "consumer_email": c.consumer_email,
                "issue_category": c.issue_category,
                "status": c.status,
                "created_at": c.created_at,
                "url": f"/complaints/{c.id}",
            }
            for c in recent_complaints
        ],
        "recently_updated": [
            {
                "id": i.id,
                "reference": i.inspection_reference,
                "product_name": i.product_name,
                "status": i.status,
                "updated_at": i.updated_at,
                "url": f"/inspections/{i.id}/workspace",
            }
            for i in recently_updated
        ],
    }
