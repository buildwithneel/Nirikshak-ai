import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import UserDB
from auth.dependencies import get_current_user, require_officer
from .service import (
    create_complaint,
    get_complaints,
    get_complaint_by_id,
    update_complaint_status,
    initiate_inspection_from_complaint,
)

logger = logging.getLogger("nirikshak-complaints")
complaints_router = APIRouter(prefix="/api/complaints", tags=["Complaints"])


class ComplaintCreateSchema(BaseModel):
    product_name: str
    issue_category: str
    description: str
    contact_email: Optional[str] = None
    image_reference: Optional[str] = None
    product_description: Optional[str] = None


class ComplaintStatusUpdateSchema(BaseModel):
    status: str
    officer_notes: Optional[str] = None


class ComplaintResponseSchema(BaseModel):
    id: str
    complaint_reference: str
    user_id: str
    consumer_email: str
    product_name: str
    product_description: Optional[str] = None
    complaint_description: str
    issue_category: str
    image_reference: Optional[str] = None
    status: str
    created_at: str
    updated_at: str
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    officer_notes: Optional[str] = None
    linked_inspection_id: Optional[str] = None

    class Config:
        from_attributes = True


class InspectionBriefResponse(BaseModel):
    id: str
    inspection_reference: str
    complaint_id: Optional[str] = None
    product_name: str
    status: str
    created_at: str

    class Config:
        from_attributes = True


@complaints_router.post("", response_model=ComplaintResponseSchema)
async def submit_complaint_endpoint(
    payload: ComplaintCreateSchema,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submits a consumer grievance complaint linked to authenticated user."""
    try:
        complaint = create_complaint(
            db=db,
            current_user=current_user,
            product_name=payload.product_name,
            issue_category=payload.issue_category,
            description=payload.description,
            contact_email=payload.contact_email,
            image_reference=payload.image_reference,
            product_description=payload.product_description,
        )
        return ComplaintResponseSchema.model_validate(complaint)
    except Exception as e:
        logger.error(f"Error creating complaint: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to submit complaint: {str(e)}",
        )


@complaints_router.get("", response_model=List[ComplaintResponseSchema])
async def list_complaints_endpoint(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns complaints with pagination:
    - Officers receive all jurisdiction complaints.
    - Citizens receive only their own submissions.
    """
    records = get_complaints(
        db=db,
        current_user=current_user,
        status=status_filter,
        search=search,
        page=page,
        page_size=page_size,
    )
    return [ComplaintResponseSchema.model_validate(r) for r in records]


@complaints_router.get("/{complaint_id}", response_model=ComplaintResponseSchema)
async def get_complaint_endpoint(
    complaint_id: str,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves single complaint verifying privacy boundary."""
    record = get_complaint_by_id(db=db, current_user=current_user, complaint_id=complaint_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found or access restricted.",
        )
    return ComplaintResponseSchema.model_validate(record)


@complaints_router.patch("/{complaint_id}/status", response_model=ComplaintResponseSchema)
async def update_complaint_status_endpoint(
    complaint_id: str,
    payload: ComplaintStatusUpdateSchema,
    current_user: UserDB = Depends(require_officer),
    db: Session = Depends(get_db),
):
    """Officer-only action to transition complaint status and record observations."""
    try:
        updated = update_complaint_status(
            db=db,
            current_user=current_user,
            complaint_id=complaint_id,
            status=payload.status,
            officer_notes=payload.officer_notes,
        )
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Complaint not found.",
            )
        return ComplaintResponseSchema.model_validate(updated)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))


@complaints_router.post("/{complaint_id}/initiate-inspection", response_model=InspectionBriefResponse)
async def initiate_inspection_endpoint(
    complaint_id: str,
    current_user: UserDB = Depends(require_officer),
    db: Session = Depends(get_db),
):
    """Officer action: Spawns an official inspection record from a consumer grievance."""
    try:
        inspection = initiate_inspection_from_complaint(
            db=db, current_user=current_user, complaint_id=complaint_id
        )
        return InspectionBriefResponse.model_validate(inspection)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        logger.error(f"Error initiating inspection from complaint {complaint_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
