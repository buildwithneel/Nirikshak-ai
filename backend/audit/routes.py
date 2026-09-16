"""
Audit Trail & Tamper-Evident Chain Verification API.
"""

import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import UserDB, InspectionDB
from auth.dependencies import require_officer
from .service import verify_audit_chain, get_audit_events_for_entity

logger = logging.getLogger("nirikshak-audit")
audit_router = APIRouter(tags=["Audit Verification"])


@audit_router.get("/api/inspections/{inspection_id}/audit/verify", response_model=Dict[str, Any])
async def verify_inspection_audit_chain(
    inspection_id: str,
    current_user: UserDB = Depends(require_officer),
    db: Session = Depends(get_db),
):
    """
    Cryptographically verifies the chronological SHA-256 tamper-evident audit chain
    for a specific inspection.
    """
    inspection = db.query(InspectionDB).filter(InspectionDB.id == inspection_id).first()
    if not inspection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inspection not found."
        )

    verification_result = verify_audit_chain(db=db, entity_id=inspection_id)
    return {
        "inspection_id": inspection_id,
        "inspection_reference": inspection.inspection_reference,
        **verification_result
    }


@audit_router.get("/api/complaints/{complaint_id}/audit/verify", response_model=Dict[str, Any])
async def verify_complaint_audit_chain(
    complaint_id: str,
    current_user: UserDB = Depends(require_officer),
    db: Session = Depends(get_db),
):
    """Cryptographically verifies audit trail for a citizen complaint."""
    verification_result = verify_audit_chain(db=db, entity_id=complaint_id)
    return {
        "complaint_id": complaint_id,
        **verification_result
    }
