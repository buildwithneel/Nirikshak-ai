import json
import logging
from typing import Dict, Any, List, Optional
from declaration_extractor import DeclarationExtractor
from compliance_rules import LegalMetrologyRuleEngine
from database.models import InspectionDB, InspectionImageDB, InspectionAnalysisDB
from audit.service import log_audit_event
from notifications.service import create_notification

logger = logging.getLogger("nirikshak-intelligence")

declaration_extractor = DeclarationExtractor()
compliance_engine = LegalMetrologyRuleEngine()


def run_cross_image_intelligence(inspection: InspectionDB, db: Any, actor_user: Any = None) -> Dict[str, Any]:
    """
    Aggregates OCR lines from all completed images in an inspection,
    groups duplicate declarations with multiple supporting locations,
    detects cross-panel conflicts, evaluates Rule 6 compliance,
    and computes analytical review signals.
    """
    images: List[InspectionImageDB] = (
        db.query(InspectionImageDB)
        .filter(
            InspectionImageDB.inspection_id == inspection.id,
            InspectionImageDB.deleted_at == None,
            InspectionImageDB.ocr_status == "COMPLETED"
        )
        .order_by(InspectionImageDB.created_at.asc())
        .all()
    )

    if not images:
        logger.info(f"No completed OCR images found for inspection {inspection.id}.")
        return {
            "declarations": {},
            "findings": [],
            "conflicts": [],
            "review_signals": [],
            "evidence_locations": [],
            "compliance_score": 0,
            "overall_status": "REVIEW_REQUIRED",
        }

    all_ocr_lines = []
    text_parts = []
    per_image_declarations: Dict[str, Dict[str, Any]] = {}

    for img in images:
        lines = []
        if img.ocr_lines_json:
            try:
                lines = json.loads(img.ocr_lines_json)
            except Exception:
                lines = []

        # Tag lines with image metadata
        tagged_lines = []
        for line in lines:
            line_copy = dict(line)
            line_copy["image_id"] = img.id
            line_copy["panel_type"] = img.panel_type
            tagged_lines.append(line_copy)
            all_ocr_lines.append(line_copy)

        img_text = img.ocr_text or ""
        if img_text:
            text_parts.append(f"[{img.panel_type} PANEL]\n{img_text}")

        # Extract declarations per image to track panel sources
        img_decls = declaration_extractor.extract_all(tagged_lines, img_text)
        per_image_declarations[img.id] = {
            "image": img,
            "declarations": img_decls
        }

    combined_text = "\n\n".join(text_parts)
    global_decls = declaration_extractor.extract_all(all_ocr_lines, combined_text)

    # Cross-Image Conflict & Duplicate Grouping Analysis
    conflicts = []
    aggregated_declarations = {}
    evidence_locations = []

    for key, base_field in global_decls.items():
        field_label = base_field.get("label", key)
        detected_occurrences = []

        for img_id, item in per_image_declarations.items():
            img_obj = item["image"]
            decl_map = item["declarations"]
            if key in decl_map and decl_map[key].get("status") == "detected":
                det_val = decl_map[key].get("detected_value")
                conf = decl_map[key].get("confidence", 0.0)
                lines_used = decl_map[key].get("source_line_ids", [])
                
                # Find matching bounding boxes
                boxes = [
                    l.get("bounding_box") for l in all_ocr_lines
                    if l.get("image_id") == img_id and l.get("id") in lines_used
                ]

                occ = {
                    "image_id": img_id,
                    "panel_type": img_obj.panel_type,
                    "source": img_obj.source,
                    "value": det_val,
                    "confidence": conf,
                    "source_line_ids": lines_used,
                    "bounding_boxes": boxes,
                }
                detected_occurrences.append(occ)
                evidence_locations.append({
                    "declaration_key": key,
                    "declaration_label": field_label,
                    **occ
                })

        # Check for conflicting values
        if len(detected_occurrences) > 1:
            distinct_norm_values = set(
                str(occ["value"]).strip().lower().replace(" ", "")
                for occ in detected_occurrences
                if occ["value"] is not None
            )
            if len(distinct_norm_values) > 1:
                # Discrepancy detected across panels!
                conflict_record = {
                    "field_key": key,
                    "field_label": field_label,
                    "conflicting_values": detected_occurrences,
                    "status": "REVIEW_REQUIRED",
                    "reason": f"Discrepancy observed across panels ({', '.join(o['panel_type'] for o in detected_occurrences)}).",
                }
                conflicts.append(conflict_record)
                logger.warning(f"Declaration conflict detected for {key} in inspection {inspection.id}")

        # Construct aggregate declaration field
        field_copy = dict(base_field)
        field_copy["supporting_locations"] = detected_occurrences
        field_copy["location_count"] = len(detected_occurrences)
        field_copy["has_conflict"] = any(c["field_key"] == key for c in conflicts)
        aggregated_declarations[key] = field_copy

    # Run Rule 6 compliance engine on combined declarations
    compliance_evaluation = compliance_engine.evaluate_all(aggregated_declarations)
    findings = compliance_evaluation.get("findings", [])
    compliance_score = compliance_evaluation.get("compliance_score", 0)
    overall_status = compliance_evaluation.get("overall_status", "REVIEW_REQUIRED")

    # If conflicts exist, enforce REVIEW_REQUIRED
    if conflicts and overall_status == "COMPLIANT":
        overall_status = "REVIEW_REQUIRED"

    # Compute Analytical Review Signals (Not guilt scores)
    review_signals = []
    if conflicts:
        for c in conflicts:
            review_signals.append({
                "signal_type": "CROSS_IMAGE_CONFLICT",
                "severity": "HIGH",
                "title": f"Cross-Panel Conflict: {c['field_label']}",
                "description": f"Conflicting values detected across {len(c['conflicting_values'])} panels. Human officer review required.",
                "evidence_ref": c["field_key"],
            })

    for f in findings:
        if f.get("status") == "POTENTIAL_VIOLATION":
            review_signals.append({
                "signal_type": "STATUTORY_NON_COMPLIANCE",
                "severity": "HIGH",
                "title": f"Rule Non-Compliance: {f.get('statutory_title')}",
                "description": f.get("reason"),
                "evidence_ref": f.get("declaration_key"),
            })
        elif f.get("status") == "REVIEW_REQUIRED":
            review_signals.append({
                "signal_type": "DECLARATION_REVIEW_REQUIRED",
                "severity": "MEDIUM",
                "title": f"Ambiguous Declaration: {f.get('statutory_title')}",
                "description": f.get("reason"),
                "evidence_ref": f.get("declaration_key"),
            })

    # Check for low OCR confidence lines in statutory declarations
    low_conf_lines = [
        l for l in all_ocr_lines if l.get("confidence", 1.0) < 0.65
    ]
    if low_conf_lines:
        review_signals.append({
            "signal_type": "LOW_OCR_CONFIDENCE",
            "severity": "LOW",
            "title": "Low OCR Text Quality",
            "description": f"{len(low_conf_lines)} OCR text regions have confidence below 65%. Physical package verification recommended.",
            "evidence_ref": "ocr_quality",
        })

    # Persist or update InspectionAnalysisDB
    analysis = db.query(InspectionAnalysisDB).filter(InspectionAnalysisDB.inspection_id == inspection.id).first()
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()

    evidence_meta = {
        "image_count": len(images),
        "total_lines": len(all_ocr_lines),
        "conflicts_count": len(conflicts),
        "review_signals_count": len(review_signals),
        "evidence_locations": evidence_locations,
        "conflicts": conflicts,
        "review_signals": review_signals,
    }

    if not analysis:
        analysis = InspectionAnalysisDB(
            id=f"analysis-{inspection.id}",
            inspection_id=inspection.id,
            ocr_text=combined_text,
            ocr_lines_json=json.dumps(all_ocr_lines),
            declarations_json=json.dumps(aggregated_declarations),
            statutory_findings_json=json.dumps(findings),
            evidence_metadata_json=json.dumps(evidence_meta),
            analysis_timestamp=now,
            ocr_processing_time_ms=0.0,
        )
        db.add(analysis)
    else:
        analysis.ocr_text = combined_text
        analysis.ocr_lines_json = json.dumps(all_ocr_lines)
        analysis.declarations_json = json.dumps(aggregated_declarations)
        analysis.statutory_findings_json = json.dumps(findings)
        analysis.evidence_metadata_json = json.dumps(evidence_meta)
        analysis.analysis_timestamp = now

    inspection.compliance_score = compliance_score
    if inspection.status in ["DRAFT", "IN_PROGRESS"]:
        inspection.status = "PENDING_OFFICER_REVIEW"
    inspection.updated_at = now

    db.commit()
    db.refresh(analysis)
    db.refresh(inspection)

    # Log audit event for conflict detection if newly discovered
    if conflicts and actor_user:
        log_audit_event(
            db=db,
            actor_user_id=actor_user.id,
            actor_email=actor_user.email,
            action="CONFLICT_DETECTED",
            entity_type="INSPECTION",
            entity_id=inspection.id,
            metadata={"conflict_count": len(conflicts), "fields": [c["field_key"] for c in conflicts]},
        )
        create_notification(
            db=db,
            user_id=actor_user.id,
            title="Cross-Image Declaration Conflict",
            message=f"Discrepancy detected across package panels for inspection {inspection.inspection_reference}.",
            notification_type="CONFLICT_DETECTED",
            reference_type="INSPECTION",
            reference_id=inspection.id,
        )

    return {
        "declarations": aggregated_declarations,
        "findings": findings,
        "conflicts": conflicts,
        "review_signals": review_signals,
        "evidence_locations": evidence_locations,
        "compliance_score": compliance_score,
        "overall_status": overall_status,
        "image_count": len(images),
        "total_lines": len(all_ocr_lines),
    }


def aggregate_multi_image_analysis(image_items: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Pure algorithmic aggregator for multi-image declaration dictionaries.
    Detects duplicates, retains highest confidence, identifies cross-panel discrepancies,
    and flags REVIEW REQUIRED on conflicting fields.
    """
    combined_declarations: Dict[str, Any] = {}
    conflicts: List[Dict[str, Any]] = []
    field_candidates: Dict[str, List[Dict[str, Any]]] = {}

    for item in image_items:
        panel = item.get("panel_type", "UNKNOWN")
        img_id = item.get("id", "")
        decls = item.get("declarations", {})
        for k, v in decls.items():
            if isinstance(v, dict):
                cand = dict(v)
                cand["panel_type"] = panel
                cand["image_id"] = img_id
                field_candidates.setdefault(k, []).append(cand)

    for k, candidates in field_candidates.items():
        if not candidates:
            continue

        distinct_vals = set(
            str(c.get("value", "")).strip().lower().replace(" ", "")
            for c in candidates
            if c.get("value") is not None
        )
        has_conflict = len(distinct_vals) > 1

        best = max(candidates, key=lambda c: c.get("confidence", 0.0))
        decl = dict(best)
        decl["supporting_locations"] = candidates

        if has_conflict:
            decl["status"] = "review_required"
            decl["has_conflict"] = True
            conflicts.append({
                "field_key": k,
                "field_label": decl.get("label", k),
                "conflicting_values": candidates,
                "status": "REVIEW_REQUIRED",
                "reason": f"Discrepancy observed across panels ({', '.join(c.get('panel_type', 'UNKNOWN') for c in candidates)}).",
            })
        else:
            decl["has_conflict"] = False

        combined_declarations[k] = decl

    return {
        "declarations": combined_declarations,
        "conflicts": conflicts,
        "has_conflicts": len(conflicts) > 0,
    }

