import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header
from .models import (
    User,
    UserCreate,
    UserLogin,
    TokenResponse,
    Complaint,
    ComplaintCreate,
    ComplaintStatusUpdate,
    UserRole,
)
from .security import create_access_token, decode_access_token
from .service import auth_service

logger = logging.getLogger("nirikshak-auth")
auth_router = APIRouter(prefix="/api/auth", tags=["Authentication"])
complaints_router = APIRouter(prefix="/api/complaints", tags=["Complaints"])


def get_current_user(authorization: Optional[str] = Header(None)) -> User:
    """
    Extracts Bearer token from authorization header and returns validated User.
    Raises HTTP 401 on missing or invalid token.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.replace("Bearer ", "").strip()
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session invalid or expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload["sub"]
    user = auth_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or deactivated.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def require_officer(current_user: User = Depends(get_current_user)) -> User:
    """Restricts endpoint access strictly to authorized inspection officers."""
    if current_user.role != UserRole.OFFICER:
        logger.warning(f"Unauthorized officer portal access attempt by user: {current_user.email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Restricted: This area is available only to authorized inspection officers.",
        )
    return current_user


# --- Auth Endpoints ---

@auth_router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """
    Unified login endpoint for both Officers and Consumers.
    Backend verifies credentials and authoritative role; generic error returned on failure.
    """
    user = auth_service.authenticate_user(credentials.email, credentials.password)
    if not user:
        # Generic error message to prevent account enumeration
        logger.warning(f"Failed login attempt for: {credentials.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to sign in. Check your email and password and try again.",
        )

    # Issue JWT token containing verified role
    token = create_access_token(
        data={"sub": user.id, "email": user.email, "role": user.role.value}
    )
    logger.info(f"Successful login for {user.email} with role: {user.role.value}")
    return TokenResponse(access_token=token, token_type="bearer", user=user)


@auth_router.post("/register", response_model=TokenResponse)
async def register(payload: UserCreate):
    """
    User registration endpoint with authoritative backend role classification.
    """
    user, error = auth_service.register_user(payload)
    if error or not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error or "Registration failed.")

    token = create_access_token(
        data={"sub": user.id, "email": user.email, "role": user.role.value}
    )
    return TokenResponse(access_token=token, token_type="bearer", user=user)


@auth_router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logs out user session and records audit event."""
    auth_service.log_audit(
        actor_user_id=current_user.id,
        actor_email=current_user.email,
        action="USER_LOGOUT",
        entity_type="USER",
        entity_id=current_user.id,
    )
    return {"success": True, "message": "Successfully logged out."}


@auth_router.get("/me", response_model=User)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Fetch profile of currently authenticated user."""
    return current_user


# --- Complaint Endpoints ---

@complaints_router.post("", response_model=Complaint)
async def submit_complaint(
    payload: ComplaintCreate, current_user: User = Depends(get_current_user)
):
    """
    Submit a consumer grievance complaint linked to the authenticated user.
    """
    complaint = auth_service.create_complaint(current_user, payload)
    logger.info(f"Complaint {complaint.id} created by user {current_user.email}")
    return complaint


@complaints_router.get("", response_model=List[Complaint])
async def list_complaints(current_user: User = Depends(get_current_user)):
    """
    List complaints.
    - Officers receive all registered complaints.
    - Consumers receive only their own submitted complaints.
    """
    return auth_service.get_complaints(current_user)


@complaints_router.get("/{complaint_id}", response_model=Complaint)
async def get_complaint(complaint_id: str, current_user: User = Depends(get_current_user)):
    """
    Get single complaint details with strict ownership verification.
    """
    complaint = auth_service.get_complaint_by_id(current_user, complaint_id)
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found or access restricted.",
        )
    return complaint


@complaints_router.patch("/{complaint_id}/status", response_model=Complaint)
async def update_complaint_status(
    complaint_id: str,
    payload: ComplaintStatusUpdate,
    current_user: User = Depends(require_officer),
):
    """
    Officer-only endpoint to update complaint review status, assign notes, or link an inspection.
    """
    updated = auth_service.update_complaint_status(current_user, complaint_id, payload)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found.",
        )
    logger.info(f"Complaint {complaint_id} status updated to {payload.status.value} by officer {current_user.email}")
    return updated
