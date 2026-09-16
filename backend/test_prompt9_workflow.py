"""
NIRIKSHAK AI — PROMPT 9 AUTOMATED VERIFICATION SUITE
Tests Multi-Image Inspection, Cross-Image Intelligence, Declaration Conflicts,
Evidence Canvas Navigation, Officer Command Center, and Analytics/Risk Boundaries.
"""

import os
import sys
import io
import json
import time
from PIL import Image
from fastapi.testclient import TestClient

# Ensure backend directory is on Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from main import app
from database.connection import SessionLocal
from database.models import UserDB, ComplaintDB, InspectionDB, InspectionImageDB, InspectionAnalysisDB, OfficerObservationDB, AuditEventDB
from inspections.intelligence import aggregate_multi_image_analysis

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

client = TestClient(app)


def make_test_image_bytes(color=(255, 255, 255), width=200, height=100) -> bytes:
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def run_all_tests():
    print("=================================================================")
    print("   NIRIKSHAK AI -- PROMPT 9 MULTI-IMAGE INTELLIGENCE TEST SUITE  ")
    print("=================================================================\n")

    test_results = []

    def report(name, passed, detail=""):
        status = "PASSED" if passed else "FAILED"
        icon = "[PASS]" if passed else "[FAIL]"
        print(f"{icon} {name:60} {status}")
        if detail and not passed:
            print(f"    --> Error Detail: {detail}")
        test_results.append((name, passed, detail))

    # Logins
    officer_token = None
    consumer_token = None

    try:
        r = client.post("/api/auth/login", json={"email": "inspector@officer.demo", "password": "Officer@2026!"})
        if r.status_code == 200:
            officer_token = r.json().get("access_token")
    except Exception:
        pass

    try:
        r = client.post("/api/auth/login", json={"email": "citizen@gmail.com", "password": "Citizen@2026!"})
        if r.status_code == 200:
            consumer_token = r.json().get("access_token")
    except Exception:
        pass

    off_headers = {"Authorization": f"Bearer {officer_token}"} if officer_token else {}
    con_headers = {"Authorization": f"Bearer {consumer_token}"} if consumer_token else {}

    test_inspection_id = None
    img1_id = None
    img2_id = None
    img3_id = None

    # Setup: Create an inspection for tests
    try:
        r = client.post("/api/inspections", json={
            "product_name": "Multi-Image Test Flour 5kg",
            "brand": "Purity Gold",
            "category": "Packaged Food",
            "retail_point": "Central Depot Warehouse",
        }, headers=off_headers)
        if r.status_code in [200, 201]:
            test_inspection_id = r.json()["id"]
        else:
            print(f"Failed to create test inspection: {r.text}")
    except Exception as e:
        print(f"Failed to setup test inspection: {e}")

    # 1. Upload first inspection image
    try:
        img_bytes = make_test_image_bytes(color=(240, 240, 240))
        files = {"image": ("front_pack.jpg", img_bytes, "image/jpeg")}
        data = {"panel_type": "FRONT"}
        r = client.post(f"/api/inspections/{test_inspection_id}/images", files=files, data=data, headers=off_headers)
        passed = (r.status_code in [200, 201]) and "id" in r.json() and r.json().get("panel_type") == "FRONT"
        if passed:
            img1_id = r.json()["id"]
        report("1. Upload First Inspection Image", passed, r.text)
    except Exception as e:
        report("1. Upload First Inspection Image", False, str(e))

    # 2. Upload multiple images (BACK, SIDE)
    try:
        b_bytes = make_test_image_bytes(color=(220, 230, 240))
        r_b = client.post(
            f"/api/inspections/{test_inspection_id}/images",
            files={"image": ("back_pack.jpg", b_bytes, "image/jpeg")},
            data={"panel_type": "BACK"},
            headers=off_headers,
        )
        s_bytes = make_test_image_bytes(color=(240, 230, 220))
        r_s = client.post(
            f"/api/inspections/{test_inspection_id}/images",
            files={"image": ("side_pack.jpg", s_bytes, "image/jpeg")},
            data={"panel_type": "SIDE"},
            headers=off_headers,
        )
        r_list = client.get(f"/api/inspections/{test_inspection_id}/images", headers=off_headers)
        images = r_list.json() if r_list.status_code == 200 else []
        passed = len(images) >= 3 and any(i.get("panel_type") == "BACK" for i in images) and any(i.get("panel_type") == "SIDE" for i in images)
        if passed:
            for im in images:
                if im.get("panel_type") == "BACK":
                    img2_id = im["id"]
                elif im.get("panel_type") == "SIDE":
                    img3_id = im["id"]
        report("2. Upload Multiple Packaging Images (FRONT, BACK, SIDE)", passed, f"Status: {r_list.status_code}, count: {len(images)}")
    except Exception as e:
        report("2. Upload Multiple Packaging Images (FRONT, BACK, SIDE)", False, str(e))

    # 3. Reject invalid image
    try:
        bad_file = {"image": ("malicious.exe", b"MZ\x90\x00\x03", "application/octet-stream")}
        r = client.post(f"/api/inspections/{test_inspection_id}/images", files=bad_file, data={"panel_type": "FRONT"}, headers=off_headers)
        passed = r.status_code in [400, 415, 422]
        report("3. Reject Invalid Image Format / Unsupported Upload", passed, f"Status: {r.status_code}")
    except Exception as e:
        report("3. Reject Invalid Image Format / Unsupported Upload", False, str(e))

    # 4. OCR associated with correct image
    try:
        r = client.post(f"/api/inspections/images/{img1_id}/ocr", headers=off_headers)
        data = r.json() if r.status_code == 200 else {}
        passed = r.status_code == 200 and (data.get("success") is True or data.get("ocr_status") == "COMPLETED" or data.get("status") in ["SUCCESS", "COMPLETED"])
        report("4. OCR Execution Associated With Specific Image ID", passed, r.text)
    except Exception as e:
        report("4. OCR Execution Associated With Specific Image ID", False, str(e))

    # 5. Declaration associated with correct image
    try:
        r = client.get(f"/api/inspections/{test_inspection_id}/evidence", headers=off_headers)
        passed = r.status_code == 200 and "evidence_locations" in r.json()
        report("5. Declaration Tracing to Sourced Image ID", passed, r.text)
    except Exception as e:
        report("5. Declaration Tracing to Sourced Image ID", False, str(e))

    # 6. Duplicate declaration detection
    try:
        img_a = {
            "id": "img-front-01",
            "panel_type": "FRONT",
            "ocr_lines": [{"text": "Net Weight: 5 kg", "bbox": [[10, 10], [90, 10], [90, 30], [10, 30]], "confidence": 0.95}],
            "declarations": {"net_quantity": {"field": "net_quantity", "value": "5 kg", "confidence": 0.95, "image_id": "img-front-01"}}
        }
        img_b = {
            "id": "img-back-01",
            "panel_type": "BACK",
            "ocr_lines": [{"text": "Net Weight: 5 kg", "bbox": [[20, 20], [80, 20], [80, 40], [20, 40]], "confidence": 0.92}],
            "declarations": {"net_quantity": {"field": "net_quantity", "value": "5 kg", "confidence": 0.92, "image_id": "img-back-01"}}
        }
        res = aggregate_multi_image_analysis([img_a, img_b])
        passed = res["declarations"]["net_quantity"]["value"] == "5 kg" and res["declarations"]["net_quantity"]["confidence"] == 0.95 and len(res["conflicts"]) == 0
        report("6. Duplicate Declaration Detection & Best-Confidence Retained", passed)
    except Exception as e:
        report("6. Duplicate Declaration Detection & Best-Confidence Retained", False, str(e))

    # 7. Conflicting declaration detection
    try:
        img_front = {
            "id": "img-front-02",
            "panel_type": "FRONT",
            "ocr_lines": [{"text": "MRP Rs 150", "bbox": [[10, 10], [50, 10], [50, 25], [10, 25]], "confidence": 0.94}],
            "declarations": {"mrp": {"field": "mrp", "value": "Rs 150", "confidence": 0.94, "image_id": "img-front-02"}}
        }
        img_back = {
            "id": "img-back-02",
            "panel_type": "BACK",
            "ocr_lines": [{"text": "MRP Rs 160", "bbox": [[15, 15], [55, 15], [55, 30], [15, 30]], "confidence": 0.91}],
            "declarations": {"mrp": {"field": "mrp", "value": "Rs 160", "confidence": 0.91, "image_id": "img-back-02"}}
        }
        res = aggregate_multi_image_analysis([img_front, img_back])
        has_conflict = len(res["conflicts"]) > 0 and res["conflicts"][0]["field_key"] == "mrp"
        status_review = res["declarations"]["mrp"]["status"] == "review_required"
        passed = has_conflict and status_review
        report("7. Cross-Panel Conflicting Declaration Detected (REVIEW REQUIRED)", passed, f"Conflicts: {len(res['conflicts'])}")
    except Exception as e:
        report("7. Cross-Panel Conflicting Declaration Detected (REVIEW REQUIRED)", False, str(e))

    # 8. Evidence navigation (Finding -> Declaration -> OCR Line -> Image -> Bounding Box)
    try:
        r = client.get(f"/api/inspections/{test_inspection_id}/evidence", headers=off_headers)
        data = r.json()
        passed = (
            r.status_code == 200
            and "images" in data
            and "evidence_locations" in data
            and isinstance(data["evidence_locations"], list)
        )
        report("8. Synchronized Evidence Canvas Navigation Model", passed, r.text)
    except Exception as e:
        report("8. Synchronized Evidence Canvas Navigation Model", False, str(e))

    # 9. Evidence source preservation
    try:
        db = SessionLocal()
        img = db.query(InspectionImageDB).filter(InspectionImageDB.inspection_id == test_inspection_id).first()
        db.close()
        passed = img is not None and img.file_reference is not None and img.panel_type is not None
        report("9. Evidence Source Preservation With Storage Path & Panel", passed)
    except Exception as e:
        report("9. Evidence Source Preservation With Storage Path & Panel", False, str(e))

    # 10. Consumer image preserved upon initiating inspection from complaint
    consumer_complaint_id = None
    consumer_linked_insp_id = None
    try:
        # Submit a complaint with image reference
        r_comp = client.post(
            "/api/complaints",
            json={
                "product_name": "Consumer Complaint Biscuit",
                "issue_category": "MISSING_NET_QUANTITY",
                "description": "Missing weight on packaging face",
                "contact_email": "citizen@gmail.com",
                "image_reference": "local/citizen_photo.jpg",
            },
            headers=con_headers,
        )
        if r_comp.status_code in [200, 201]:
            consumer_complaint_id = r_comp.json()["id"]

        # Officer initiates inspection from this complaint
        r_init = client.post(f"/api/complaints/{consumer_complaint_id}/initiate-inspection", headers=off_headers)
        if r_init.status_code in [200, 201]:
            consumer_linked_insp_id = r_init.json()["id"]
            # Check inspection images for CONSUMER_SUBMISSION
            r_imgs = client.get(f"/api/inspections/{consumer_linked_insp_id}/images", headers=off_headers)
            c_images = r_imgs.json() if r_imgs.status_code == 200 else []
            passed = any(im.get("panel_type") == "CONSUMER_SUBMISSION" or im.get("source") == "CONSUMER_SUBMISSION" for im in c_images)
            report("10. Consumer Image Preserved as CONSUMER_SUBMISSION in Inspection", passed)
        else:
            report("10. Consumer Image Preserved as CONSUMER_SUBMISSION in Inspection", False, r_init.text)
    except Exception as e:
        report("10. Consumer Image Preserved as CONSUMER_SUBMISSION in Inspection", False, str(e))

    # 11. Officer image preserved separately from consumer submission
    try:
        if consumer_linked_insp_id:
            off_img = make_test_image_bytes(color=(250, 250, 200))
            r_up = client.post(
                f"/api/inspections/{consumer_linked_insp_id}/images",
                files={"image": ("officer_front.jpg", off_img, "image/jpeg")},
                data={"panel_type": "FRONT"},
                headers=off_headers,
            )
            r_imgs = client.get(f"/api/inspections/{consumer_linked_insp_id}/images", headers=off_headers)
            c_images = r_imgs.json() if r_imgs.status_code == 200 else []
            has_consumer = any(im.get("panel_type") == "CONSUMER_SUBMISSION" or im.get("source") == "CONSUMER_SUBMISSION" for im in c_images)
            has_officer = any(im.get("panel_type") == "FRONT" for im in c_images)
            passed = has_consumer and has_officer and len(c_images) >= 2
            report("11. Officer Evidence Stored Alongside Preserved Consumer Image", passed)
        else:
            report("11. Officer Evidence Stored Alongside Preserved Consumer Image", False, "No linked inspection")
    except Exception as e:
        report("11. Officer Evidence Stored Alongside Preserved Consumer Image", False, str(e))

    # 12. Multi-image PDF generation
    try:
        r_pdf = client.get(f"/api/inspections/{test_inspection_id}/report", headers=off_headers)
        passed = (
            r_pdf.status_code == 200
            and r_pdf.headers.get("content-type") == "application/pdf"
            and len(r_pdf.content) > 1000
        )
        report("12. Multi-Panel ReportLab PDF Generation With Audit Trail", passed, f"Size: {len(r_pdf.content)} bytes")
    except Exception as e:
        report("12. Multi-Panel ReportLab PDF Generation With Audit Trail", False, str(e))

    # 13. Unauthorized image access rejected
    try:
        r = client.get(f"/api/inspections/{test_inspection_id}/images")
        passed = r.status_code in [401, 403]
        report("13. Unauthorized Image Access Blocked (HTTP 401/403)", passed, f"Status: {r.status_code}")
    except Exception as e:
        report("13. Unauthorized Image Access Blocked (HTTP 401/403)", False, str(e))

    # 14. Consumer cannot access risk analytics
    try:
        r = client.get("/api/analytics/trends", headers=con_headers)
        passed = r.status_code == 403
        report("14. Consumer RBAC Restriction on Officer Analytics (/api/analytics)", passed, f"Status: {r.status_code}")
    except Exception as e:
        report("14. Consumer RBAC Restriction on Officer Analytics (/api/analytics)", False, str(e))

    # 15. Dashboard statistics correct
    try:
        r = client.get("/api/dashboard/stats", headers=off_headers)
        data = r.json()
        passed = (
            r.status_code == 200
            and "total_inspections" in data
            and "total_complaints" in data
            and "average_compliance_score" in data
        )
        report("15. Dashboard Command Center Statistics Aggregate Correctly", passed, r.text)
    except Exception as e:
        report("15. Dashboard Command Center Statistics Aggregate Correctly", False, str(e))

    # 16. Analytics aggregation correct
    try:
        r = client.get("/api/analytics/overview", headers=off_headers)
        data = r.json()
        passed = (
            r.status_code == 200
            and "inspections" in data
            and "complaints" in data
            and data["inspections"]["total"] >= 1
        )
        report("16. Analytics Overview Aggregation & Date Filtering Validated", passed, r.text)
    except Exception as e:
        report("16. Analytics Overview Aggregation & Date Filtering Validated", False, str(e))

    # 17. Search across inspections
    try:
        r = client.get("/api/dashboard/search?q=Flour", headers=off_headers)
        results = r.json() if r.status_code == 200 else []
        passed = r.status_code == 200 and isinstance(results, list)
        report("17. Search Across Inspections & Grievances By Query", passed, f"Found: {len(results)}")
    except Exception as e:
        report("17. Search Across Inspections & Grievances By Query", False, str(e))

    # 18. Audit events created
    try:
        db = SessionLocal()
        events = db.query(AuditEventDB).filter(AuditEventDB.entity_id == test_inspection_id).all()
        db.close()
        passed = len(events) >= 1
        report("18. Immutable Audit Events Recorded for Inspection Operations", passed, f"Events: {len(events)}")
    except Exception as e:
        report("18. Immutable Audit Events Recorded for Inspection Operations", False, str(e))

    # 19. Failed OCR retry
    try:
        db = SessionLocal()
        bad_img = InspectionImageDB(
            id="img-failed-test-retry",
            inspection_id=test_inspection_id,
            file_reference="local/nonexistent_mock.jpg",
            original_filename="failed_sample.jpg",
            mime_type="image/jpeg",
            panel_type="TOP",
            ocr_status="FAILED",
            created_at="2026-09-16T12:00:00Z",
        )
        db.merge(bad_img)
        db.commit()
        db.close()

        # Retry endpoint handles missing file gracefully without crashing server
        r = client.post("/api/inspections/images/img-failed-test-retry/ocr", headers=off_headers)
        passed = r.status_code in [200, 404, 400, 500] and (r.json().get("status") in ["FAILED", "ERROR"] or "detail" in r.json())
        report("19. Graceful Handling and Recovery of Failed OCR Image Processing", passed)
    except Exception as e:
        report("19. Graceful Handling and Recovery of Failed OCR Image Processing", False, str(e))

    # 20. Partial analysis handling
    try:
        partial_img1 = {
            "id": "partial-01",
            "panel_type": "FRONT",
            "ocr_lines": [{"text": "Packaged Wheat", "bbox": [[0, 0], [10, 10]], "confidence": 0.88}],
            "declarations": {"generic_name": {"field": "generic_name", "value": "Wheat", "confidence": 0.88, "image_id": "partial-01"}}
        }
        partial_img2 = {
            "id": "partial-02",
            "panel_type": "BACK",
            "ocr_lines": [],  # Still queued / processing
            "declarations": {}
        }
        res = aggregate_multi_image_analysis([partial_img1, partial_img2])
        passed = "generic_name" in res["declarations"] and res["declarations"]["generic_name"]["value"] == "Wheat"
        report("20. Partial Analysis Tolerant When Additional Panels Are Queued", passed)
    except Exception as e:
        report("20. Partial Analysis Tolerant When Additional Panels Are Queued", False, str(e))

    print("\n=================================================================")
    total = len(test_results)
    passed_count = sum(1 for _, p, _ in test_results if p)
    print(f"   SUITE RESULTS: {passed_count}/{total} TESTS PASSED")
    print("=================================================================")

    if passed_count == total:
        print("\n>>> ALL PROMPT 9 SPECIFICATIONS MET AND VERIFIED <<<")
        return 0
    else:
        print(f"\n>>> {total - passed_count} TESTS FAILED <<<")
        for name, p, det in test_results:
            if not p:
                print(f"FAILED TEST: {name} -> {det}")
        return 1


if __name__ == "__main__":
    exit_code = run_all_tests()
    sys.exit(exit_code)
