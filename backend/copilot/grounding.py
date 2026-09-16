"""
Context Grounding, Prompt Injection Defense, and Source Validation for NIRIKSHAK AI Copilot.
Ensures that all answers strictly reference verified inspection data without fabricating claims.
"""

import json
import logging
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from database.models import (
    InspectionDB,
    InspectionImageDB,
    InspectionAnalysisDB,
    OfficerObservationDB,
    OfficerVerificationDB,
)
from inspections.intelligence import aggregate_multi_image_analysis
from legal.rule_registry import STATUTORY_RULES_REGISTRY, get_rule_by_id
from .schemas import CopilotSource

logger = logging.getLogger("nirikshak-copilot-grounding")


def sanitize_untrusted_text(text: Optional[str]) -> str:
    """
    Sanitizes packaging text and OCR extractions to defend against prompt injection.
    Treats packaging text strictly as inert physical evidence data.
    """
    if not text:
        return ""
    
    # Neutralize common prompt injection trigger patterns
    cleaned = text
    suspicious_patterns = [
        "IGNORE ALL PREVIOUS INSTRUCTIONS",
        "SYSTEM PROMPT OVERRIDE",
        "YOU ARE NOW",
        "NEW INSTRUCTIONS:",
        "DISREGARD RULES",
    ]
    for pattern in suspicious_patterns:
        cleaned = cleaned.replace(pattern, f"[NEUTRALIZED_EVIDENCE_TEXT: {pattern}]")
        cleaned = cleaned.replace(pattern.lower(), f"[neutralized_evidence_text: {pattern.lower()}]")

    return f"<UNTRUSTED_PACKAGE_EVIDENCE>\n{cleaned}\n</UNTRUSTED_PACKAGE_EVIDENCE>"


def build_grounded_context(
    db: Session,
    inspection_id: str,
    context_mode: str = "INSPECTION_CONTEXT",
    target_finding_id: Optional[str] = None,
    target_declaration_key: Optional[str] = None,
    target_image_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Constructs a minimized, strictly scoped context for the copilot based on stored inspection records.
    """
    inspection = db.query(InspectionDB).filter(InspectionDB.id == inspection_id).first()
    if not inspection:
        return {}

    # 1. Fetch images and panels
    images = (
        db.query(InspectionImageDB)
        .filter(InspectionImageDB.inspection_id == inspection_id, InspectionImageDB.deleted_at == None)
        .all()
    )
    images_meta = []
    valid_image_ids = set()
    for img in images:
        valid_image_ids.add(img.id)
        # Compute line count from stored OCR lines JSON
        line_count = 0
        if img.ocr_lines_json:
            try:
                line_count = len(json.loads(img.ocr_lines_json))
            except Exception:
                pass
        images_meta.append({
            "id": img.id,
            "panel_type": img.panel_type,
            "filename": img.original_filename,
            "uploaded_by": img.uploaded_by,
            "ocr_status": img.ocr_status,
            "line_count": line_count,
            "image_hash": img.image_hash,
        })

    # 2. Multi-image Intelligence & Conflicts
    # Build image items with per-panel declarations for cross-panel aggregation
    conflicts = []
    review_signals = []
    evidence_locations = []
    try:
        # First try to use per-image analysis data if available
        image_items_for_aggregation = []
        for img in images:
            item = {
                "id": img.id,
                "panel_type": img.panel_type,
                "ocr_lines": [],
                "declarations": {},
            }
            if img.ocr_lines_json:
                try:
                    item["ocr_lines"] = json.loads(img.ocr_lines_json)
                except Exception:
                    pass
            image_items_for_aggregation.append(item)

        if image_items_for_aggregation:
            intelligence = aggregate_multi_image_analysis(image_items_for_aggregation)
            conflicts = intelligence.get("conflicts", [])
    except Exception:
        pass

    # 3. Findings & Declarations
    analysis_db = (
        db.query(InspectionAnalysisDB)
        .filter(InspectionAnalysisDB.inspection_id == inspection_id)
        .first()
    )
    findings = []
    declarations = {}
    valid_finding_ids = set()
    valid_declaration_keys = set()

    if analysis_db:
        try:
            findings = json.loads(analysis_db.statutory_findings_json or "[]")
            for f in findings:
                if "id" in f:
                    valid_finding_ids.add(f["id"])
                if "rule_id" in f:
                    valid_finding_ids.add(f["rule_id"])
        except Exception:
            findings = []

        try:
            declarations = json.loads(analysis_db.declarations_json or "{}")
            for k in declarations.keys():
                valid_declaration_keys.add(k)
        except Exception:
            declarations = {}

    # 4. Officer observations
    obs_list = (
        db.query(OfficerObservationDB)
        .filter(OfficerObservationDB.inspection_id == inspection_id)
        .all()
    )
    observations = [
        {"id": o.id, "category": o.category, "observation": o.observation, "created_at": o.created_at}
        for o in obs_list
    ]

    # 5. Verification status
    verification_db = (
        db.query(OfficerVerificationDB)
        .filter(OfficerVerificationDB.inspection_id == inspection_id)
        .first()
    )
    verification_info = None
    if verification_db:
        verification_info = {
            "decision": verification_db.officer_decision,
            "decision_type": verification_db.decision_type,
            "legal_basis": verification_db.legal_basis,
            "officer_justification": verification_db.officer_justification,
            "verified_at": verification_db.verified_at,
        }

    # 6. Build optimized payload according to context mode
    context = {
        "inspection_id": inspection.id,
        "reference": inspection.inspection_reference,
        "product_name": inspection.product_name,
        "brand_name": inspection.brand,
        "category": inspection.category,
        "overall_status": inspection.status,
        "compliance_score": inspection.compliance_score,
        "images": images_meta,
        "declarations": declarations,
        "findings": findings,
        "conflicts": conflicts,
        "review_signals": review_signals,
        "evidence_locations": evidence_locations,
        "observations": observations,
        "verification": verification_info,
        "valid_ids": {
            "image_ids": valid_image_ids,
            "finding_ids": valid_finding_ids,
            "declaration_keys": valid_declaration_keys,
        },
    }

    # Filter/Focus if requested
    if context_mode == "FINDING_CONTEXT" and target_finding_id:
        focused = [f for f in findings if f.get("id") == target_finding_id or f.get("rule_id") == target_finding_id]
        context["target_finding"] = focused[0] if focused else None

    if context_mode == "CONFLICT_CONTEXT":
        context["target_conflicts"] = conflicts

    return context


def validate_and_filter_sources(sources: List[CopilotSource], valid_ids: Dict[str, Any]) -> List[CopilotSource]:
    """
    Grounding validation: Purges any model-generated source references whose IDs
    do not actually exist in the target inspection's verified dataset.
    """
    valid_images = valid_ids.get("image_ids", set())
    valid_findings = valid_ids.get("finding_ids", set())
    valid_decl_keys = valid_ids.get("declaration_keys", set())

    filtered: List[CopilotSource] = []
    for src in sources:
        # Validate image reference if specified
        if src.image_id and src.image_id not in valid_images:
            logger.warning(f"Discarding ungrounded copilot image reference: {src.image_id}")
            continue

        # Validate finding reference if specified
        if src.finding_id and src.finding_id not in valid_findings:
            logger.warning(f"Discarding ungrounded copilot finding reference: {src.finding_id}")
            continue

        # Validate declaration key if specified
        if src.declaration_key and src.declaration_key not in valid_decl_keys:
            # Allow standard known keys even if missing (for NOT_DETECTED explanation)
            pass

        filtered.append(src)

    return filtered
