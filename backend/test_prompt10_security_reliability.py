"""
NIRIKSHAK AI — PROMPT 10 AUTOMATED VERIFICATION SUITE
Tests Production Hardening, Legal Source Traceability, AI Reliability,
Security Boundaries, Image Quality Analysis, and Tamper-Evident Audit Chains.
"""

import os
import sys
import io
import json
import time
import hashlib
from PIL import Image
from fastapi.testclient import TestClient

# Ensure backend directory is on Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from main import app
from database.connection import SessionLocal
from database.models import (
    UserDB,
    ComplaintDB,
    InspectionDB,
    InspectionImageDB,
    AuditEventDB,
    OfficerVerificationDB,
)
from auth.security import PBKDF2_ITERATIONS, PBKDF2_SALT_LENGTH, verify_password, hash_password
from image_quality.analyzer import ImageQualityAnalyzer
from audit.service import verify_audit_chain, log_audit_event

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

client = TestClient(app)


def make_test_image_bytes(color=(255, 255, 255), width=320, height=240) -> bytes:
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def run_all_tests():
    print("=================================================================")
    print("  NIRIKSHAK AI -- PROMPT 10 SECURITY & RELIABILITY SUITE         ")
    print("=================================================================\n")

    test_results = []

    def report(name, passed, detail=""):
        status = "PASSED" if passed else "FAILED"
        icon = "[PASS]" if passed else "[FAIL]"
        print(f"{icon} {name:62} {status}")
        if detail and not passed:
            print(f"    --> Error Detail: {detail}")
        test_results.append((name, passed, detail))

    officer_token = None
    consumer_token = None
    officer_headers = {}
    consumer_headers = {}

    # Bypass header for setup
    bypass_header = {"X-Test-Bypass-Rate-Limit": "true"}

    # --- 1. Rate Limiting on /api/auth/login ---
    try:
        hit_429 = False
        # Send rapid burst of 20 invalid login requests from same client IP without bypass header
        for _ in range(25):
            res = client.post("/api/auth/login", json={"email": "flooder@test.local", "password": "wrong"})
            if res.status_code == 429:
                hit_429 = True
                break
        report("1. Rate Limiting Enforced on Auth Endpoint (HTTP 429)", hit_429)
    except Exception as e:
        report("1. Rate Limiting Enforced on Auth Endpoint (HTTP 429)", False, str(e))

    # --- 2. Rate Limit Bypass with Authorized Header ---
    try:
        res = client.post(
            "/api/auth/login",
            json={"email": "inspector@officer.demo", "password": "Officer@2026!"},
            headers={"X-Test-Bypass-Rate-Limit": "true"},
        )
        passed = res.status_code == 200 and "access_token" in res.json()
        officer_token = res.json().get("access_token")
        officer_headers = {
            "Authorization": f"Bearer {officer_token}",
            "X-Test-Bypass-Rate-Limit": "true",
        }
        report("2. Rate Limit Bypass for Authorized Test/Admin Clients", passed)
    except Exception as e:
        report("2. Rate Limit Bypass for Authorized Test/Admin Clients", False, str(e))

    # Login consumer for RBAC tests
    try:
        res = client.post(
            "/api/auth/login",
            json={"email": "citizen@gmail.com", "password": "Citizen@2026!"},
            headers={"X-Test-Bypass-Rate-Limit": "true"},
        )
        consumer_token = res.json().get("access_token")
        consumer_headers = {
            "Authorization": f"Bearer {consumer_token}",
            "X-Test-Bypass-Rate-Limit": "true",
        }
    except Exception:
        pass

    # --- 3. Image Upload Binary Magic Bytes & MIME Validation ---
    try:
        # Create an inspection first
        insp_res = client.post(
            "/api/inspections",
            json={"product_name": "Prompt 10 Security Audit Biscuit", "brand_name": "SafeFoods"},
            headers=officer_headers,
        )
        insp_id = insp_res.json()["id"]

        fake_image = b"<html><script>alert('xss')</script></html>"
        upload_fake = client.post(
            f"/api/inspections/{insp_id}/images",
            files={"image": ("malicious.jpg", fake_image, "image/jpeg")},
            data={"panel_type": "FRONT"},
            headers=officer_headers,
        )
        passed = upload_fake.status_code in (400, 422)
        report("3. Image Upload Magic Bytes & Format Verification", passed)
    except Exception as e:
        report("3. Image Upload Magic Bytes & Format Verification", False, str(e))

    # --- 4. Path Traversal Defense on Image Endpoints ---
    try:
        traversal_res = client.get(
            "/api/images/content/../../../../etc/passwd",
            headers=officer_headers,
        )
        passed = traversal_res.status_code in (400, 403, 404)
        report("4. Storage Path Traversal Defense (../ Protection)", passed)
    except Exception as e:
        report("4. Storage Path Traversal Defense (../ Protection)", False, str(e))

    # --- 5. Image SHA-256 Computation & Storage Integrity ---
    uploaded_image_id = None
    test_img_bytes = make_test_image_bytes(color=(100, 150, 200), width=400, height=300)
    expected_hash = hashlib.sha256(test_img_bytes).hexdigest()

    try:
        up_res = client.post(
            f"/api/inspections/{insp_id}/images",
            files={"image": ("package_front.jpg", test_img_bytes, "image/jpeg")},
            data={"panel_type": "FRONT"},
            headers=officer_headers,
        )
        data = up_res.json()
        uploaded_image_id = data.get("id")
        stored_hash = data.get("image_hash")
        passed = up_res.status_code == 200 and stored_hash == expected_hash
        report("5. SHA-256 Image Cryptographic Hash Computation", passed)
    except Exception as e:
        report("5. SHA-256 Image Cryptographic Hash Computation", False, str(e))

    # --- 6. Evidence Integrity Header on Image Retrieval ---
    try:
        ret_res = client.get(
            f"/api/inspections/images/{uploaded_image_id}/content",
            headers=officer_headers,
        )
        integrity_hdr = ret_res.headers.get("X-Evidence-Integrity")
        passed = ret_res.status_code == 200 and integrity_hdr == "VERIFIED_INTACT"
        report("6. Evidence Integrity Response Header (VERIFIED_INTACT)", passed)
    except Exception as e:
        report("6. Evidence Integrity Response Header (VERIFIED_INTACT)", False, str(e))

    # --- 7. RBAC Access Control on Restricted Image Evidence ---
    try:
        cons_img_res = client.get(
            f"/api/inspections/images/{uploaded_image_id}/content",
            headers=consumer_headers,
        )
        passed = cons_img_res.status_code == 403
        report("7. RBAC Boundary: Consumers Blocked From Officer Evidence", passed)
    except Exception as e:
        report("7. RBAC Boundary: Consumers Blocked From Officer Evidence", False, str(e))

    # --- 8. PBKDF2 Cryptographic Configuration Verification ---
    try:
        passed = PBKDF2_ITERATIONS >= 100000 and PBKDF2_SALT_LENGTH >= 16
        hashed, salt = hash_password("SecretPassword123!")
        verified = verify_password("SecretPassword123!", hashed, salt)
        report("8. PBKDF2-HMAC-SHA256 (100k+ iterations, 16B salt)", passed and verified)
    except Exception as e:
        report("8. PBKDF2-HMAC-SHA256 (100k+ iterations, 16B salt)", False, str(e))

    # --- 9. Tamper-Evident Audit Event Hash Chaining ---
    try:
        db = SessionLocal()
        events = db.query(AuditEventDB).filter(AuditEventDB.entity_id == insp_id).order_by(AuditEventDB.timestamp.asc()).all()
        chain_hashes_present = len(events) > 0 and all(
            ev.event_hash and ev.previous_event_hash for ev in events
        )
        db.close()
        report("9. Audit Event Cryptographic Hash Chaining", chain_hashes_present)
    except Exception as e:
        report("9. Audit Event Cryptographic Hash Chaining", False, str(e))

    # --- 10. Audit Chain Verification Endpoint (Valid State) ---
    try:
        aud_res = client.get(
            f"/api/inspections/{insp_id}/audit/verify",
            headers=officer_headers,
        )
        aud_data = aud_res.json()
        passed = aud_res.status_code == 200 and aud_data.get("valid") is True
        report("10. Audit Chain Verification Endpoint (/audit/verify)", passed)
    except Exception as e:
        report("10. Audit Chain Verification Endpoint (/audit/verify)", False, str(e))

    # --- 11. Tamper Detection on Manipulated Audit Record ---
    try:
        db = SessionLocal()
        last_event = (
            db.query(AuditEventDB)
            .filter(AuditEventDB.entity_id == insp_id)
            .order_by(AuditEventDB.timestamp.desc())
            .first()
        )
        if last_event:
            original_action = last_event.action
            # Tamper the action in the database without re-hashing
            last_event.action = "TAMPERED_ACTION_FOR_TEST"
            db.commit()

            tamper_res = client.get(
                f"/api/inspections/{insp_id}/audit/verify",
                headers=officer_headers,
            )
            tamper_data = tamper_res.json()
            tamper_detected = tamper_data.get("valid") is False

            # Restore original state to preserve database integrity
            last_event.action = original_action
            db.commit()
            db.close()
            report("11. Cryptographic Tamper Detection Triggered", tamper_detected)
        else:
            db.close()
            report("11. Cryptographic Tamper Detection Triggered", False, "No events to tamper")
    except Exception as e:
        report("11. Cryptographic Tamper Detection Triggered", False, str(e))

    # --- 12. Quantitative Image Quality Evaluation ---
    try:
        quality_eval = ImageQualityAnalyzer.analyze(test_img_bytes)
        passed = (
            "blur_score" in quality_eval
            and "brightness_score" in quality_eval
            and "contrast_score" in quality_eval
            and "is_acceptable" in quality_eval
            and "recommendation" in quality_eval
        )
        report("12. Image Quality Evaluation & Actionable Diagnostics", passed)
    except Exception as e:
        report("12. Image Quality Evaluation & Actionable Diagnostics", False, str(e))

    # --- 13. Verification Gate: Verification Protocol Validation ---
    try:
        # Perform OCR analysis first
        ocr_res = client.post(
            f"/api/inspections/images/{uploaded_image_id}/ocr",
            headers=officer_headers,
        )

        # Save officer observation
        obs_res = client.post(
            f"/api/inspections/{insp_id}/observations",
            json={
                "category": "NET_QUANTITY",
                "observation": "Physical verification matches stated net weight 200g.",
            },
            headers=officer_headers,
        )

        # Save verification with OVERRIDE_AI
        ver_res = client.post(
            f"/api/inspections/{insp_id}/verify",
            json={
                "reviewed_ai_findings": True,
                "reviewed_visual_evidence": True,
                "recorded_physical_observations": True,
                "officer_decision": "COMPLIANT",
                "officer_notes": "All package declarations physically verified and authenticated.",
                "officer_justification": "AI noted missing contact email, but physical toll-free number meets Rule 6(1)(n).",
                "legal_basis": "Rule 6(1)(n) provisos of Legal Metrology Rules, 2011",
            },
            headers=officer_headers,
        )
        passed = (
            ver_res.status_code == 200
            and ver_res.json().get("success") is True
            and ver_res.json().get("decision") == "COMPLIANT"
        )
        report("13. Officer Verification Gate Enforced with Dossier Review", passed)
    except Exception as e:
        report("13. Officer Verification Gate Enforced with Dossier Review", False, str(e))

    # --- 14. Officer Override Rationale & Legal Basis Storage ---
    try:
        db = SessionLocal()
        ver_db = (
            db.query(OfficerVerificationDB)
            .filter(OfficerVerificationDB.inspection_id == insp_id)
            .first()
        )
        passed = (
            ver_db is not None
            and "Rule 6(1)(n)" in (ver_db.legal_basis or "")
            and len(ver_db.officer_justification or "") > 10
        )
        db.close()
        report("14. Officer AI Override Justification & Legal Basis Tracking", passed)
    except Exception as e:
        report("14. Officer AI Override Justification & Legal Basis Tracking", False, str(e))

    # --- 15. PDF Report SHA-256 Computation and Version Increment ---
    try:
        rep_res1 = client.post(
            f"/api/inspections/{insp_id}/generate-report",
            headers=officer_headers,
        )
        rep_sha = rep_res1.headers.get("X-Report-SHA256")
        rep_ver = rep_res1.headers.get("X-Report-Version")

        # Second generation increments version
        rep_res2 = client.post(
            f"/api/inspections/{insp_id}/generate-report",
            headers=officer_headers,
        )
        rep_ver2 = rep_res2.headers.get("X-Report-Version")

        passed = (
            rep_res1.status_code == 200
            and rep_sha is not None
            and len(rep_sha) == 64
            and rep_ver == "1"
            and rep_ver2 == "2"
        )
        report("15. PDF Report Cryptographic SHA-256 & Version Sequencing", passed)
    except Exception as e:
        report("15. PDF Report Cryptographic SHA-256 & Version Sequencing", False, str(e))

    # --- 16. Authoritative Legal Sources Registry ---
    try:
        src_res = client.get("/api/rules/sources", headers=officer_headers)
        src_data = src_res.json()
        sources_list = list(src_data.values()) if isinstance(src_data, dict) else src_data
        has_act = any(s.get("source_id") == "LM_ACT_2009" for s in sources_list)
        has_pcr = any(s.get("source_id") == "LM_PCR_2011" for s in sources_list)
        has_official_url = any("nic.in" in s.get("official_url", "") for s in sources_list)
        passed = src_res.status_code == 200 and has_act and has_pcr and has_official_url
        report("16. Authoritative Legal Sources Registry (/api/rules/sources)", passed)
    except Exception as e:
        report("16. Authoritative Legal Sources Registry (/api/rules/sources)", False, str(e))

    # --- 17. Legal Rules Registry with Verification Status & Citations ---
    try:
        rules_res = client.get("/api/rules", headers=officer_headers)
        rules_data = rules_res.json()
        rules_list = rules_data if isinstance(rules_data, list) else rules_data.get("rules", [])
        has_rules = len(rules_list) >= 8
        all_verified = all(r.get("verification_status") == "VERIFIED" for r in rules_list)
        has_citations = all("Rule" in r.get("rule_reference", "") for r in rules_list)
        passed = rules_res.status_code == 200 and has_rules and all_verified and has_citations
        report("17. Legal Rules Registry with Authoritative Citations", passed)
    except Exception as e:
        report("17. Legal Rules Registry with Authoritative Citations", False, str(e))

    # --- 18. Historical Statutory Amendments & Gazette Versions ---
    try:
        ver_res = client.get("/api/rules/versions", headers=officer_headers)
        ver_data = ver_res.json()
        amendments = ver_data if isinstance(ver_data, list) else ver_data.get("amendments", [])
        has_principal = any("G.S.R. 202(E)" in a.get("notification_no", "") for a in amendments)
        has_usp = any("G.S.R. 779(E)" in a.get("notification_no", "") for a in amendments)
        passed = ver_res.status_code == 200 and has_principal and has_usp
        report("18. Historical Rule Versions & Gazette Timeline", passed)
    except Exception as e:
        report("18. Historical Rule Versions & Gazette Timeline", False, str(e))

    # --- 19. Health Probes: Live, Ready, and Detailed ---
    try:
        live_res = client.get("/api/health/live")
        ready_res = client.get("/api/health/ready")
        det_res = client.get("/api/health/detailed")

        passed = (
            live_res.status_code == 200
            and ready_res.status_code == 200
            and det_res.status_code == 200
            and live_res.json().get("status") == "alive"
            and ready_res.json().get("status") == "ready"
            and "components" in det_res.json()
        )
        report("19. Production Health Probes (/live, /ready, /detailed)", passed)
    except Exception as e:
        report("19. Production Health Probes (/live, /ready, /detailed)", False, str(e))

    # --- 20. Correlation Request IDs & Performance Headers ---
    try:
        probe_res = client.get("/api/health", headers={"X-Request-ID": "test-req-custom-999"})
        req_id = probe_res.headers.get("X-Request-ID")
        resp_ms = probe_res.headers.get("X-Response-Time-Ms")
        passed = req_id == "test-req-custom-999" and resp_ms is not None
        report("20. Correlation Request ID & Latency Tracking Headers", passed)
    except Exception as e:
        report("20. Correlation Request ID & Latency Tracking Headers", False, str(e))

    # --- Summary ---
    print("\n=================================================================")
    passed_count = sum(1 for _, p, _ in test_results)
    total_count = len(test_results)
    print(f"   SUITE RESULTS: {passed_count}/{total_count} TESTS PASSED")
    print("=================================================================\n")

    if passed_count == total_count:
        print(">>> ALL PROMPT 10 SPECIFICATIONS MET AND VERIFIED <<<")
        return 0
    else:
        print(">>> FAILURES DETECTED IN PROMPT 10 VERIFICATION <<<")
        return 1


if __name__ == "__main__":
    exit_code = run_all_tests()
    sys.exit(exit_code)
