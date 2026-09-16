"""
Pydantic Schemas for NIRIKSHAK AI Inspection Copilot.
Defines structured inputs, grounded responses, evidence sources, and action navigation.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class CopilotSource(BaseModel):
    """Clickable evidence anchor linking back to exact packaging panels, OCR lines, or rules."""
    type: str  # "EVIDENCE", "OCR", "DECLARATION", "FINDING", "RULE", "OBSERVATION", "CONFLICT"
    label: str
    inspection_id: str
    image_id: Optional[str] = None
    panel_type: Optional[str] = None
    ocr_line_id: Optional[str] = None
    declaration_key: Optional[str] = None
    finding_id: Optional[str] = None
    rule_reference: Optional[str] = None
    rule_url: Optional[str] = None


class CopilotAction(BaseModel):
    """Deterministic UI action that assists the officer in navigating the inspection workspace."""
    type: str  # "OPEN_EVIDENCE", "OPEN_FINDING", "OPEN_CONFLICT", "OPEN_RULE", "OPEN_VERIFICATION"
    label: str
    target_id: Optional[str] = None
    target_tab: Optional[str] = None


class CopilotQueryRequest(BaseModel):
    """Inquiry submitted by an authorized enforcement officer."""
    message: str = Field(..., min_length=1, max_length=2000)
    context_mode: Optional[str] = "INSPECTION_CONTEXT"  # "FINDING_CONTEXT", "DECLARATION_CONTEXT", "CONFLICT_CONTEXT", "INSPECTION_CONTEXT", "RULE_CONTEXT"
    finding_id: Optional[str] = None
    declaration_key: Optional[str] = None
    image_id: Optional[str] = None
    conversation_history: Optional[List[Dict[str, str]]] = None


class CopilotResponse(BaseModel):
    """Structured, evidence-grounded response with legal disclaimers and source citations."""
    success: bool = True
    answer: str
    sources: List[CopilotSource] = []
    actions: List[CopilotAction] = []
    grounded: bool = True
    quality_state: str = "GROUNDED"  # "GROUNDED", "PARTIALLY_GROUNDED", "INSUFFICIENT_EVIDENCE", "UNAVAILABLE"
    mode: str = "RULE_BASED_DEMO"   # "RULE_BASED_DEMO" or "AI_GROUNDED"
    disclaimer: str = (
        "AI-ASSISTED: This copilot explains packaging evidence and configured rule evaluations. "
        "It does not make official legal determinations. Official verification remains with the authorized officer."
    )
    request_id: Optional[str] = None


class CopilotSuggestedQuestionsResponse(BaseModel):
    """Context-aware starter questions based on the target inspection's actual state."""
    inspection_id: str
    suggested_questions: List[str]


class CopilotFeedbackRequest(BaseModel):
    """Feedback submitted by officer regarding answer helpfulness."""
    copilot_response_id: str
    feedback: str  # "HELPFUL", "NOT_HELPFUL", "INCORRECT"
    notes: Optional[str] = None
