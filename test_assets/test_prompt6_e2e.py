"""
End-to-End Test Suite for Prompt 6:
Real OCR -> Declaration & Compliance Engine -> Full Inspection Model -> ReportLab PDF Generation
"""

import urllib.request
import json
import uuid
import os

def run_e2e_test():
    image_path = 'test_assets/biscuit_pack_en.png'
    assert os.path.exists(image_path), f"Test asset missing: {image_path}"

    print("=== Step 1: Real OCR Analysis ===")
    boundary = uuid.uuid4().hex
    with open(image_path, 'rb') as f:
        file_bytes = f.read()

    body = (
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="image"; filename="{image_path}"\r\n'
        f'Content-Type: image/png\r\n\r\n'
    ).encode('utf-8') + file_bytes + f'\r\n--{boundary}--\r\n'.encode('utf-8')

    req = urllib.request.Request(
        'http://127.0.0.1:8000/api/ocr',
        data=body,
        headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
    )

    with urllib.request.urlopen(req) as resp:
        ocr_data = json.loads(resp.read().decode('utf-8'))

    assert ocr_data.get('success'), f"OCR failed: {ocr_data.get('error')}"
    lines = ocr_data.get('lines', [])
    print(f"OCR extracted {len(lines)} lines in {ocr_data.get('processing_time_ms')}ms")

    print("\n=== Step 2: Legal Metrology Rule 6 Compliance Analysis ===")
    compliance_payload = {
        'lines': lines,
        'text': ocr_data.get('text', ''),
        'image_width': ocr_data.get('image_width', 800),
        'image_height': ocr_data.get('image_height', 600),
    }

    comp_req = urllib.request.Request(
        'http://127.0.0.1:8000/api/compliance/analyze',
        data=json.dumps(compliance_payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )

    with urllib.request.urlopen(comp_req) as resp:
        comp_data = json.loads(resp.read().decode('utf-8'))

    assert comp_data.get('success'), "Compliance analysis failed"
    print(f"Overall status: {comp_data.get('overall_status')}, Score: {comp_data.get('compliance_score')}")
    print(f"Declarations: {len(comp_data.get('declarations', {}))}, Findings: {len(comp_data.get('findings', []))}")

    print("\n=== Step 3: Construct Complete Canonical Inspection Record ===")
    import base64
    with open(image_path, 'rb') as f:
        img_b64 = "data:image/png;base64," + base64.b64encode(f.read()).decode('utf-8')

    inspection_record = {
        "id": "INSP-20260916-8899",
        "schemaVersion": 1,
        "source": "upload",
        "createdAt": "2026-09-16T15:30:00.000Z",
        "updatedAt": "2026-09-16T15:30:00.000Z",
        "productName": "Butter Delite Crispy Biscuits",
        "brand": "NutriBake Premium",
        "category": "Biscuits & Confectionery",
        "inspectionLocation": "Central District Retail Counter, New Delhi",
        "date": "16 September 2026",
        "timestamp": "15:30:00 IST",
        "overallStatus": comp_data.get("overall_status"),
        "complianceScore": comp_data.get("compliance_score"),
        "imageUrl": img_b64,
        "officerNotes": "Physical package condition intact. Tamper-evident seal verified. Font dimensions on principal display panel meet Rule 7 requirements.",
        "declarations": [
            {
                "id": f"dec-{k}",
                "key": k,
                "name": v.get("label"),
                "ruleReference": "Rule 6",
                "detectedValue": v.get("detected_value") or "[NOT DETECTED]",
                "status": "COMPLIANT" if v.get("status") == "detected" else "POTENTIAL_VIOLATION",
                "extractionConfidence": int(v.get("confidence", 0) * 100),
                "sourceLineIds": v.get("source_line_ids", []),
            }
            for k, v in comp_data.get("declarations", {}).items()
        ],
        "findings": [
            {
                "id": f["id"],
                "ruleId": f["rule_id"],
                "ruleReference": f["rule_reference"],
                "statutoryTitle": f["statutory_title"],
                "declarationKey": f["declaration_key"],
                "status": f["status"],
                "whatDetected": f["what_detected"],
                "whatExpected": f["what_expected"],
                "reason": f["reason"],
                "extractionConfidence": f["extraction_confidence"],
                "sourceLineIds": f["source_line_ids"],
            }
            for f in comp_data.get("findings", [])
        ],
        "complianceSummary": {
            "totalRules": comp_data.get("summary", {}).get("total_rules", 6),
            "compliantCount": comp_data.get("summary", {}).get("compliant_count", 0),
            "reviewRequiredCount": comp_data.get("summary", {}).get("review_required_count", 0),
            "potentialViolationCount": comp_data.get("summary", {}).get("potential_violation_count", 0),
        },
        "ocrLines": lines,
        "boundingBoxes": [
            {
                "id": line["id"],
                "label": line["text"],
                "status": "COMPLIANT",
                "confidence": int(line["confidence"] * 100),
                "x": line["normalized_box"]["x"],
                "y": line["normalized_box"]["y"],
                "width": line["normalized_box"]["width"],
                "height": line["normalized_box"]["height"],
            }
            for line in lines
        ]
    }

    print("Canonical inspection record constructed successfully.")

    print("\n=== Step 4: Generate Statutory PDF Report with Evidence Crops ===")
    pdf_req = urllib.request.Request(
        'http://127.0.0.1:8000/api/reports/generate-pdf',
        data=json.dumps(inspection_record).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )

    with urllib.request.urlopen(pdf_req) as resp:
        pdf_bytes = resp.read()
        content_type = resp.headers.get('Content-Type')
        content_disp = resp.headers.get('Content-Disposition')

    print(f"Response Status: 200 OK")
    print(f"Content-Type: {content_type}")
    print(f"Content-Disposition: {content_disp}")
    print(f"Generated PDF file size: {len(pdf_bytes)} bytes")

    assert content_type == 'application/pdf', f"Expected application/pdf, got {content_type}"
    assert len(pdf_bytes) > 5000, f"Expected non-empty PDF, got {len(pdf_bytes)} bytes"
    assert pdf_bytes.startswith(b'%PDF-'), "Invalid PDF signature"

    output_pdf_path = "test_assets/E2E_INSPECTION_REPORT.pdf"
    with open(output_pdf_path, 'wb') as f:
        f.write(pdf_bytes)
    print(f"Saved generated report to {output_pdf_path}")

    print("\n=== ALL E2E STEPS PASSED SUCCESSFULLY ===")

if __name__ == '__main__':
    run_e2e_test()
