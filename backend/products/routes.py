import json
import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from database.connection import get_db
from database.models import UserDB, InspectionDB, ComplaintDB, InspectionAnalysisDB
from auth.dependencies import require_officer

logger = logging.getLogger("nirikshak-products")
products_router = APIRouter(prefix="/api/products", tags=["Products Repository"])


@products_router.get("")
async def get_products_repository(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    current_user: UserDB = Depends(require_officer),
    db: Session = Depends(get_db),
):
    """
    Returns aggregated product catalog showing:
    Product name, Brand, Category, Inspection count, Complaint count,
    Review signals count, and Last inspection date.
    """
    # Group inspections by product_name
    inspections = db.query(InspectionDB).all()
    complaints = db.query(ComplaintDB).all()

    product_map: Dict[str, Dict[str, Any]] = {}

    for insp in inspections:
        p_name = insp.product_name.strip()
        if not p_name:
            continue
        if p_name not in product_map:
            product_map[p_name] = {
                "id": f"prod-{abs(hash(p_name)) % 1000000}",
                "product_name": p_name,
                "brand": insp.brand or "Standard Packager",
                "category": insp.category or "Packaged Commodity",
                "inspection_count": 0,
                "complaint_count": 0,
                "review_signals_count": 0,
                "last_inspection_date": insp.created_at,
                "average_score": 0,
                "scores": [],
            }
        prod = product_map[p_name]
        prod["inspection_count"] += 1
        prod["scores"].append(insp.compliance_score)
        if insp.created_at > prod["last_inspection_date"]:
            prod["last_inspection_date"] = insp.created_at
        if insp.compliance_score < 80:
            prod["review_signals_count"] += 1

    for comp in complaints:
        p_name = comp.product_name.strip()
        if p_name in product_map:
            product_map[p_name]["complaint_count"] += 1

    result_list = []
    for p in product_map.values():
        scores = p.pop("scores")
        p["average_score"] = round(sum(scores) / len(scores), 1) if scores else 0
        if search:
            q = search.lower()
            if q not in p["product_name"].lower() and q not in p["brand"].lower():
                continue
        if category and category != "ALL":
            if p["category"] != category:
                continue
        result_list.append(p)

    return result_list


@products_router.get("/{product_id}")
async def get_product_detail(
    product_id: str,
    current_user: UserDB = Depends(require_officer),
    db: Session = Depends(get_db),
):
    """Returns detailed commodity history, inspections, and complaints."""
    # Match by ID hash or name
    inspections = db.query(InspectionDB).all()
    matched_name = None
    for insp in inspections:
        if f"prod-{abs(hash(insp.product_name.strip())) % 1000000}" == product_id or insp.product_name == product_id:
            matched_name = insp.product_name.strip()
            break

    if not matched_name:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found in registry.")

    prod_inspections = (
        db.query(InspectionDB)
        .filter(InspectionDB.product_name == matched_name)
        .order_by(InspectionDB.created_at.desc())
        .all()
    )

    prod_complaints = (
        db.query(ComplaintDB)
        .filter(ComplaintDB.product_name == matched_name)
        .order_by(ComplaintDB.created_at.desc())
        .all()
    )

    # Aggregate patterns across all inspections for this commodity
    insp_ids = [i.id for i in prod_inspections]
    analyses = (
        db.query(InspectionAnalysisDB)
        .filter(InspectionAnalysisDB.inspection_id.in_(insp_ids))
        .all()
        if insp_ids
        else []
    )

    missing_fields_count: Dict[str, int] = {}
    total_conflicts = 0
    declared_attributes: Dict[str, List[str]] = {}

    for a in analyses:
        if a.declarations_json:
            try:
                decls = json.loads(a.declarations_json)
                for k, v in decls.items():
                    if isinstance(v, dict):
                        if v.get("status") == "missing":
                            label = v.get("label", k)
                            missing_fields_count[label] = missing_fields_count.get(label, 0) + 1
                        elif v.get("value"):
                            declared_attributes.setdefault(k, [])
                            if v["value"] not in declared_attributes[k]:
                                declared_attributes[k].append(str(v["value"]))
            except Exception:
                pass
        if a.evidence_metadata_json:
            try:
                meta = json.loads(a.evidence_metadata_json)
                conflicts = meta.get("conflicts", [])
                total_conflicts += len(conflicts)
            except Exception:
                pass

    observed_patterns = [
        {"pattern": f"Frequent Missing Declaration: {k}", "occurrences": count, "type": "MISSING_FIELD"}
        for k, count in sorted(missing_fields_count.items(), key=lambda x: x[1], reverse=True)
    ]
    if total_conflicts > 0:
        observed_patterns.append({
            "pattern": f"Cross-panel Conflicts Detected Across Packagings",
            "occurrences": total_conflicts,
            "type": "CONFLICT"
        })

    scores = [i.compliance_score for i in prod_inspections]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0

    return {
        "product_name": matched_name,
        "brand": prod_inspections[0].brand if prod_inspections else "Standard",
        "category": prod_inspections[0].category if prod_inspections else "Packaged Commodity",
        "total_inspections": len(prod_inspections),
        "total_complaints": len(prod_complaints),
        "average_compliance_score": avg_score,
        "observed_patterns": observed_patterns,
        "declared_attributes": declared_attributes,
        "inspections": [
            {
                "id": i.id,
                "inspection_reference": i.inspection_reference,
                "status": i.status,
                "compliance_score": i.compliance_score,
                "created_at": i.created_at,
            }
            for i in prod_inspections
        ],
        "complaints": [
            {
                "id": c.id,
                "complaint_reference": c.complaint_reference,
                "issue_category": c.issue_category,
                "status": c.status,
                "created_at": c.created_at,
            }
            for c in prod_complaints
        ],
    }
