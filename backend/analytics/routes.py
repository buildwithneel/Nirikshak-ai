import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database.connection import get_db
from database.models import UserDB, InspectionDB, ComplaintDB, InspectionAnalysisDB
from auth.dependencies import require_officer

logger = logging.getLogger("nirikshak-analytics")
analytics_router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@analytics_router.get("/overview")
async def get_analytics_overview(
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    current_user: UserDB = Depends(require_officer),
    db: Session = Depends(get_db),
):
    """
    Returns high-level inspection and complaint performance overview,
    supporting date range filtering.
    """
    insp_query = db.query(InspectionDB)
    comp_query = db.query(ComplaintDB)

    if from_date:
        insp_query = insp_query.filter(InspectionDB.created_at >= from_date)
        comp_query = comp_query.filter(ComplaintDB.created_at >= from_date)
    if to_date:
        insp_query = insp_query.filter(InspectionDB.created_at <= to_date)
        comp_query = comp_query.filter(ComplaintDB.created_at <= to_date)

    total_inspections = insp_query.count()
    active_inspections = insp_query.filter(
        InspectionDB.status.in_(["DRAFT", "IN_PROGRESS", "PENDING_OFFICER_REVIEW"])
    ).count()
    completed_inspections = insp_query.filter(
        InspectionDB.status.in_(["VERIFIED", "REPORT_GENERATED", "CLOSED"])
    ).count()
    pending_verification = insp_query.filter(
        InspectionDB.status == "PENDING_OFFICER_REVIEW"
    ).count()

    avg_score = db.query(func.avg(InspectionDB.compliance_score)).scalar() or 0.0

    total_complaints = comp_query.count()
    new_complaints = comp_query.filter(ComplaintDB.status == "SUBMITTED").count()
    under_review_complaints = comp_query.filter(ComplaintDB.status == "UNDER_REVIEW").count()
    resolved_complaints = comp_query.filter(ComplaintDB.status == "RESOLVED").count()

    return {
        "inspections": {
            "total": total_inspections,
            "active": active_inspections,
            "completed": completed_inspections,
            "pending_verification": pending_verification,
            "average_compliance_score": round(float(avg_score), 1),
        },
        "complaints": {
            "total": total_complaints,
            "new": new_complaints,
            "under_review": under_review_complaints,
            "resolved": resolved_complaints,
        },
    }


@analytics_router.get("/trends")
async def get_analytics_trends(
    current_user: UserDB = Depends(require_officer),
    db: Session = Depends(get_db),
):
    """Returns monthly inspection volume and compliance trends."""
    inspections = db.query(InspectionDB).order_by(InspectionDB.created_at.asc()).all()
    if not inspections:
        return {"has_data": False, "message": "Insufficient historical data", "monthly": []}

    monthly_map: Dict[str, Dict[str, int]] = {}
    for insp in inspections:
        try:
            dt = datetime.fromisoformat(insp.created_at.replace("Z", "+00:00"))
            m_key = dt.strftime("%b %Y")
        except Exception:
            m_key = "Recent"

        if m_key not in monthly_map:
            monthly_map[m_key] = {"total": 0, "compliant": 0, "review": 0, "violation": 0}

        monthly_map[m_key]["total"] += 1
        if insp.compliance_score >= 80:
            monthly_map[m_key]["compliant"] += 1
        elif insp.compliance_score < 50:
            monthly_map[m_key]["violation"] += 1
        else:
            monthly_map[m_key]["review"] += 1

    formatted_monthly = [
        {"period": k, **v} for k, v in monthly_map.items()
    ]

    return {
        "has_data": len(formatted_monthly) > 0,
        "monthly": formatted_monthly,
    }


@analytics_router.get("/categories")
async def get_analytics_categories(
    current_user: UserDB = Depends(require_officer),
    db: Session = Depends(get_db),
):
    """Returns organizational distribution of inspections across commodity categories."""
    inspections = db.query(InspectionDB).all()
    if not inspections:
        return {"has_data": False, "categories": []}

    cat_map: Dict[str, Dict[str, int]] = {}
    for insp in inspections:
        cat = insp.category or "Packaged Commodity"
        if cat not in cat_map:
            cat_map[cat] = {"category": cat, "count": 0, "compliant": 0, "violations": 0}
        cat_map[cat]["count"] += 1
        if insp.compliance_score >= 80:
            cat_map[cat]["compliant"] += 1
        else:
            cat_map[cat]["violations"] += 1

    return {
        "has_data": len(cat_map) > 0,
        "categories": list(cat_map.values()),
    }


@analytics_router.get("/review-signals")
async def get_analytics_review_signals(
    current_user: UserDB = Depends(require_officer),
    db: Session = Depends(get_db),
):
    """
    Returns AI-assisted pattern indicators:
    Most frequent missing declarations, cross-image OCR conflicts, and review-required patterns.
    """
    analyses = db.query(InspectionAnalysisDB).all()
    missing_declarations_count: Dict[str, int] = {}
    total_conflicts = 0
    frequent_conflicts: Dict[str, int] = {}

    for a in analyses:
        if a.declarations_json:
            try:
                decls = json.loads(a.declarations_json)
                for k, d in decls.items():
                    if isinstance(d, dict) and d.get("status") == "missing":
                        label = d.get("label", k)
                        missing_declarations_count[label] = missing_declarations_count.get(label, 0) + 1
            except Exception:
                pass

        if a.evidence_metadata_json:
            try:
                meta = json.loads(a.evidence_metadata_json)
                conflicts = meta.get("conflicts", [])
                total_conflicts += len(conflicts)
                for c in conflicts:
                    field = c.get("field_label", c.get("field_key", "Unknown"))
                    frequent_conflicts[field] = frequent_conflicts.get(field, 0) + 1
            except Exception:
                pass

    top_missing = [
        {"declaration": k, "occurrences": v}
        for k, v in sorted(missing_declarations_count.items(), key=lambda x: x[1], reverse=True)[:5]
    ]

    top_conflicts = [
        {"field": k, "count": v}
        for k, v in sorted(frequent_conflicts.items(), key=lambda x: x[1], reverse=True)[:5]
    ]

    return {
        "total_conflicts_detected": total_conflicts,
        "top_missing_declarations": top_missing,
        "top_conflicting_declarations": top_conflicts,
        "has_signals": (len(top_missing) > 0 or total_conflicts > 0),
    }
