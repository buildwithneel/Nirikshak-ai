import { getApiUrl } from './api/config';

export interface OCRBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OCRNormalizedBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OCRLine {
  id: string;
  text: string;
  confidence: number;
  bounding_box: OCRBoundingBox;
  normalized_box: OCRNormalizedBox;
}

export interface OCRResponse {
  success: boolean;
  image_width: number;
  image_height: number;
  text: string;
  lines: OCRLine[];
  processing_time_ms: number;
  line_count: number;
  error?: string;
}

// Convert data URL to Blob for OCR submission
export function dataURLtoBlob(dataurl: string): Blob {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

export async function runRealOCR(imageSource: File | Blob | string): Promise<OCRResponse> {
  const formData = new FormData();

  if (typeof imageSource === 'string') {
    if (imageSource.startsWith('data:image/svg+xml')) {
      // For SVG vector data URLs, convert to an image payload or handle locally
      const svgBlob = new Blob([decodeURIComponent(imageSource.split(',')[1] || '')], { type: 'image/svg+xml' });
      formData.append('image', svgBlob, 'packaging.svg');
    } else if (imageSource.startsWith('data:')) {
      const blob = dataURLtoBlob(imageSource);
      formData.append('image', blob, 'package.png');
    } else {
      // Remote URL fetch
      const res = await fetch(imageSource);
      const blob = await res.blob();
      formData.append('image', blob, 'package.png');
    }
  } else {
    formData.append('image', imageSource);
  }

  try {
    const response = await fetch(getApiUrl('/api/ocr'), {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        image_width: 0,
        image_height: 0,
        text: '',
        lines: [],
        processing_time_ms: 0,
        line_count: 0,
        error: errorData.error || `OCR API responded with status ${response.status}`,
      };
    }

    const data: OCRResponse = await response.json();
    return data;
  } catch (err: any) {
    console.error('OCR network request failed:', err);
    return {
      success: false,
      image_width: 0,
      image_height: 0,
      text: '',
      lines: [],
      processing_time_ms: 0,
      line_count: 0,
      error: 'Unable to connect to OCR service. Please ensure the backend is running.',
    };
  }
}
