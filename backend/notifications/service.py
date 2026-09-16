import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_
from database.models import NotificationDB, UserDB


def create_notification(
    db: Session,
    title: str,
    message: str,
    user_id: Optional[str] = None,
    role_target: Optional[str] = None,
    link: Optional[str] = None,
) -> NotificationDB:
    """Dispatches an in-app notification to a user or role group."""
    notif_id = f"notif-{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()

    notif = NotificationDB(
        id=notif_id,
        user_id=user_id,
        role_target=role_target,
        title=title,
        message=message,
        link=link,
        is_read=False,
        created_at=now,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


def get_notifications_for_user(
    db: Session, user: UserDB, limit: int = 50
) -> List[NotificationDB]:
    """Fetches in-app notifications relevant to the authenticated user's ID or role."""
    return (
        db.query(NotificationDB)
        .filter(
            or_(
                NotificationDB.user_id == user.id,
                NotificationDB.role_target == user.role,
                (NotificationDB.user_id.is_(None) & NotificationDB.role_target.is_(None)),
            )
        )
        .order_by(NotificationDB.created_at.desc())
        .limit(limit)
        .all()
    )


def mark_notification_read(db: Session, notif_id: str) -> Optional[NotificationDB]:
    """Marks a single notification as read."""
    notif = db.query(NotificationDB).filter(NotificationDB.id == notif_id).first()
    if notif:
        notif.is_read = True
        db.commit()
        db.refresh(notif)
    return notif


def mark_all_notifications_read(db: Session, user: UserDB) -> int:
    """Marks all notifications for this user as read."""
    notifs = (
        db.query(NotificationDB)
        .filter(
            or_(
                NotificationDB.user_id == user.id,
                NotificationDB.role_target == user.role,
            )
        )
        .filter(NotificationDB.is_read == False)
        .all()
    )
    count = len(notifs)
    for n in notifs:
        n.is_read = True
    db.commit()
    return count
