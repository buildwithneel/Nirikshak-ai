import urllib.request
import json
import uuid

def test_ocr(image_path):
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
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f'=== Results for {image_path} ===')
            print(f'Success: {data.get("success")}')
            print(f'Processing time: {data.get("processing_time_ms")}ms')
            print(f'Lines count: {len(data.get("lines", []))}')
            for line in data.get('lines', [])[:6]:
                print(f'  - "{line["text"]}" (conf: {line["confidence"]:.2f}, norm_box: {line["normalized_box"]})')
            return data
    except urllib.error.HTTPError as e:
        print(f'HTTP Error testing {image_path}: {e.code} {e.read().decode("utf-8")}')
    except Exception as e:
        print(f'Error testing {image_path}: {e}')

def test_invalid_file():
    boundary = uuid.uuid4().hex
    body = (
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="image"; filename="invalid.txt"\r\n'
        f'Content-Type: text/plain\r\n\r\n'
    ).encode('utf-8') + b'This is not an image file' + f'\r\n--{boundary}--\r\n'.encode('utf-8')
    req = urllib.request.Request(
        'http://localhost:5173/api/ocr',
        data=body,
        headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            print(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f'HTTP {e.code}: {e.read().decode("utf-8")}')

if __name__ == '__main__':
    test_ocr('test_assets/biscuit_pack_en.png')
    print()
    test_ocr('test_assets/no_text_image.png')
    print()
    print('=== Testing invalid format ===')
    test_invalid_file()
