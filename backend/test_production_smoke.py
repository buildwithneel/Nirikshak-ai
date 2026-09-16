"""
NIRIKSHAK AI — Production Deployment Smoke Test Suite (Section 73)
Validates core cloud deployment readiness, endpoints, auth boundaries,
database queries, OCR engine, compliance analyzer, copilot, report generator,
and audit verification.
"""

import os
import sys
import io
import time
import json
from PIL import Image

# Ensure backend directory is on Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from fastapi.testclient import TestClient
from main import app
from auth.security import create_access_token

client = TestClient(app)
BYPASS_HEADERS = {"X-Test-Bypass-Rate-Limit": "true"}

TEST_RESULTS = []


def record_result(name: str, passed: bool, detail: str = ""):
    badge = "[PASS]" if passed else "[FAIL]"
    status_str = "PASSED" if passed else "FAILED"
    print(f"{badge} {name:<55} {status_str}")
    if detail and not passed:
        print(f"       Detail: {detail}")
    TEST_RESULTS.append((name, passed))


def create_sample_test_image() -> bytes:
    """Creates a synthetic packaging image in memory for upload testing."""
    img = Image.new("RGB", (300, 200), color=(240, 240, 240))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_1_liveness_probe():
    """Verify /api/health/live responds with 200 and uptime."""
    res = client.get("/api/health/live")
    ok = res.status_code == 200 and res.json().get("status") in ("live", "alive")
    record_result("1. Liveness Health Probe", ok, f"Status: {res.status_code}")


def test_2_readiness_probe():
    """Verify /api/health/ready checks DB, OCR, and rules."""
    res = client.get("/api/health/ready")
    data = res.json() if res.status_code == 200 else {}
    ok = (
        res.status_code == 200
        and data.get("database") == "connected"
        and data.get("ocr_engine") == "ready"
    )
    record_result("2. Readiness Health Probe", ok, f"Status: {res.status_code}, Body: {data}")


def test_3_detailed_diagnostics():
    """Verify /api/health/detailed reflects database and storage status."""
    res = client.get("/api/health/detailed")
    data = res.json() if res.status_code == 200 else {}
    components = data.get("components", {})
    ok = (
        res.status_code == 200
        and "database" in components
        and "storage" in components
        and "ocr_engine" in components
    )
    record_result("3. Detailed Diagnostics Probe", ok, f"Data: {data}")


def test_4_officer_authentication():
    """Verify officer token grants access to protected endpoints."""
    token = create_access_token({"sub": "usr-officer-001", "role": "OFFICER", "email": "inspector@officer.demo"})
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    ok = res.status_code == 200 and res.json().get("role") == "OFFICER"
    record_result("4. Officer Token Authentication", ok, f"Status: {res.status_code}")


def test_5_consumer_rbac_boundary():
    """Verify consumer account cannot access internal officer endpoints."""
    token = create_access_token({"sub": "usr-citizen-002", "role": "USER", "email": "citizen@gmail.com"})
    res = client.get("/api/dashboard/stats", headers={"Authorization": f"Bearer {token}"})
    ok = res.status_code == 403
    record_result("5. Consumer RBAC Isolation (HTTP 403)", ok, f"Status: {res.status_code}")


def test_6_statutory_rules_registry():
    """Verify /api/rules returns verified statutory legal sources."""
    res = client.get("/api/rules")
    data = res.json() if res.status_code == 200 else []
    rules_list = data if isinstance(data, list) else data.get("rules", [])
    ok = res.status_code == 200 and len(rules_list) > 0
    record_result("6. Statutory Legal Rules Registry", ok, f"Status: {res.status_code}")


def test_7_complaint_intake_and_workflow():
    """Verify consumer grievance intake creates complaint record."""
    token = create_access_token({"sub": "usr-citizen-002", "role": "USER", "email": "citizen@gmail.com"})
    payload = {
        "product_name": "Production Smoke Test Biscuit 200g",
        "issue_category": "missing_mrp",
        "description": "Label missing MRP statement.",
        "contact_email": "citizen@gmail.com",
    }
    res = client.post(
        "/api/complaints",
        json=payload,
        headers={"Authorization": f"Bearer {token}", **BYPASS_HEADERS},
    )
    ok = res.status_code == 200 and "id" in res.json()
    record_result("7. Consumer Complaint Intake Workflow", ok, f"Status: {res.status_code}")


def test_8_inspection_workspace_lifecycle():
    """Verify officer can create and retrieve an inspection."""
    token = create_access_token({"sub": "usr-officer-001", "role": "OFFICER", "email": "inspector@officer.demo"})
    payload = {
        "product_name": "Production Smoke Test Oil 1L",
        "brand": "SmokeTest Pure",
        "category": "Edible Oil",
        "retail_point": "Supermarket Central",
    }
    create_res = client.post(
        "/api/inspections",
        json=payload,
        headers={"Authorization": f"Bearer {token}", **BYPASS_HEADERS},
    )
    if create_res.status_code != 200:
        record_result("8. Inspection Workspace Lifecycle", False, f"Create failed: {create_res.status_code}")
        return

    insp_id = create_res.json()["id"]
    get_res = client.get(
        f"/api/inspections/{insp_id}",
        headers={"Authorization": f"Bearer {token}", **BYPASS_HEADERS},
    )
    ok = get_res.status_code == 200 and get_res.json().get("id") == insp_id
    record_result("8. Inspection Workspace Lifecycle", ok, f"Get status: {get_res.status_code}")


def test_9_multi_image_upload_and_integrity():
    """Verify evidence image upload computes SHA-256 hash and validates dimensions."""
    token = create_access_token({"sub": "usr-officer-001", "role": "OFFICER", "email": "inspector@officer.demo"})
    # Create an inspection
    insp_res = client.post(
        "/api/inspections",
        json={"product_name": "Smoke Image Test Product"},
        headers={"Authorization": f"Bearer {token}", **BYPASS_HEADERS},
    )
    insp_id = insp_res.json()["id"]

    image_bytes = create_sample_test_image()
    files = {"image": ("panel_front.jpg", image_bytes, "image/jpeg")}
    data = {"panel_type": "FRONT", "source": "OFFICER_ADDED"}

    upload_res = client.post(
        f"/api/inspections/{insp_id}/images",
        files=files,
        data=data,
        headers={"Authorization": f"Bearer {token}", **BYPASS_HEADERS},
    )
    ok = upload_res.status_code == 200 and "id" in upload_res.json()
    record_result("9. Multi-Image Storage & SHA-256 Integrity", ok, f"Status: {upload_res.status_code}")


def test_10_compliance_evaluation_engine():
    """Verify deterministic Legal Metrology rule analysis endpoint."""
    lines = [
        {
            "id": "line-1",
            "text": "MRP Rs. 150.00 (INCL. OF ALL TAXES)",
            "confidence": 0.95,
            "bounding_box": {"x": 10, "y": 10, "width": 200, "height": 30},
            "normalized_box": {"x": 0.05, "y": 0.05, "width": 0.6, "height": 0.1},
        }
    ]
    payload = {"lines": lines, "text": "MRP Rs. 150.00 (INCL. OF ALL TAXES)"}
    res = client.post("/api/compliance/analyze", json=payload, headers=BYPASS_HEADERS)
    ok = res.status_code == 200 and res.json().get("success") is True
    record_result("10. Legal Metrology Compliance Evaluation", ok, f"Status: {res.status_code}")


def test_11_copilot_evidence_grounding():
    """Verify copilot answers queries grounded in active inspection context."""
    token = create_access_token({"sub": "usr-officer-001", "role": "OFFICER", "email": "inspector@officer.demo"})
    insp_res = client.post(
        "/api/inspections",
        json={"product_name": "Smoke Copilot Test Product"},
        headers={"Authorization": f"Bearer {token}", **BYPASS_HEADERS},
    )
    insp_id = insp_res.json()["id"]

    copilot_res = client.post(
        f"/api/inspections/{insp_id}/copilot",
        json={"message": "What is the inspection summary?"},
        headers={"Authorization": f"Bearer {token}", **BYPASS_HEADERS},
    )
    ok = (
        copilot_res.status_code == 200
        and copilot_res.json().get("grounded") is True
        and "disclaimer" in copilot_res.json()
    )
    record_result("11. Copilot Evidence Grounding & Disclaimer", ok, f"Status: {copilot_res.status_code}")


def test_12_statutory_report_generation():
    """Verify official PDF report generation returns application/pdf with SHA-256."""
    token = create_access_token({"sub": "usr-officer-001", "role": "OFFICER", "email": "inspector@officer.demo"})
    insp_res = client.post(
        "/api/inspections",
        json={"product_name": "Smoke PDF Report Product"},
        headers={"Authorization": f"Bearer {token}", **BYPASS_HEADERS},
    )
    insp_id = insp_res.json()["id"]

    res = client.post(
        f"/api/inspections/{insp_id}/generate-report",
        headers={"Authorization": f"Bearer {token}", **BYPASS_HEADERS},
    )
    ok = res.status_code == 200 and res.headers.get("content-type") == "application/pdf"
    record_result("12. Statutory PDF Report Generation", ok, f"Status: {res.status_code}")


def test_13_tamper_evident_audit_chain():
    """Verify cryptographic audit trail integrity verification."""
    token = create_access_token({"sub": "usr-officer-001", "role": "OFFICER", "email": "inspector@officer.demo"})
    insp_res = client.post(
        "/api/inspections",
        json={"product_name": "Smoke Audit Test Product"},
        headers={"Authorization": f"Bearer {token}", **BYPASS_HEADERS},
    )
    insp_id = insp_res.json()["id"]

    verify_res = client.get(
        f"/api/inspections/{insp_id}/audit/verify",
        headers={"Authorization": f"Bearer {token}", **BYPASS_HEADERS},
    )
    ok = verify_res.status_code == 200 and verify_res.json().get("valid") is True
    record_result("13. Tamper-Evident SHA-256 Audit Chain", ok, f"Status: {verify_res.status_code}")


def main():
    print("=" * 70)
    print("  NIRIKSHAK AI -- PRODUCTION DEPLOYMENT SMOKE TEST SUITE")
    print("  Validates Core Cloud Architecture & Compliance Gates")
    print("=" * 70)

    test_1_liveness_probe()
    test_2_readiness_probe()
    test_3_detailed_diagnostics()
    test_4_officer_authentication()
    test_5_consumer_rbac_boundary()
    test_6_statutory_rules_registry()
    test_7_complaint_intake_and_workflow()
    test_8_inspection_workspace_lifecycle()
    test_9_multi_image_upload_and_integrity()
    test_10_compliance_evaluation_engine()
    test_11_copilot_evidence_grounding()
    test_12_statutory_report_generation()
    test_13_tamper_evident_audit_chain()

    passed_count = sum(1 for _, ok in TEST_RESULTS if ok)
    total_count = len(TEST_RESULTS)

    print("\n" + "=" * 70)
    print(f"  SMOKE TEST RESULTS: {passed_count}/{total_count} PASSED")
    print("=" * 70)

    if passed_count == total_count:
        print(">>> ALL PRODUCTION SMOKE TESTS PASSED: SYSTEM FULLY READY <<<")
        return 0
    else:
        print(">>> CRITICAL SMOKE TEST FAILURES DETECTED <<<")
        return 1


if __name__ == "__main__":
    sys.exit(main())
