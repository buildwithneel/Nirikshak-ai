from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import UserDB
from auth.dependencies import get_current_user
from .service import (
    get_notifications_for_user,
    mark_notification_read,
    mark_all_notifications_read,
)

notifications_router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


class NotificationResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    role_target: Optional[str] = None
    title: str
    message: str
    link: Optional[str] = None
    is_read: bool
    created_at: str

    class Config:
        from_attributes = True


@notifications_router.get("", response_model=List[NotificationResponse])
async def list_notifications(
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List in-app notifications for authenticated user."""
    notifs = get_notifications_for_user(db, current_user)
    return [NotificationResponse.model_validate(n) for n in notifs]


@notifications_router.patch("/{notif_id}/read", response_model=NotificationResponse)
async def read_notification(
    notif_id: str,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a notification as read."""
    notif = mark_notification_read(db, notif_id)
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
    return NotificationResponse.model_validate(notif)


@notifications_router.post("/read-all")
async def read_all_notifications(
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all notifications for this user as read."""
    count = mark_all_notifications_read(db, current_user)
    return {"success": True, "count": count}
