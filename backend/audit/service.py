import uuid
import json
import hashlib
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from database.models import AuditEventDB

GENESIS_HASH = "GENESIS_ROOT_0000000000000000000000000000000000000000000000000000000000000000"


def compute_canonical_event_hash(
    previous_hash: str,
    actor_id: str,
    action: str,
    entity_type: Optional[str],
    entity_id: Optional[str],
    timestamp: str,
    metadata_json: Optional[str],
) -> str:
    """Computes a deterministic SHA-256 hash over canonical audit event attributes."""
    canonical_payload = (
        f"{previous_hash}|{actor_id}|{action}|{entity_type or ''}|"
        f"{entity_id or ''}|{timestamp}|{metadata_json or ''}"
    )
    return hashlib.sha256(canonical_payload.encode("utf-8")).hexdigest()


def log_audit_event(
    db: Session,
    actor_user_id: str,
    actor_email: str,
    action: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> AuditEventDB:
    """Records a tamper-evident audit trail entry with cryptographic hash chaining."""
    event_id = f"audit-{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()
    meta_str = json.dumps(metadata, sort_keys=True) if metadata else None

    # Retrieve last event to establish cryptographic link
    last_event = None
    if entity_id:
        last_event = (
            db.query(AuditEventDB)
            .filter(AuditEventDB.entity_id == entity_id)
            .order_by(AuditEventDB.timestamp.desc())
            .first()
        )
    if not last_event:
        last_event = db.query(AuditEventDB).order_by(AuditEventDB.timestamp.desc()).first()

    previous_hash = last_event.event_hash if (last_event and last_event.event_hash) else GENESIS_HASH
    event_hash = compute_canonical_event_hash(
        previous_hash=previous_hash,
        actor_id=actor_user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        timestamp=now,
        metadata_json=meta_str,
    )

    entry = AuditEventDB(
        id=event_id,
        actor_user_id=actor_user_id,
        actor_email=actor_email,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        timestamp=now,
        metadata_json=meta_str,
        previous_event_hash=previous_hash,
        event_hash=event_hash,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def verify_audit_chain(db: Session, entity_id: str) -> Dict[str, Any]:
    """
    Cryptographically verifies the audit event hash sequence for an inspection or complaint.
    Detects any tampering or out-of-order alterations in the tamper-evident chain.
    """
    events: List[AuditEventDB] = (
        db.query(AuditEventDB)
        .filter(AuditEventDB.entity_id == entity_id)
        .order_by(AuditEventDB.timestamp.asc())
        .all()
    )

    if not events:
        return {
            "valid": True,
            "event_count": 0,
            "tamper_evident_status": "EMPTY_CHAIN",
            "message": "No audit records found for this entity.",
        }

    for idx, event in enumerate(events):
        # Determine expected previous hash
        expected_prev = events[idx - 1].event_hash if idx > 0 else event.previous_event_hash or GENESIS_HASH

        # Verify previous hash linkage
        if event.previous_event_hash and event.previous_event_hash != expected_prev:
            return {
                "valid": False,
                "event_count": len(events),
                "invalid_event_id": event.id,
                "reason": "Previous hash link broken or misordered.",
                "tamper_evident_status": "TAMPERING_DETECTED",
            }

        # Verify self hash integrity
        expected_self = compute_canonical_event_hash(
            previous_hash=event.previous_event_hash or GENESIS_HASH,
            actor_id=event.actor_user_id,
            action=event.action,
            entity_type=event.entity_type,
            entity_id=event.entity_id,
            timestamp=event.timestamp,
            metadata_json=event.metadata_json,
        )

        if event.event_hash and event.event_hash != expected_self:
            return {
                "valid": False,
                "event_count": len(events),
                "invalid_event_id": event.id,
                "reason": "Payload modified; cryptographic hash does not match canonical event state.",
                "tamper_evident_status": "TAMPERING_DETECTED",
            }

    return {
        "valid": True,
        "event_count": len(events),
        "first_event": events[0].id,
        "last_event": events[-1].id,
        "latest_hash": events[-1].event_hash,
        "tamper_evident_status": "VERIFIED_INTACT",
    }


def get_audit_events_for_entity(
    db: Session, entity_id: str, limit: int = 100, page: int = 1
) -> List[AuditEventDB]:
    """Retrieves chronological audit trail with pagination support."""
    offset = (page - 1) * limit
    return (
        db.query(AuditEventDB)
        .filter(AuditEventDB.entity_id == entity_id)
        .order_by(AuditEventDB.timestamp.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def get_recent_audit_events(db: Session, limit: int = 50, page: int = 1) -> List[AuditEventDB]:
    """Retrieves recent audit events across the platform with pagination support."""
    offset = (page - 1) * limit
    return (
        db.query(AuditEventDB)
        .order_by(AuditEventDB.timestamp.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
