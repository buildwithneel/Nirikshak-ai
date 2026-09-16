from datetime import datetime
from enum import Enum
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field


class UserRole(str, Enum):
    OFFICER = "OFFICER"
    USER = "USER"
    # Extensible future roles
    ADMIN = "ADMIN"
    SUPERVISOR = "SUPERVISOR"
    REVIEWER = "REVIEWER"


class ComplaintStatus(str, Enum):
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    INSPECTION_REQUIRED = "INSPECTION_REQUIRED"
    INSPECTION_IN_PROGRESS = "INSPECTION_IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class UserBase(BaseModel):
    email: str
    display_name: str
    role: UserRole = UserRole.USER
    active: bool = True
    jurisdiction: Optional[str] = None
    cadre_code: Optional[str] = None


class User(UserBase):
    id: str
    created_at: str
    last_login_at: Optional[str] = None


class UserInDB(User):
    hashed_password: str
    salt: str


class UserCreate(BaseModel):
    email: str
    password: str
    display_name: Optional[str] = None
    role: Optional[UserRole] = None  # If provided in dev mode, or determined by backend


class UserLogin(BaseModel):
    email: str
    password: str
    remember_me: Optional[bool] = False


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User


class ComplaintCreate(BaseModel):
    product_name: str
    issue_category: str
    description: Optional[str] = ""
    contact_email: Optional[str] = None
    image_url: Optional[str] = None
    product_description: Optional[str] = None


class Complaint(BaseModel):
    id: str
    user_id: str
    email: str
    product_name: str
    product_description: Optional[str] = None
    issue_category: str
    description: str
    image_url: Optional[str] = None
    status: ComplaintStatus = ComplaintStatus.SUBMITTED
    created_at: str
    updated_at: str
    officer_notes: Optional[str] = None
    linked_inspection_id: Optional[str] = None


class ComplaintStatusUpdate(BaseModel):
    status: ComplaintStatus
    officer_notes: Optional[str] = None
    linked_inspection_id: Optional[str] = None


class AuditLogEntry(BaseModel):
    id: str
    actor_user_id: str
    actor_email: str
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    timestamp: str
