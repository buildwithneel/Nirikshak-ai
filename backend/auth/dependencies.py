import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import UserDB
from auth.security import decode_access_token, normalize_email

logger = logging.getLogger("nirikshak-auth-dep")


def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> UserDB:
    """
    Validates JWT Bearer token and returns authenticated UserDB record from database.
    Supports both internal tokens and Supabase Auth tokens.
    Automatically onboards new Supabase OAuth users with default USER (consumer) role.
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

    user_id = str(payload["sub"])
    user = db.query(UserDB).filter(UserDB.id == user_id, UserDB.active == True).first()

    # If not found by ID, attempt lookup by normalized email
    email = normalize_email(payload.get("email", ""))
    if not user and email:
        user = db.query(UserDB).filter(UserDB.email == email, UserDB.active == True).first()

    # If still not found and authenticated via Supabase, create user profile with USER role
    if not user and (payload.get("is_supabase") or email):
        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="OAuth profile missing verified email address.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user_meta = payload.get("user_metadata", {})
        display_name = user_meta.get("full_name") or user_meta.get("name") or email.split("@")[0]

        now_iso = datetime.now(timezone.utc).isoformat()
        user = UserDB(
            id=user_id,
            email=email,
            display_name=display_name,
            role="USER",  # Strict default: never auto-assign OFFICER privileges
            active=True,
            hashed_password="OAUTH_EXTERNAL_MANAGED",
            salt="OAUTH",
            created_at=now_iso,
            last_login_at=now_iso,
        )
        try:
            db.add(user)
            db.commit()
            db.refresh(user)
            logger.info(f"Onboarded new OAuth user: {email} (Role: USER)")
        except Exception as e:
            db.rollback()
            # Race condition or existing account
            user = db.query(UserDB).filter(UserDB.email == email, UserDB.active == True).first()
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to initialize user profile.",
                )

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
