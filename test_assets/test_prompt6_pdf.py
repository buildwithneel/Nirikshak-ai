import urllib.request
import json
import os

def test_pdf_generation():
    test_payload = {
        "id": "INSP-20260916-TEST",
        "productName": "Royal Butter Delite Biscuits",
        "brand": "NutriBake Premium",
        "category": "Biscuits & Confectionery",
        "inspectionLocation": "Central District Market Point",
        "date": "16 September 2026",
        "timestamp": "15:15:00 IST",
        "overallStatus": "REVIEW_REQUIRED",
        "complianceScore": 82,
        "source": "upload",
        "officerNotes": "Physical package inspected at retail counter. Net quantity typography requires precision caliper verification under Rule 7.",
        "declarations": [
            {
                "id": "dec-1",
                "key": "commodity_name",
                "name": "Product / Commodity Name",
                "ruleReference": "Rule 6(1)(a)",
                "detectedValue": "Butter Delite Crispy Biscuits",
                "status": "COMPLIANT",
                "extractionConfidence": 98,
                "sourceLineIds": ["line-1"]
            },
            {
                "id": "dec-2",
                "key": "net_quantity",
                "name": "Net Quantity",
                "ruleReference": "Rule 6(1)(c)",
                "detectedValue": "100 g",
                "status": "COMPLIANT",
                "extractionConfidence": 96,
                "sourceLineIds": ["line-2"]
            },
            {
                "id": "dec-3",
                "key": "consumer_care",
                "name": "Consumer Care Cell",
                "ruleReference": "Rule 6(1)(g)",
                "detectedValue": "[NOT DETECTED]",
                "status": "POTENTIAL_VIOLATION",
                "extractionConfidence": 40,
                "sourceLineIds": []
            }
        ],
        "findings": [
            {
                "id": "f-1",
                "ruleId": "RULE_6_1_A",
                "ruleReference": "Rule 6(1)(a)",
                "statutoryTitle": "Generic / Commodity Name Declaration",
                "declarationKey": "commodity_name",
                "status": "COMPLIANT",
                "whatDetected": "Butter Delite Crispy Biscuits",
                "whatExpected": "Mandatory generic classification on PDP",
                "reason": "Unambiguous commodity declaration identified.",
                "extractionConfidence": 98,
                "sourceLineIds": ["line-1"]
            },
            {
                "id": "f-2",
                "ruleId": "RULE_6_1_G",
                "ruleReference": "Rule 6(1)(g)",
                "statutoryTitle": "Consumer Care Redressal Mechanism",
                "declarationKey": "consumer_care",
                "status": "POTENTIAL_VIOLATION",
                "whatDetected": "[NOT DETECTED]",
                "whatExpected": "Name, address, telephone/email of consumer grievance officer",
                "reason": "No consumer care helpline or grievance details detected on PDP.",
                "extractionConfidence": 40,
                "sourceLineIds": []
            }
        ],
        "complianceSummary": {
            "totalRules": 2,
            "compliantCount": 1,
            "reviewRequiredCount": 0,
            "potentialViolationCount": 1
        },
        "boundingBoxes": [
            {
                "id": "line-1",
                "declarationKey": "commodity_name",
                "label": "Butter Delite",
                "status": "COMPLIANT",
                "confidence": 98,
                "x": 10.0,
                "y": 15.0,
                "width": 60.0,
                "height": 10.0
            }
        ]
    }

    req = urllib.request.Request(
        'http://127.0.0.1:8000/api/reports/generate-pdf',
        data=json.dumps(test_payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )

    with urllib.request.urlopen(req) as resp:
        content_type = resp.headers.get('Content-Type')
        content_disp = resp.headers.get('Content-Disposition')
        pdf_bytes = resp.read()

    print("=== PDF Report Generation Test Results ===")
    print(f"Content-Type: {content_type}")
    print(f"Content-Disposition: {content_disp}")
    print(f"Total PDF size: {len(pdf_bytes)} bytes")

    assert content_type == 'application/pdf', f"Expected application/pdf, got {content_type}"
    assert len(pdf_bytes) > 2000, f"PDF file suspiciously small: {len(pdf_bytes)} bytes"
    assert pdf_bytes.startswith(b'%PDF-'), "File header does not begin with standard PDF signature (%PDF-)"

    out_file = 'test_assets/test_output_report.pdf'
    with open(out_file, 'wb') as f:
        f.write(pdf_bytes)
    print(f"Saved test PDF to {out_file} successfully.")
    print("=== PDF REPORT TEST PASSED ===")

if __name__ == '__main__':
    test_pdf_generation()
