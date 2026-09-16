"""
Automated test suite for NIRIKSHAK AI Legal Metrology Compliance Engine & Declaration Extractor.
Tests declaration extraction, unit normalization, rule evaluation, 3-tier confidence separation,
and API contract on POST /api/compliance/analyze.
"""

import sys
import json
import urllib.request
import urllib.error

# Ensure Windows terminal can print unicode symbols (₹, Hindi, Gujarati)
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_URL = "http://localhost:5173"  # Test through Vite proxy

def send_compliance_request(lines, text=""):
    payload = {
        "lines": lines,
        "text": text,
        "image_width": 800,
        "image_height": 600,
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}/api/compliance/analyze",
        data=data,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def test_english_package_extraction():
    print("--- Test 1: Complete English Package Label ---")
    mock_ocr_lines = [
        {"id": "line-1", "text": "ROYAL DIGESTIVE BISCUITS", "confidence": 0.98, "bounding_box": {"x": 50, "y": 80, "width": 400, "height": 40}, "normalized_box": {"x": 6.2, "y": 10.0, "width": 50.0, "height": 5.0}},
        {"id": "line-2", "text": "Wholewheat High Fibre Snack", "confidence": 0.95, "bounding_box": {"x": 50, "y": 130, "width": 300, "height": 25}, "normalized_box": {"x": 6.2, "y": 16.0, "width": 37.5, "height": 3.0}},
        {"id": "line-3", "text": "Net Quantity: 500 g", "confidence": 0.94, "bounding_box": {"x": 50, "y": 180, "width": 200, "height": 30}, "normalized_box": {"x": 6.2, "y": 22.5, "width": 25.0, "height": 3.75}},
        {"id": "line-4", "text": "MRP Rs. 120.00 (Incl. of all taxes)", "confidence": 0.96, "bounding_box": {"x": 50, "y": 230, "width": 350, "height": 30}, "normalized_box": {"x": 6.2, "y": 28.75, "width": 43.75, "height": 3.75}},
        {"id": "line-5", "text": "Unit Sale Price: Rs. 0.24 / g", "confidence": 0.96, "bounding_box": {"x": 50, "y": 280, "width": 250, "height": 25}, "normalized_box": {"x": 6.2, "y": 35.0, "width": 31.25, "height": 3.1}},
        {"id": "line-6", "text": "Mfg Date: 08/2026", "confidence": 0.97, "bounding_box": {"x": 50, "y": 330, "width": 180, "height": 25}, "normalized_box": {"x": 6.2, "y": 41.25, "width": 22.5, "height": 3.1}},
        {"id": "line-7", "text": "Manufactured by: Apex Foods India Pvt Ltd", "confidence": 0.96, "bounding_box": {"x": 50, "y": 380, "width": 450, "height": 30}, "normalized_box": {"x": 6.2, "y": 47.5, "width": 56.25, "height": 3.75}},
        {"id": "line-8", "text": "Plot 42, GIDC Naroda, Ahmedabad 382330 Gujarat", "confidence": 0.95, "bounding_box": {"x": 50, "y": 420, "width": 500, "height": 25}, "normalized_box": {"x": 6.2, "y": 52.5, "width": 62.5, "height": 3.1}},
        {"id": "line-9", "text": "Consumer Care: 1800-200-3456 | care@apexfoods.in", "confidence": 0.97, "bounding_box": {"x": 50, "y": 480, "width": 480, "height": 28}, "normalized_box": {"x": 6.2, "y": 60.0, "width": 60.0, "height": 3.5}},
    ]

    res = send_compliance_request(mock_ocr_lines)
    assert res["success"] is True
    print(f"Overall Status: {res['overall_status']}")
    print(f"Compliance Score: {res['compliance_score']}/100")
    print(f"Declarations Extracted: {len(res['declarations'])}")

    decls = res["declarations"]
    assert decls["commodity_name"]["detected_value"] == "ROYAL DIGESTIVE BISCUITS"
    assert decls["net_quantity"]["detected_value"] == "500 g"
    assert decls["net_quantity"]["normalized_value"]["numeric_value"] == 500
    assert decls["net_quantity"]["normalized_value"]["unit"] == "g"
    assert "120" in decls["mrp"]["detected_value"]
    assert decls["mrp"]["normalized_value"]["tax_inclusive_declared"] is True
    assert "Apex Foods" in decls["manufacturer_details"]["detected_value"]
    assert decls["manufacturer_details"]["normalized_value"]["has_pincode"] is True
    assert "1800-200-3456" in decls["consumer_care"]["detected_value"]
    assert "08/2026" in decls["date_of_packaging"]["detected_value"]

    # Verify 3-tier confidence separation
    for key, d in decls.items():
        print(f"  [{key}] Detected: '{d['detected_value']}' | Extraction Conf: {int(d['confidence']*100)}% | Status: {d['status']} | Lines: {d['source_line_ids']}")
        assert 0.0 <= d["confidence"] <= 1.0

    print("Findings:")
    for f in res["findings"]:
        print(f"  - {f['rule_id']}: {f['status']} | Rule: {f['rule_reference']} | Detected: {f['what_detected']}")

    print("PASS: English package extraction & rule verification!\n")

def test_no_text_image():
    print("--- Test 2: No-Text Image ---")
    res = send_compliance_request([])
    assert res["success"] is True
    assert res["overall_status"] == "POTENTIAL_VIOLATION"
    assert res["compliance_score"] == 0
    print(f"No-text handled safely: Overall Status = {res['overall_status']}, Score = {res['compliance_score']}")
    print("PASS: No-text edge case handled cleanly without crash!\n")

def test_partial_declaration_missing_care():
    print("--- Test 3: Partial Declaration (Missing Consumer Care) ---")
    mock_lines = [
        {"id": "line-1", "text": "CRUNCHY CASHEW COOKIES", "confidence": 0.95, "bounding_box": {"x": 50, "y": 80, "width": 350, "height": 35}, "normalized_box": {"x": 6.2, "y": 10.0, "width": 43.7, "height": 4.4}},
        {"id": "line-2", "text": "Net Qty: 200 g", "confidence": 0.94, "bounding_box": {"x": 50, "y": 140, "width": 180, "height": 28}, "normalized_box": {"x": 6.2, "y": 17.5, "width": 22.5, "height": 3.5}},
        {"id": "line-3", "text": "MRP Rs. 80.00 (Incl. of all taxes)", "confidence": 0.93, "bounding_box": {"x": 50, "y": 190, "width": 300, "height": 28}, "normalized_box": {"x": 6.2, "y": 23.7, "width": 37.5, "height": 3.5}},
        {"id": "line-4", "text": "Mfd by: Sunrise Bakery, Industrial Estate, Pune 411001", "confidence": 0.92, "bounding_box": {"x": 50, "y": 240, "width": 450, "height": 28}, "normalized_box": {"x": 6.2, "y": 30.0, "width": 56.2, "height": 3.5}},
    ]
    res = send_compliance_request(mock_lines)
    assert res["success"] is True
    # Consumer care should be missing and flagged as POTENTIAL_VIOLATION under Rule 6(1)(n)
    care_finding = next(f for f in res["findings"] if f["declaration_key"] == "consumer_care")
    assert care_finding["status"] == "POTENTIAL_VIOLATION"
    print(f"Consumer care finding: {care_finding['status']} | Reason: {care_finding['reason']}")
    print("PASS: Partial declaration correctly identifies missing mandate!\n")

def test_multilingual_patterns():
    print("--- Test 4: Multilingual (Hindi & Gujarati) Patterns ---")
    mock_lines = [
        {"id": "line-1", "text": "शुद्ध प्रीमियम हल्दी पाउडर", "confidence": 0.92, "bounding_box": {"x": 50, "y": 80, "width": 350, "height": 35}, "normalized_box": {"x": 6.2, "y": 10.0, "width": 43.7, "height": 4.4}},
        {"id": "line-2", "text": "ચોખ્ખું વજન: 200 ગ્રામ", "confidence": 0.91, "bounding_box": {"x": 50, "y": 140, "width": 200, "height": 28}, "normalized_box": {"x": 6.2, "y": 17.5, "width": 25.0, "height": 3.5}},
        {"id": "line-3", "text": "મહત્તમ છૂટક કિંમત: ₹65.00 તમામ કર સહિત", "confidence": 0.93, "bounding_box": {"x": 50, "y": 190, "width": 350, "height": 28}, "normalized_box": {"x": 6.2, "y": 23.7, "width": 43.7, "height": 3.5}},
        {"id": "line-4", "text": "નિર્માતા: ભારત સ્પાઇસિસ લિ., અમદાવાદ 380001", "confidence": 0.90, "bounding_box": {"x": 50, "y": 240, "width": 420, "height": 28}, "normalized_box": {"x": 6.2, "y": 30.0, "width": 52.5, "height": 3.5}},
        {"id": "line-5", "text": "ગ્રાહક સેવા: 1800-233-4455 | care@bharatspices.in", "confidence": 0.94, "bounding_box": {"x": 50, "y": 290, "width": 450, "height": 28}, "normalized_box": {"x": 6.2, "y": 36.2, "width": 56.2, "height": 3.5}},
    ]
    res = send_compliance_request(mock_lines)
    assert res["success"] is True
    decls = res["declarations"]
    assert decls["net_quantity"]["normalized_value"]["numeric_value"] == 200
    assert decls["net_quantity"]["normalized_value"]["unit"] == "g"
    assert "65" in decls["mrp"]["detected_value"]
    assert decls["mrp"]["normalized_value"]["tax_inclusive_declared"] is True
    assert "1800-233-4455" in decls["consumer_care"]["detected_value"]
    print("PASS: Multilingual patterns extracted and normalized successfully!\n")

if __name__ == "__main__":
    test_english_package_extraction()
    test_no_text_image()
    test_partial_declaration_missing_care()
    test_multilingual_patterns()
    print("ALL COMPLIANCE ENGINE BACKEND TESTS PASSED SUCCESSFULLY!")
