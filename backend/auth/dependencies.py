import logging
from typing import Optional
from fastapi import Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import UserDB
from auth.security import decode_access_token

logger = logging.getLogger("nirikshak-auth-dep")


def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> UserDB:
    """
    Validates JWT Bearer token and returns authenticated UserDB record from database.
    Raises 401 Unauthorized on invalid/expired credentials.
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
    user = db.query(UserDB).filter(UserDB.id == user_id, UserDB.active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or deactivated.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def require_officer(current_user: UserDB = Depends(get_current_user)) -> UserDB:
    """Restricts route access strictly to authenticated officers."""
    if current_user.role != "OFFICER":
        logger.warning(f"Forbidden officer portal access attempt by user: {current_user.email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Restricted: This area is available only to authorized inspection officers.",
        )
    return current_user
