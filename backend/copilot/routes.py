"""
FastAPI Routes for NIRIKSHAK AI Inspection Copilot.
Provides endpoints for grounded queries, context-aware suggestions, and officer feedback.
"""

from typing import Dict, Any, List
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import UserDB
from auth.dependencies import require_officer
from .schemas import (
    CopilotQueryRequest,
    CopilotResponse,
    CopilotSuggestedQuestionsResponse,
    CopilotFeedbackRequest,
)
from .service import (
    process_copilot_query,
    get_suggested_questions,
    record_copilot_feedback,
    get_conversation_history,
)

copilot_router = APIRouter(prefix="/api/inspections", tags=["AI Inspection Copilot"])


@copilot_router.post("/{inspection_id}/copilot", response_model=CopilotResponse)
async def query_copilot_endpoint(
    inspection_id: str,
    payload: CopilotQueryRequest,
    request: Request,
    current_user: UserDB = Depends(require_officer),
    db: Session = Depends(get_db),
):
    """
    Submits an inquiry to the AI Inspection Copilot regarding a specific inspection dossier.
    Grounded strictly in stored package evidence, OCR lines, declarations, and rule evaluations.
    """
    req_id = getattr(request.state, "request_id", None)
    return process_copilot_query(
        db=db,
        current_user=current_user,
        inspection_id=inspection_id,
        payload=payload,
        request_id=req_id,
    )


@copilot_router.get("/{inspection_id}/copilot/suggested", response_model=CopilotSuggestedQuestionsResponse)
async def get_suggested_questions_endpoint(
    inspection_id: str,
    current_user: UserDB = Depends(require_officer),
    db: Session = Depends(get_db),
):
    """Retrieves context-aware starter questions based strictly on the current inspection state."""
    return get_suggested_questions(
        db=db,
        current_user=current_user,
        inspection_id=inspection_id,
    )


@copilot_router.post("/{inspection_id}/copilot/feedback")
async def submit_copilot_feedback_endpoint(
    inspection_id: str,
    payload: CopilotFeedbackRequest,
    current_user: UserDB = Depends(require_officer),
):
    """Submits officer feedback on answer helpfulness and accuracy."""
    return record_copilot_feedback(
        current_user=current_user,
        payload=payload,
    )


@copilot_router.get("/{inspection_id}/copilot/history", response_model=List[Dict[str, Any]])
async def get_copilot_history_endpoint(
    inspection_id: str,
    current_user: UserDB = Depends(require_officer),
):
    """Retrieves capped session conversation history for this inspection."""
    return get_conversation_history(inspection_id)
