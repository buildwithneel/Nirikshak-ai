import uuid
import threading
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from .models import (
    User,
    UserInDB,
    UserRole,
    UserCreate,
    Complaint,
    ComplaintCreate,
    ComplaintStatus,
    ComplaintStatusUpdate,
    AuditLogEntry,
)
from .security import (
    hash_password,
    verify_password,
    normalize_email,
    determine_role_from_email,
    is_valid_email,
)


class AuthService:
    """
    Centralized Authentication, User Management, and Complaints Service.
    Maintains thread-safe in-memory store with seeded demo accounts for rapid testing.
    """

    def __init__(self):
        self._lock = threading.RLock()
        self._users: Dict[str, UserInDB] = {}  # keyed by normalized email

        self._users_by_id: Dict[str, UserInDB] = {}  # keyed by user id
        self._complaints: Dict[str, Complaint] = {}  # keyed by complaint id
        self._audit_logs: List[AuditLogEntry] = []
        self._seed_demo_accounts()
        self._seed_demo_complaints()

    def _seed_demo_accounts(self):
        """Seed development / demo accounts as specified in Prompt 7."""
        # 1. Inspection Officer
        officer_email = normalize_email("inspector@officer.demo")
        officer_hash, officer_salt = hash_password("Officer@2026!")
        officer_user = UserInDB(
            id="usr-officer-001",
            email=officer_email,
            display_name="Insp. R. Varma",
            role=UserRole.OFFICER,
            active=True,
            jurisdiction="State Enforcement Directorate, Zone 1",
            cadre_code="LM-DL-2024-881",
            created_at=datetime.now(timezone.utc).isoformat(),
            last_login_at=datetime.now(timezone.utc).isoformat(),
            hashed_password=officer_hash,
            salt=officer_salt,
        )
        self._users[officer_email] = officer_user
        self._users_by_id[officer_user.id] = officer_user

        # 2. Citizen / Consumer
        citizen_email = normalize_email("citizen@gmail.com")
        citizen_hash, citizen_salt = hash_password("Citizen@2026!")
        citizen_user = UserInDB(
            id="usr-citizen-002",
            email=citizen_email,
            display_name="Rahul Sharma",
            role=UserRole.USER,
            active=True,
            jurisdiction=None,
            cadre_code=None,
            created_at=datetime.now(timezone.utc).isoformat(),
            last_login_at=datetime.now(timezone.utc).isoformat(),
            hashed_password=citizen_hash,
            salt=citizen_salt,
        )
        self._users[citizen_email] = citizen_user
        self._users_by_id[citizen_user.id] = citizen_user

    def _seed_demo_complaints(self):
        """Seed initial complaint records to demonstrate the Officer Complaint Inbox immediately."""
        c1 = Complaint(
            id="CMP-7F39A2B1",
            user_id="usr-citizen-002",
            email="citizen@gmail.com",
            product_name="Heritage Organic Almond Milk 1L",
            product_description="Packaged Food Product",
            issue_category="missing_care",
            description="Label is missing customer grievance cell telephone number and postal address. Only a broken website URL is printed.",
            image_url=None,
            status=ComplaintStatus.SUBMITTED,
            created_at=datetime.now(timezone.utc).isoformat(),
            updated_at=datetime.now(timezone.utc).isoformat(),
            officer_notes=None,
            linked_inspection_id=None,
        )
        c2 = Complaint(
            id="CMP-4C819E02",
            user_id="usr-citizen-002",
            email="citizen@gmail.com",
            product_name="SunShine Sunscreen SPF 50",
            product_description="Cosmetic Commodity",
            issue_category="missing_mrp",
            description="Purchased at airport kiosk. Sold for Rs. 499 with sticker obscuring original MRP of Rs. 350.",
            image_url=None,
            status=ComplaintStatus.UNDER_REVIEW,
            created_at=datetime.now(timezone.utc).isoformat(),
            updated_at=datetime.now(timezone.utc).isoformat(),
            officer_notes="Preliminary review indicates potential violation under Rule 18(2) dual-pricing.",
            linked_inspection_id=None,
        )
        self._complaints[c1.id] = c1
        self._complaints[c2.id] = c2

    def log_audit(
        self,
        actor_user_id: str,
        actor_email: str,
        action: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> AuditLogEntry:
        """Appends an event to the persistent in-memory audit trail."""
        entry = AuditLogEntry(
            id=f"audit-{uuid.uuid4().hex[:8]}",
            actor_user_id=actor_user_id,
            actor_email=actor_email,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details or {},
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
        with self._lock:
            self._audit_logs.append(entry)
        return entry

    def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """
        Validates credentials and returns authenticated User model.
        Returns None if user does not exist or password does not match.
        """
        clean_email = normalize_email(email)
        with self._lock:
            user_db = self._users.get(clean_email)
            if not user_db or not user_db.active:
                return None

            if not verify_password(password, user_db.hashed_password, user_db.salt):
                return None

            user_db.last_login_at = datetime.now(timezone.utc).isoformat()
            self.log_audit(
                actor_user_id=user_db.id,
                actor_email=user_db.email,
                action="USER_LOGIN",
                entity_type="USER",
                entity_id=user_db.id,
            )
            return User(**user_db.model_dump())

    def register_user(self, user_create: UserCreate) -> tuple[Optional[User], Optional[str]]:
        """
        Registers a new user account with authoritative server-side role assignment.
        Returns (user, None) on success or (None, error_message) on failure.
        """
        clean_email = normalize_email(user_create.email)
        if not is_valid_email(clean_email):
            return None, "Invalid email format."

        if not user_create.password or len(user_create.password) < 6:
            return None, "Password must be at least 6 characters."

        with self._lock:
            if clean_email in self._users:
                return None, "An account with this email address already exists."

            # Authoritative server-side role determination
            server_role = determine_role_from_email(clean_email)

            display_name = user_create.display_name or clean_email.split("@")[0].capitalize()
            hashed_pwd, salt = hash_password(user_create.password)
            user_id = f"usr-{uuid.uuid4().hex[:10]}"

            new_user = UserInDB(
                id=user_id,
                email=clean_email,
                display_name=display_name,
                role=server_role,
                active=True,
                jurisdiction="Enforcement Area" if server_role == UserRole.OFFICER else None,
                cadre_code=f"LM-{uuid.uuid4().hex[:6].upper()}" if server_role == UserRole.OFFICER else None,
                created_at=datetime.now(timezone.utc).isoformat(),
                last_login_at=datetime.now(timezone.utc).isoformat(),
                hashed_password=hashed_pwd,
                salt=salt,
            )

            self._users[clean_email] = new_user
            self._users_by_id[user_id] = new_user

            self.log_audit(
                actor_user_id=new_user.id,
                actor_email=new_user.email,
                action="USER_REGISTER",
                entity_type="USER",
                entity_id=new_user.id,
                details={"role": server_role.value},
            )

            return User(**new_user.model_dump()), None

    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Fetch user by id."""
        with self._lock:
            u = self._users_by_id.get(user_id)
            if u and u.active:
                return User(**u.model_dump())
            return None

    def get_user_by_email(self, email: str) -> Optional[User]:
        """Fetch user by email."""
        clean_email = normalize_email(email)
        with self._lock:
            u = self._users.get(clean_email)
            if u and u.active:
                return User(**u.model_dump())
            return None

    # --- Complaint Operations with Strict Role-Based Data Boundary ---

    def create_complaint(self, current_user: User, payload: ComplaintCreate) -> Complaint:
        """Create a new grievance complaint associated with the authenticated user."""
        complaint_id = f"CMP-{uuid.uuid4().hex[:8].upper()}"
        now = datetime.now(timezone.utc).isoformat()

        complaint = Complaint(
            id=complaint_id,
            user_id=current_user.id,
            email=current_user.email,
            product_name=payload.product_name,
            product_description=payload.product_description or "Packaged Commodity",
            issue_category=payload.issue_category,
            description=payload.description or "",
            image_url=payload.image_url,
            status=ComplaintStatus.SUBMITTED,
            created_at=now,
            updated_at=now,
            officer_notes=None,
            linked_inspection_id=None,
        )

        with self._lock:
            self._complaints[complaint_id] = complaint

        self.log_audit(
            actor_user_id=current_user.id,
            actor_email=current_user.email,
            action="COMPLAINT_SUBMITTED",
            entity_type="COMPLAINT",
            entity_id=complaint_id,
            details={"product_name": payload.product_name, "issue_category": payload.issue_category},
        )
        return complaint

    def get_complaints(self, current_user: User) -> List[Complaint]:
        """
        Role-based complaint filtering:
        - Officers: view all complaints
        - Consumers: strictly view only their own complaints
        """
        with self._lock:
            all_complaints = list(self._complaints.values())

        if current_user.role == UserRole.OFFICER:
            # Sort newest first
            return sorted(all_complaints, key=lambda c: c.created_at, reverse=True)
        else:
            user_complaints = [c for c in all_complaints if c.user_id == current_user.id]
            return sorted(user_complaints, key=lambda c: c.created_at, reverse=True)

    def get_complaint_by_id(self, current_user: User, complaint_id: str) -> Optional[Complaint]:
        """Fetch single complaint ensuring data boundary enforcement."""
        with self._lock:
            complaint = self._complaints.get(complaint_id)

        if not complaint:
            return None

        # Data boundary check
        if current_user.role != UserRole.OFFICER and complaint.user_id != current_user.id:
            return None

        return complaint

    def update_complaint_status(
        self, current_user: User, complaint_id: str, update: ComplaintStatusUpdate
    ) -> Optional[Complaint]:
        """Officer-only action to update status or attach officer notes."""
        if current_user.role != UserRole.OFFICER:
            return None

        with self._lock:
            complaint = self._complaints.get(complaint_id)
            if not complaint:
                return None

            complaint.status = update.status
            if update.officer_notes is not None:
                complaint.officer_notes = update.officer_notes
            if update.linked_inspection_id is not None:
                complaint.linked_inspection_id = update.linked_inspection_id
            complaint.updated_at = datetime.now(timezone.utc).isoformat()

        self.log_audit(
            actor_user_id=current_user.id,
            actor_email=current_user.email,
            action="COMPLAINT_STATUS_UPDATED",
            entity_type="COMPLAINT",
            entity_id=complaint_id,
            details={"status": update.status.value, "notes": update.officer_notes},
        )
        return complaint


# Global singleton instance
auth_service = AuthService()
