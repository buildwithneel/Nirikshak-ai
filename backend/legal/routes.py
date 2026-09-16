"""
API Routes for Statutory Legal Source Traceability and Rule Registry.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Query, HTTPException, status
from .rule_registry import STATUTORY_RULES_REGISTRY, get_rule_by_id
from .sources import AUTHORITATIVE_LEGAL_SOURCES
from .rule_versions import RULE_AMENDMENTS_HISTORY

legal_router = APIRouter(prefix="/api/rules", tags=["Legal Source Traceability"])


@legal_router.get("", response_model=List[Dict[str, Any]])
async def list_statutory_rules(
    status: Optional[str] = Query(None),
    mandate: Optional[str] = Query(None),
):
    """
    Returns the complete statutory rule registry with source traceability,
    authoritative URLs, effective dates, and verification status.
    """
    results = []
    for r in STATUTORY_RULES_REGISTRY:
        if status and r.get("verification_status") != status:
            continue
        if mandate and r.get("statutory_mandate") != mandate:
            continue
        results.append(r)
    return results


@legal_router.get("/sources", response_model=Dict[str, Any])
async def list_legal_sources():
    """Returns verified statutory sources from the Ministry of Consumer Affairs and India Code."""
    return AUTHORITATIVE_LEGAL_SOURCES


@legal_router.get("/versions", response_model=List[Dict[str, Any]])
async def list_rule_amendments():
    """Returns statutory amendment version history for Legal Metrology Rules."""
    return RULE_AMENDMENTS_HISTORY


@legal_router.get("/{rule_id}", response_model=Dict[str, Any])
async def get_single_rule(rule_id: str):
    """Retrieves legal source metadata for a specific statutory rule."""
    rule = get_rule_by_id(rule_id)
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Rule {rule_id} not found in statutory registry."
        )
    return rule
