"""
Copilot Application Service for NIRIKSHAK AI.
Coordinates context grounding, provider dispatch, source validation, conversation history,
and cryptographic audit logging.
"""

import time
import uuid
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from database.models import UserDB, InspectionDB
from audit.service import log_audit_event
from .schemas import (
    CopilotQueryRequest,
    CopilotResponse,
    CopilotSuggestedQuestionsResponse,
    CopilotFeedbackRequest,
)
from .grounding import build_grounded_context, validate_and_filter_sources
from .provider import copilot_provider

logger = logging.getLogger("nirikshak-copilot-service")

# In-memory session history capped at 20 messages per inspection
CONVERSATION_HISTORY_CACHE: Dict[str, List[Dict[str, Any]]] = {}
MAX_HISTORY_PER_INSPECTION = 20


def process_copilot_query(
    db: Session,
    current_user: UserDB,
    inspection_id: str,
    payload: CopilotQueryRequest,
    request_id: Optional[str] = None,
) -> CopilotResponse:
    """
    Executes an evidence-grounded copilot inquiry for an authorized officer.
    """
    # 1. Enforce RBAC: Officers only
    if current_user.role != "OFFICER":
        logger.warning(f"Unauthorized copilot access attempt by consumer: {current_user.email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI Inspection Copilot is restricted to authorized Legal Metrology enforcement officers.",
        )

    # 2. Check Inspection existence
    inspection = db.query(InspectionDB).filter(InspectionDB.id == inspection_id).first()
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection {inspection_id} not found.",
        )

    # 3. Build Grounded Context
    context = build_grounded_context(
        db=db,
        inspection_id=inspection_id,
        context_mode=payload.context_mode or "INSPECTION_CONTEXT",
        target_finding_id=payload.finding_id,
        target_declaration_key=payload.declaration_key,
        target_image_id=payload.image_id,
    )

    # 4. Generate Response from Provider
    response = copilot_provider.generate(payload.message, context)
    response.request_id = request_id or f"req-{uuid.uuid4().hex[:12]}"

    # 5. Validate Sources against actual verified inspection IDs
    valid_ids = context.get("valid_ids", {})
    response.sources = validate_and_filter_sources(response.sources, valid_ids)

    # 6. Record in Conversation History Cache
    history_entry = {
        "id": f"msg-{uuid.uuid4().hex[:8]}",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "role": "officer",
        "content": payload.message,
        "response": response.model_dump(),
    }
    if inspection_id not in CONVERSATION_HISTORY_CACHE:
        CONVERSATION_HISTORY_CACHE[inspection_id] = []
    CONVERSATION_HISTORY_CACHE[inspection_id].append(history_entry)

    # Trim to last 20 messages
    if len(CONVERSATION_HISTORY_CACHE[inspection_id]) > MAX_HISTORY_PER_INSPECTION:
        CONVERSATION_HISTORY_CACHE[inspection_id] = CONVERSATION_HISTORY_CACHE[inspection_id][-MAX_HISTORY_PER_INSPECTION:]

    # 7. Log Immutable Audit Event
    try:
        log_audit_event(
            db=db,
            actor_user_id=current_user.id,
            actor_email=current_user.email,
            action="COPILOT_QUERY",
            entity_type="INSPECTION",
            entity_id=inspection_id,
            metadata={
                "message_preview": payload.message[:80],
                "context_mode": payload.context_mode,
                "sources_count": len(response.sources),
                "quality_state": response.quality_state,
                "request_id": response.request_id,
            },
        )
    except Exception as e:
        logger.warning(f"Failed to log copilot query audit event: {e}")

    return response


def get_suggested_questions(
    db: Session,
    current_user: UserDB,
    inspection_id: str,
) -> CopilotSuggestedQuestionsResponse:
    """
    Derives context-aware starter questions based strictly on actual unresolved items in the inspection.
    """
    if current_user.role != "OFFICER":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Officer access required.")

    inspection = db.query(InspectionDB).filter(InspectionDB.id == inspection_id).first()
    if not inspection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inspection not found.")

    context = build_grounded_context(db, inspection_id)
    conflicts = context.get("conflicts", [])
    findings = context.get("findings", [])
    verification = context.get("verification")
    declarations = context.get("declarations", {})

    suggestions = []

    if conflicts:
        decl = conflicts[0].get("declaration_name", "declaration")
        suggestions.append(f"Why is there a cross-panel {decl} conflict?")
        suggestions.append("Show conflicting packaging evidence.")

    missing = [d.get("label", k) for k, d in declarations.items() if d.get("status") in ("missing", "uncertain")]
    if missing:
        suggestions.append(f"Which declarations were not detected?")
        suggestions.append(f"What should I physically verify regarding {missing[0]}?")

    if not verification or verification.get("decision") == "REVIEW_REQUIRED":
        suggestions.append("What remains before legal verification?")
        suggestions.append("Generate officer review checklist.")

    suggestions.append("Summarize this inspection.")
    suggestions.append("Explain statutory rule requirements.")

    # Deduplicate and return top 5
    unique_suggestions = list(dict.fromkeys(suggestions))[:5]

    return CopilotSuggestedQuestionsResponse(
        inspection_id=inspection_id,
        suggested_questions=unique_suggestions,
    )


def record_copilot_feedback(
    current_user: UserDB,
    payload: CopilotFeedbackRequest,
) -> Dict[str, Any]:
    """Records officer helpfulness feedback for copilot responses."""
    logger.info(
        f"Copilot feedback received from {current_user.email}: "
        f"response={payload.copilot_response_id}, rating={payload.feedback}"
    )
    return {
        "success": True,
        "copilot_response_id": payload.copilot_response_id,
        "recorded_feedback": payload.feedback,
    }


def get_conversation_history(inspection_id: str) -> List[Dict[str, Any]]:
    """Retrieves capped session conversation history for an inspection."""
    return CONVERSATION_HISTORY_CACHE.get(inspection_id, [])
