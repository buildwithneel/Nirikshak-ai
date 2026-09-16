import urllib.request
import json
import uuid
import sys

def test_ocr_and_evidence():
    image_path = 'test_assets/biscuit_pack_en.png'
    boundary = uuid.uuid4().hex
    with open(image_path, 'rb') as f:
        file_bytes = f.read()

    body = (
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="image"; filename="{image_path}"\r\n'
        f'Content-Type: image/png\r\n\r\n'
    ).encode('utf-8') + file_bytes + f'\r\n--{boundary}--\r\n'.encode('utf-8')

    req = urllib.request.Request(
        'http://localhost:5173/api/ocr',
        data=body,
        headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
    )

    with urllib.request.urlopen(req) as resp:
        ocr_data = json.loads(resp.read().decode('utf-8'))

    print("=== 1. OCR Line & Normalized Coordinates Verification ===")
    lines = ocr_data.get('lines', [])
    assert len(lines) > 0, "No OCR lines returned"
    print(f"Total lines extracted: {len(lines)}")

    for idx, line in enumerate(lines):
        norm = line.get('normalized_box', {})
        x, y, w, h = norm.get('x'), norm.get('y'), norm.get('width'), norm.get('height')
        # Check coordinate bounds 0 to 100%
        assert 0 <= x <= 100, f"Line {idx} x out of bounds: {x}"
        assert 0 <= y <= 100, f"Line {idx} y out of bounds: {y}"
        assert 0 < w <= 100, f"Line {idx} width out of bounds: {w}"
        assert 0 < h <= 100, f"Line {idx} height out of bounds: {h}"
        assert x + w <= 100.1, f"Line {idx} exceeds 100% width: {x + w}"
        assert y + h <= 100.1, f"Line {idx} exceeds 100% height: {y + h}"

    print(f"All {len(lines)} OCR normalized bounding boxes are strictly within 0-100% bounds.")

    print("\n=== 2. Compliance Analysis & Bidirectional Linking ===")
    compliance_payload = {
        'lines': ocr_data.get('lines', []),
        'text': ocr_data.get('text', ''),
        'image_width': ocr_data.get('image_width', 800),
        'image_height': ocr_data.get('image_height', 600),
    }
    compliance_req = urllib.request.Request(
        'http://localhost:5173/api/compliance/analyze',
        data=json.dumps(compliance_payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )

    with urllib.request.urlopen(compliance_req) as resp:
        comp_data = json.loads(resp.read().decode('utf-8'))

    declarations_raw = comp_data.get('declarations', {})
    if isinstance(declarations_raw, dict):
        declarations = list(declarations_raw.values())
    else:
        declarations = declarations_raw

    findings = comp_data.get('findings', [])

    print(f"Extracted declarations: {len(declarations)}")
    print(f"Statutory findings: {len(findings)}")

    # Check multi-evidence mapping and missing declaration behavior
    for dec in declarations:
        line_ids = dec.get('source_line_ids', [])
        print(f"  - {dec['key']}: status={dec['status']}, source_lines={line_ids}")
        if dec['status'] == 'missing':
            # Strict Rule: Missing declarations must have 0 source lines (NEVER draw fake boxes)
            assert len(line_ids) == 0, f"Missing declaration {dec['key']} should have 0 source lines, got {line_ids}"
            print(f"    [PASS] Strict Rule: Missing {dec['key']} has 0 source bounding boxes.")

    # Check manufacturer multi-evidence linking
    mfg = next((d for d in declarations if d['key'] == 'manufacturer_details'), None)
    if mfg:
        mfg_lines = mfg.get('source_line_ids', [])
        print(f"  - Manufacturer linked lines: {mfg_lines}")
        assert len(mfg_lines) >= 2, f"Expected manufacturer to span multiple lines, got {mfg_lines}"
        print(f"    [PASS] Multi-evidence highlighting verified: manufacturer spans lines {mfg_lines}")

    print("\n=== 3. Prompt 5 Visual Evidence Automated Verification PASSED ===")

if __name__ == '__main__':
    test_ocr_and_evidence()
