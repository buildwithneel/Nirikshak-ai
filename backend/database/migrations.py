import logging
from datetime import datetime, timezone
from sqlalchemy import text
from .connection import engine, Base, SessionLocal
from .models import (
    UserDB,
    ComplaintDB,
    InspectionDB,
    InspectionImageDB,
    AuditEventDB,
    NotificationDB,
)
from auth.security import hash_password, normalize_email

logger = logging.getLogger("nirikshak-migrations")

SCHEMA_VERSION = 4  # Prompt 10 production hardening schema version


def run_migrations():
    """
    Ensures schema integrity and versioned database migration.
    Creates tables safely without destructive table drops and seeds initial records.
    """
    logger.info("Running database migrations...")
    Base.metadata.create_all(bind=engine)

    # Add new Prompt 10 columns safely to existing SQLite tables
    with engine.connect() as conn:
        def safe_add_column(table_name: str, col_name: str, col_def: str):
            try:
                conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_def}"))
                conn.commit()
            except Exception:
                pass

        safe_add_column("inspections", "report_sha256", "TEXT")
        safe_add_column("inspections", "report_version", "INTEGER DEFAULT 1")
        safe_add_column("inspection_images", "image_hash", "TEXT")
        safe_add_column("inspection_images", "quality_json", "TEXT")
        safe_add_column("officer_verifications", "legal_basis", "TEXT")
        safe_add_column("officer_verifications", "officer_justification", "TEXT")
        safe_add_column("officer_verifications", "decision_type", "TEXT DEFAULT 'STANDARD'")
        safe_add_column("audit_events", "previous_event_hash", "TEXT")
        safe_add_column("audit_events", "event_hash", "TEXT")

        # Check and manage schema version table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS schema_version (
                version INTEGER PRIMARY KEY,
                applied_at TEXT NOT NULL
            )
        """))
        conn.commit()

        result = conn.execute(text("SELECT MAX(version) FROM schema_version")).scalar()
        current_version = result if result is not None else 0

        if current_version < SCHEMA_VERSION:
            logger.info(f"Upgrading database schema from version {current_version} to {SCHEMA_VERSION}")
            conn.execute(
                text("INSERT INTO schema_version (version, applied_at) VALUES (:v, :t)"),
                {"v": SCHEMA_VERSION, "t": datetime.now(timezone.utc).isoformat()},
            )
            conn.commit()

    # Seed initial users & complaints if empty
    db = SessionLocal()
    try:
        user_count = db.query(UserDB).count()
        if user_count == 0:
            logger.info("Seeding initial demo user accounts...")
            # 1. Inspection Officer
            officer_hash, officer_salt = hash_password("Officer@2026!")
            officer = UserDB(
                id="usr-officer-001",
                email=normalize_email("inspector@officer.demo"),
                display_name="Insp. R. Varma",
                role="OFFICER",
                cadre_code="LM-DL-2024-881",
                jurisdiction="State Enforcement Directorate, Zone 1",
                active=True,
                hashed_password=officer_hash,
                salt=officer_salt,
                created_at=datetime.now(timezone.utc).isoformat(),
                last_login_at=datetime.now(timezone.utc).isoformat(),
            )
            db.add(officer)

            # 2. Citizen Consumer
            citizen_hash, citizen_salt = hash_password("Citizen@2026!")
            citizen = UserDB(
                id="usr-citizen-002",
                email=normalize_email("citizen@gmail.com"),
                display_name="Rahul Sharma",
                role="USER",
                cadre_code=None,
                jurisdiction=None,
                active=True,
                hashed_password=citizen_hash,
                salt=citizen_salt,
                created_at=datetime.now(timezone.utc).isoformat(),
                last_login_at=datetime.now(timezone.utc).isoformat(),
            )
            db.add(citizen)
            db.commit()

        complaint_count = db.query(ComplaintDB).count()
        if complaint_count == 0:
            logger.info("Seeding initial grievance records...")
            now = datetime.now(timezone.utc).isoformat()
            c1 = ComplaintDB(
                id="CMP-7F39A2B1",
                complaint_reference="CMP-7F39A2B1",
                user_id="usr-citizen-002",
                consumer_email="citizen@gmail.com",
                product_name="Heritage Organic Almond Milk 1L",
                product_description="Packaged Food Product",
                complaint_description="Label is missing customer grievance cell telephone number and postal address. Only a broken website URL is printed.",
                issue_category="missing_care",
                image_reference=None,
                status="SUBMITTED",
                created_at=now,
                updated_at=now,
                reviewed_by=None,
                reviewed_at=None,
                officer_notes=None,
                linked_inspection_id=None,
            )
            c2 = ComplaintDB(
                id="CMP-4C819E02",
                complaint_reference="CMP-4C819E02",
                user_id="usr-citizen-002",
                consumer_email="citizen@gmail.com",
                product_name="SunShine Sunscreen SPF 50",
                product_description="Cosmetic Commodity",
                complaint_description="Purchased at airport kiosk. Sold for Rs. 499 with sticker obscuring original MRP of Rs. 350.",
                issue_category="missing_mrp",
                image_reference=None,
                status="UNDER_REVIEW",
                created_at=now,
                updated_at=now,
                reviewed_by="usr-officer-001",
                reviewed_at=now,
                officer_notes="Preliminary review indicates potential violation under Rule 18(2) dual-pricing.",
                linked_inspection_id=None,
            )
            db.add_all([c1, c2])

            # Seed notifications
            n1 = NotificationDB(
                id="notif-init-1",
                user_id=None,
                role_target="OFFICER",
                title="New Consumer Grievance Received",
                message="Complaint CMP-7F39A2B1 submitted for Heritage Organic Almond Milk 1L.",
                link="/complaints/CMP-7F39A2B1",
                is_read=False,
                created_at=now,
            )
            n2 = NotificationDB(
                id="notif-init-2",
                user_id="usr-citizen-002",
                role_target="USER",
                title="Complaint Under Official Review",
                message="Your complaint CMP-4C819E02 has been taken up for preliminary review by Legal Metrology.",
                link="/my-complaints/CMP-4C819E02",
                is_read=False,
                created_at=now,
            )
            db.add_all([n1, n2])
            db.commit()

        logger.info("Database migrations & seed verification completed successfully.")
    except Exception as e:
        logger.error(f"Migration error: {e}", exc_info=True)
        db.rollback()
    finally:
        db.close()
