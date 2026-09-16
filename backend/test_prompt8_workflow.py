"""
NIRIKSHAK AI — PROMPT 8 AUTOMATED WORKFLOW TEST SUITE
Validates end-to-end Complaint-to-Inspection lifecycle, cloud persistence,
officer workspace, physical observations, verification decisions, audit timeline,
and consumer privacy boundaries.
"""

import os
import sys
import json
from fastapi.testclient import TestClient

# Ensure backend directory is on Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from main import app
from database.connection import get_db, SessionLocal
from database.models import UserDB, ComplaintDB, InspectionDB

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

client = TestClient(app)

def run_all_tests():
    print("=================================================================")
    print("   NIRIKSHAK AI -- PROMPT 8 VERIFICATION & COMPLIANCE SUITE      ")
    print("=================================================================\n")

    test_results = []

    def report(name, passed, detail=""):
        status = "PASSED" if passed else "FAILED"
        icon = "[PASS]" if passed else "[FAIL]"
        print(f"{icon} {name:60} {status}")
        if detail and not passed:
            print(f"    --> Error Detail: {detail}")
        test_results.append((name, passed))

    # Test 1: Health Check
    try:
        r = client.get("/api/health")
        report("1. Health Check Endpoint (/api/health)", r.status_code == 200 and r.json().get("status") == "healthy")
    except Exception as e:
        report("1. Health Check Endpoint (/api/health)", False, str(e))

    # Test 2: Officer Login
    officer_token = None
    try:
        r = client.post("/api/auth/login", json={
            "email": "inspector@officer.demo",
            "password": "Officer@2026!"
        })
        passed = r.status_code == 200 and "access_token" in r.json() and r.json()["user"]["role"] == "OFFICER"
        if passed:
            officer_token = r.json()["access_token"]
        report("2. Officer Authentication & JWT Issuance", passed, r.text)
    except Exception as e:
        report("2. Officer Authentication & JWT Issuance", False, str(e))

    # Test 3: Consumer Login
    consumer_token = None
    try:
        r = client.post("/api/auth/login", json={
            "email": "citizen@gmail.com",
            "password": "Citizen@2026!"
        })
        passed = r.status_code == 200 and "access_token" in r.json() and r.json()["user"]["role"] == "USER"
        if passed:
            consumer_token = r.json()["access_token"]
        report("3. Consumer Authentication & JWT Issuance", passed, r.text)
    except Exception as e:
        report("3. Consumer Authentication & JWT Issuance", False, str(e))

    officer_headers = {"Authorization": f"Bearer {officer_token}"} if officer_token else {}
    consumer_headers = {"Authorization": f"Bearer {consumer_token}"} if consumer_token else {}

    # Test 4: Consumer Submits Grievance
    complaint_id = None
    complaint_ref = None
    try:
        r = client.post("/api/complaints", headers=consumer_headers, json={
            "product_name": "Probiotic Dairy Drink 200ml",
            "issue_category": "missing_mrp",
            "description": "Printed label does not indicate Maximum Retail Price (MRP inclusive of all taxes).",
            "product_description": "Fermented milk beverage",
            "contact_email": "citizen@gmail.com"
        })
        passed = r.status_code == 200 and "id" in r.json() and r.json()["status"] == "SUBMITTED"
        if passed:
            complaint_id = r.json()["id"]
            complaint_ref = r.json()["complaint_reference"]
        report("4. Consumer Grievance Submission (POST /api/complaints)", passed, r.text)
    except Exception as e:
        report("4. Consumer Grievance Submission (POST /api/complaints)", False, str(e))

    # Test 5: Consumer Lists Own Grievances
    try:
        r = client.get("/api/complaints", headers=consumer_headers)
        data = r.json()
        passed = r.status_code == 200 and isinstance(data, list) and all(c["consumer_email"] == "citizen@gmail.com" for c in data)
        report("5. Consumer Grievance Privacy Boundary (/api/complaints)", passed, f"Count: {len(data) if isinstance(data, list) else 0}")
    except Exception as e:
        report("5. Consumer Grievance Privacy Boundary (/api/complaints)", False, str(e))

    # Test 6: Officer Lists All Complaints
    try:
        r = client.get("/api/complaints", headers=officer_headers)
        data = r.json()
        passed = r.status_code == 200 and isinstance(data, list) and len(data) >= 1
        report("6. Officer Global Grievance Inbox Access", passed, f"Total complaints: {len(data) if isinstance(data, list) else 0}")
    except Exception as e:
        report("6. Officer Global Grievance Inbox Access", False, str(e))

    # Test 7: Officer Updates Complaint Status & Notes
    try:
        r = client.patch(f"/api/complaints/{complaint_id}/status", headers=officer_headers, json={
            "status": "UNDER_REVIEW",
            "officer_notes": "Preliminary examination confirms missing declaration. Authorizing field verification."
        })
        passed = r.status_code == 200 and r.json()["status"] == "UNDER_REVIEW" and "Authorizing field verification" in r.json()["officer_notes"]
        report("7. Officer Preliminary Assessment & Notes (PATCH)", passed, r.text)
    except Exception as e:
        report("7. Officer Preliminary Assessment & Notes (PATCH)", False, str(e))

    # Test 8: Citizen Accesses Grievance Details
    try:
        r = client.get(f"/api/complaints/{complaint_id}", headers=consumer_headers)
        passed = r.status_code == 200 and r.json()["id"] == complaint_id and r.json()["status"] == "UNDER_REVIEW"
        report("8. Citizen Case Tracking Detail Access", passed, r.text)
    except Exception as e:
        report("8. Citizen Case Tracking Detail Access", False, str(e))

    # Test 9: Officer Initiates Formal Inspection from Grievance
    inspection_id = None
    inspection_ref = None
    try:
        r = client.post(f"/api/complaints/{complaint_id}/initiate-inspection", headers=officer_headers)
        passed = r.status_code == 200 and "id" in r.json() and "inspection_reference" in r.json()
        if passed:
            inspection_id = r.json()["id"]
            inspection_ref = r.json()["inspection_reference"]
        report("9. Initiate Formal Inspection from Grievance (POST)", passed, r.text)
    except Exception as e:
        report("9. Initiate Formal Inspection from Grievance (POST)", False, str(e))

    # Test 10: Verify Grievance Linked to Inspection
    try:
        r = client.get(f"/api/complaints/{complaint_id}", headers=officer_headers)
        passed = (
            r.status_code == 200
            and r.json()["linked_inspection_id"] == inspection_id
            and r.json()["status"] in ["INSPECTION_SCHEDULED", "INSPECTION_IN_PROGRESS"]
        )
        report("10. Grievance-to-Inspection Relational Linkage", passed, r.text)
    except Exception as e:
        report("10. Grievance-to-Inspection Relational Linkage", False, str(e))

    # Test 11: Officer Inspection Workspace Dossier Retrieval
    try:
        r = client.get(f"/api/inspections/{inspection_id}", headers=officer_headers)
        data = r.json()
        passed = r.status_code == 200 and data["id"] == inspection_id and data["complaint_id"] == complaint_id
        report("11. Officer Inspection Workspace Dossier Retrieval", passed, r.text)
    except Exception as e:
        report("11. Officer Inspection Workspace Dossier Retrieval", False, str(e))

    # Test 12: Save AI OCR & Compliance Analysis to Inspection
    try:
        mock_declarations = {
            "mrp": {"key": "mrp", "label": "Maximum Retail Price (MRP)", "detected_value": None, "status": "missing", "confidence": 0.0},
            "net_quantity": {"key": "net_quantity", "label": "Net Quantity", "detected_value": "200 ml", "status": "detected", "confidence": 0.96},
            "mfg_date": {"key": "mfg_date", "label": "Date of Manufacture", "detected_value": "08/2026", "status": "detected", "confidence": 0.92}
        }
        mock_findings = [
            {
                "rule_id": "rule-6-1-e",
                "rule_reference": "Rule 6(1)(e)",
                "statutory_title": "Maximum Retail Price (MRP)",
                "status": "POTENTIAL_VIOLATION",
                "reason": "Statutory MRP declaration is missing from package surface."
            }
        ]
        r = client.post(f"/api/inspections/{inspection_id}/analysis", headers=officer_headers, json={
            "ocr_text": "PROBIOTIC MILK DRINK NET QTY 200ml MFG 08/2026",
            "ocr_lines_json": json.dumps([{"text": "PROBIOTIC MILK DRINK"}, {"text": "NET QTY 200ml"}]),
            "declarations_json": json.dumps(mock_declarations),
            "statutory_findings_json": json.dumps(mock_findings),
            "compliance_score": 67,
            "ocr_processing_time_ms": 320.5
        })
        passed = r.status_code == 200 and r.json().get("success") is True
        report("12. AI OCR & Compliance Analysis Storage (POST)", passed, r.text)
    except Exception as e:
        report("12. AI OCR & Compliance Analysis Storage (POST)", False, str(e))

    # Test 13: Record Human Officer Physical Observations
    try:
        r = client.post(f"/api/inspections/{inspection_id}/observations", headers=officer_headers, json={
            "category": "LABEL_INTEGRITY",
            "observation": "Retailer sticker placed over statutory print area. Absence of printed MRP confirmed by tactile examination."
        })
        passed = r.status_code == 200 and "id" in r.json() and r.json()["category"] == "LABEL_INTEGRITY"
        report("13. Record Physical Officer Observation (POST)", passed, r.text)
    except Exception as e:
        report("13. Record Physical Officer Observation (POST)", False, str(e))

    # Test 14: Human Officer Legal Verification & Decision (Checklist enforced)
    try:
        r = client.post(f"/api/inspections/{inspection_id}/verify", headers=officer_headers, json={
            "reviewed_ai_findings": True,
            "reviewed_visual_evidence": True,
            "recorded_physical_observations": True,
            "verification_decision": "CONFIRM_VIOLATION",
            "statutory_action": "NOTICE_SECTION_39",
            "officer_justification": "Verified commodity packaging violates Rule 6(1)(e) of Legal Metrology (Packaged Commodities) Rules 2011. Notice issued under Section 39."
        })
        passed = r.status_code == 200 and r.json().get("verification_decision") == "CONFIRM_VIOLATION"
        report("14. Human Officer Legal Verification Protocol (POST)", passed, r.text)
    except Exception as e:
        report("14. Human Officer Legal Verification Protocol (POST)", False, str(e))

    # Test 15: Verify Inspection State Machine Transition to VERIFIED
    try:
        r = client.get(f"/api/inspections/{inspection_id}", headers=officer_headers)
        data = r.json()
        passed = r.status_code == 200 and data["status"] == "VERIFIED"
        report("15. State Machine Transition to VERIFIED", passed, f"Status: {data.get('status')}, State: {data.get('verification_state')}")
    except Exception as e:
        report("15. State Machine Transition to VERIFIED", False, str(e))

    # Test 16: Retrieve Immutable Audit Timeline
    try:
        r = client.get(f"/api/inspections/{inspection_id}/audit", headers=officer_headers)
        logs = r.json()
        passed = r.status_code == 200 and isinstance(logs, list) and len(logs) >= 3
        actions = [l["action"] for l in logs] if isinstance(logs, list) else []
        report("16. Immutable Audit Timeline (/audit)", passed, f"Events: {actions}")
    except Exception as e:
        report("16. Immutable Audit Timeline (/audit)", False, str(e))

    # Test 17: Generate Statutory ReportLab PDF Report
    try:
        r = client.post(f"/api/inspections/{inspection_id}/generate-report", headers=officer_headers)
        passed = r.status_code == 200 and r.headers.get("content-type") == "application/pdf" and len(r.content) > 1000
        report("17. Statutory ReportLab PDF Report Generation", passed, f"PDF bytes: {len(r.content)}")
    except Exception as e:
        report("17. Statutory ReportLab PDF Report Generation", False, str(e))

    # Test 18: Notification System & Read State
    try:
        r = client.get("/api/notifications", headers=consumer_headers)
        notifs = r.json()
        passed = r.status_code == 200 and isinstance(notifs, list) and len(notifs) >= 1
        if passed and len(notifs) > 0:
            notif_id = notifs[0]["id"]
            client.patch(f"/api/notifications/{notif_id}/read", headers=consumer_headers)
        report("18. Notification Dispatch & Read Receipt", passed, f"Notif count: {len(notifs) if isinstance(notifs, list) else 0}")
    except Exception as e:
        report("18. Notification Dispatch & Read Receipt", False, str(e))

    # Test 19: Live Dashboard Aggregations
    try:
        r = client.get("/api/dashboard/stats", headers=officer_headers)
        stats = r.json()
        passed = r.status_code == 200 and stats.get("total_complaints", 0) >= 1 and stats.get("total_inspections", 0) >= 1
        report("19. Live Database Dashboard Aggregations (/dashboard/stats)", passed, json.dumps(stats))
    except Exception as e:
        report("19. Live Database Dashboard Aggregations (/dashboard/stats)", False, str(e))

    # Test 20: Global Registry Search
    try:
        r = client.get("/api/dashboard/search?q=Probiotic", headers=officer_headers)
        results = r.json()
        passed = r.status_code == 200 and isinstance(results, list) and len(results) >= 1
        report("20. Global Multi-Entity Registry Search (/dashboard/search)", passed, f"Matches: {len(results) if isinstance(results, list) else 0}")
    except Exception as e:
        report("20. Global Multi-Entity Registry Search (/dashboard/search)", False, str(e))

    print("\n-----------------------------------------------------------------")
    passed_count = sum(1 for _, p in test_results if p)
    total_count = len(test_results)
    print(f"RESULTS: {passed_count}/{total_count} tests PASSED ({round(passed_count/total_count*100)}% compliance)")
    print("-----------------------------------------------------------------")

    return passed_count == total_count

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
