from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    Text,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import relationship
from .connection import Base


class UserDB(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    display_name = Column(String(255), nullable=False)
    role = Column(String(32), nullable=False, default="USER", index=True)
    cadre_code = Column(String(64), nullable=True)
    jurisdiction = Column(String(255), nullable=True)
    active = Column(Boolean, default=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    salt = Column(String(64), nullable=False)
    created_at = Column(String(64), nullable=False)
    last_login_at = Column(String(64), nullable=True)

    # Relationships
    complaints = relationship("ComplaintDB", back_populates="user", cascade="all, delete-orphan")
    inspections = relationship("InspectionDB", back_populates="officer")


class ComplaintDB(Base):
    __tablename__ = "complaints"

    id = Column(String(64), primary_key=True, index=True)
    complaint_reference = Column(String(64), unique=True, index=True, nullable=False)
    user_id = Column(String(64), ForeignKey("users.id"), nullable=False, index=True)
    consumer_email = Column(String(255), nullable=False, index=True)
    product_name = Column(String(255), nullable=False)
    product_description = Column(String(255), nullable=True)
    complaint_description = Column(Text, nullable=False)
    issue_category = Column(String(64), nullable=False, default="other")
    image_reference = Column(Text, nullable=True)
    status = Column(String(32), default="SUBMITTED", nullable=False, index=True)
    created_at = Column(String(64), nullable=False, index=True)
    updated_at = Column(String(64), nullable=False)
    reviewed_by = Column(String(64), nullable=True)
    reviewed_at = Column(String(64), nullable=True)
    officer_notes = Column(Text, nullable=True)
    linked_inspection_id = Column(String(64), nullable=True, index=True)

    # Relationships
    user = relationship("UserDB", back_populates="complaints")
    inspection = relationship(
        "InspectionDB",
        back_populates="complaint",
        uselist=False,
    )


class InspectionDB(Base):
    __tablename__ = "inspections"

    id = Column(String(64), primary_key=True, index=True)
    inspection_reference = Column(String(64), unique=True, index=True, nullable=False)
    complaint_id = Column(String(64), ForeignKey("complaints.id"), nullable=True, index=True)
    complaint_reference = Column(String(64), nullable=True)
    officer_id = Column(String(64), ForeignKey("users.id"), nullable=False, index=True)
    product_name = Column(String(255), nullable=False)
    brand = Column(String(255), nullable=True)
    retail_point = Column(String(255), nullable=True)
    category = Column(String(128), nullable=True)
    source = Column(String(64), default="FIELD_INSPECTION", nullable=False)
    status = Column(String(32), default="DRAFT", nullable=False, index=True)
    verification_state = Column(String(32), default="UNVERIFIED", nullable=False)
    compliance_score = Column(Integer, default=0, nullable=False)
    package_image_url = Column(Text, nullable=True)
    report_status = Column(String(32), default="NOT_GENERATED", nullable=False)
    report_pdf_path = Column(Text, nullable=True)
    report_sha256 = Column(String(64), nullable=True)
    report_version = Column(Integer, default=1, nullable=False)
    created_at = Column(String(64), nullable=False, index=True)
    updated_at = Column(String(64), nullable=False)
    completed_at = Column(String(64), nullable=True)

    # Relationships
    officer = relationship("UserDB", back_populates="inspections")
    complaint = relationship("ComplaintDB", back_populates="inspection")
    analysis = relationship("InspectionAnalysisDB", back_populates="inspection", uselist=False, cascade="all, delete-orphan")
    observations = relationship("OfficerObservationDB", back_populates="inspection", cascade="all, delete-orphan")
    verification = relationship("OfficerVerificationDB", back_populates="inspection", uselist=False, cascade="all, delete-orphan")
    images = relationship("InspectionImageDB", back_populates="inspection", cascade="all, delete-orphan", order_by="InspectionImageDB.created_at")


class InspectionImageDB(Base):
    __tablename__ = "inspection_images"

    id = Column(String(64), primary_key=True, index=True)
    inspection_id = Column(String(64), ForeignKey("inspections.id"), nullable=False, index=True)
    panel_type = Column(String(32), default="UNKNOWN", nullable=False)  # FRONT, BACK, LEFT_SIDE, RIGHT_SIDE, TOP, BOTTOM, OTHER, UNKNOWN
    file_reference = Column(Text, nullable=False)
    image_hash = Column(String(64), nullable=True)  # SHA-256 integrity hash of raw file bytes
    quality_json = Column(Text, nullable=True)     # Quantitative image quality analysis
    original_filename = Column(String(255), nullable=True)
    mime_type = Column(String(64), default="image/jpeg", nullable=False)
    source = Column(String(32), default="UPLOAD", nullable=False)  # CAMERA, UPLOAD, CONSUMER_SUBMISSION, OFFICER_ADDED
    width = Column(Integer, default=0, nullable=False)
    height = Column(Integer, default=0, nullable=False)
    ocr_status = Column(String(32), default="PENDING", nullable=False)  # PENDING, PROCESSING, COMPLETED, FAILED
    ocr_text = Column(Text, nullable=True)
    ocr_lines_json = Column(Text, nullable=True)
    created_at = Column(String(64), nullable=False)
    uploaded_by = Column(String(64), nullable=True)
    retention_until = Column(String(64), nullable=True)
    deleted_at = Column(String(64), nullable=True)

    inspection = relationship("InspectionDB", back_populates="images")


class InspectionAnalysisDB(Base):
    __tablename__ = "inspection_analyses"

    id = Column(String(64), primary_key=True, index=True)
    inspection_id = Column(String(64), ForeignKey("inspections.id"), unique=True, nullable=False, index=True)
    ocr_text = Column(Text, nullable=True)
    ocr_lines_json = Column(Text, nullable=True)
    declarations_json = Column(Text, nullable=True)
    normalized_values_json = Column(Text, nullable=True)
    statutory_findings_json = Column(Text, nullable=True)
    evidence_metadata_json = Column(Text, nullable=True)
    analysis_timestamp = Column(String(64), nullable=False)
    ocr_processing_time_ms = Column(Float, default=0.0, nullable=False)

    inspection = relationship("InspectionDB", back_populates="analysis")


class OfficerObservationDB(Base):
    __tablename__ = "officer_observations"

    id = Column(String(64), primary_key=True, index=True)
    inspection_id = Column(String(64), ForeignKey("inspections.id"), nullable=False, index=True)
    officer_id = Column(String(64), ForeignKey("users.id"), nullable=False, index=True)
    category = Column(String(64), nullable=False, default="GENERAL")
    observation = Column(Text, nullable=False)
    created_at = Column(String(64), nullable=False)
    updated_at = Column(String(64), nullable=False)

    inspection = relationship("InspectionDB", back_populates="observations")


class OfficerVerificationDB(Base):
    __tablename__ = "officer_verifications"

    id = Column(String(64), primary_key=True, index=True)
    inspection_id = Column(String(64), ForeignKey("inspections.id"), unique=True, nullable=False, index=True)
    officer_id = Column(String(64), ForeignKey("users.id"), nullable=False, index=True)
    reviewed_ai_findings = Column(Boolean, default=False, nullable=False)
    reviewed_visual_evidence = Column(Boolean, default=False, nullable=False)
    recorded_physical_observations = Column(Boolean, default=False, nullable=False)
    officer_decision = Column(String(32), nullable=False, default="REVIEW_REQUIRED")
    legal_basis = Column(Text, nullable=True)
    officer_notes = Column(Text, nullable=True)
    officer_justification = Column(Text, nullable=True)
    decision_type = Column(String(32), default="STANDARD", nullable=False)
    verified_at = Column(String(64), nullable=False)

    inspection = relationship("InspectionDB", back_populates="verification")


class AuditEventDB(Base):
    __tablename__ = "audit_events"

    id = Column(String(64), primary_key=True, index=True)
    actor_user_id = Column(String(64), nullable=False, index=True)
    actor_email = Column(String(255), nullable=False)
    action = Column(String(64), nullable=False, index=True)
    entity_type = Column(String(64), nullable=True, index=True)
    entity_id = Column(String(64), nullable=True, index=True)
    timestamp = Column(String(64), nullable=False, index=True)
    metadata_json = Column(Text, nullable=True)
    previous_event_hash = Column(String(64), nullable=True)  # Cryptographic chain linkage
    event_hash = Column(String(64), nullable=True)           # SHA-256 of canonical event state


class NotificationDB(Base):
    __tablename__ = "notifications"

    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(64), nullable=True, index=True)
    role_target = Column(String(32), nullable=True, index=True)  # "OFFICER", "USER", or None for broadcast
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    link = Column(String(255), nullable=True)
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(String(64), nullable=False, index=True)
