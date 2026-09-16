"""
End-to-end integration test:
Real Image -> Real OCR -> Declaration Extraction & Normalization -> Rule Evaluation -> Explainable Findings
"""

import sys
import json
import uuid
import urllib.request

if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_URL = "http://localhost:5173"

def run_e2e_test(image_path):
    print(f"=== Running E2E Test on {image_path} ===")
    
    # 1. Real OCR
    boundary = uuid.uuid4().hex
    with open(image_path, "rb") as f:
        img_bytes = f.read()
    
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="image"; filename="{image_path}"\r\n'
        f"Content-Type: image/png\r\n\r\n"
    ).encode("utf-8") + img_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")
    
    ocr_req = urllib.request.Request(
        f"{BASE_URL}/api/ocr",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )
    with urllib.request.urlopen(ocr_req) as resp:
        ocr_data = json.loads(resp.read().decode("utf-8"))
    
    print(f"1. Real OCR Completed: {ocr_data['line_count']} lines recognized in {ocr_data['processing_time_ms']}ms")
    assert ocr_data["success"] is True
    assert len(ocr_data["lines"]) > 0

    # 2. Compliance & Declaration Analysis
    comp_req = urllib.request.Request(
        f"{BASE_URL}/api/compliance/analyze",
        data=json.dumps({
            "lines": ocr_data["lines"],
            "text": ocr_data["text"],
            "image_width": ocr_data["image_width"],
            "image_height": ocr_data["image_height"],
        }).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(comp_req) as resp:
        comp_data = json.loads(resp.read().decode("utf-8"))
    
    print(f"2. Compliance Evaluation Completed in {comp_data['processing_time_ms']}ms")
    assert comp_data["success"] is True
    print(f"   Overall Status: {comp_data['overall_status']}")
    print(f"   Compliance Score: {comp_data['compliance_score']}/100")
    print(f"   Summary: {comp_data['summary']}")
    
    # 3. Declarations Check
    print("3. Extracted Declarations:")
    decls = comp_data["declarations"]
    for k, d in decls.items():
        print(f"   - {d['label']} [{k}]: '{d['detected_value']}'")
        print(f"     Extraction Confidence: {int(d['confidence'] * 100)}% | Status: {d['status']} | Linked Lines: {d['source_line_ids']}")
        if d.get("normalized_value"):
            print(f"     Normalized: {d['normalized_value']}")
    
    # 4. Explainable Findings Check
    print("4. Statutory Explainable Findings:")
    for f in comp_data["findings"]:
        print(f"   • {f['statutory_title']} ({f['rule_reference']}): {f['status']}")
        print(f"     What was detected: {f['what_detected']}")
        print(f"     What was expected: {f['what_expected']}")
        print(f"     Statutory Rationale: {f['reason']}")
        print(f"     Linked Evidence: {f['source_line_ids']}")
    
    print("=== E2E Integration Test PASSED Successfully! ===\n")

if __name__ == "__main__":
    run_e2e_test("test_assets/biscuit_pack_en.png")
    run_e2e_test("test_assets/spices_pack_multilingual.png")
