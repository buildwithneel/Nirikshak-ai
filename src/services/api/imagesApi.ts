import { authStorage } from '../../auth/authApi';

export interface InspectionImageItem {
  id: string;
  inspection_id: string;
  panel_type: string; // FRONT, BACK, LEFT_SIDE, RIGHT_SIDE, TOP, BOTTOM, OTHER, UNKNOWN
  file_reference: string;
  original_filename?: string;
  mime_type: string;
  source: string; // CAMERA, UPLOAD, CONSUMER_SUBMISSION, OFFICER_ADDED
  width: number;
  height: number;
  ocr_status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  created_at: string;
  uploaded_by?: string;
}

export interface DeclarationOccurrence {
  image_id: string;
  panel_type: string;
  source: string;
  value: any;
  confidence: number;
  source_line_ids: string[];
  bounding_boxes: any[];
}

export interface DeclarationConflict {
  field_key: string;
  field_label: string;
  conflicting_values: DeclarationOccurrence[];
  status: string; // REVIEW_REQUIRED
  reason: string;
}

export interface ReviewSignalItem {
  signal_type: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  evidence_ref?: string;
}

export interface EvidenceIntelligenceResponse {
  inspection_id: string;
  compliance_score: number;
  images: InspectionImageItem[];
  declarations: Record<string, any>;
  findings: any[];
  evidence_locations: any[];
  conflicts: DeclarationConflict[];
  review_signals: ReviewSignalItem[];
}

function getAuthHeader(): Record<string, string> {
  const token = authStorage.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const imagesApi = {
  async getInspectionImages(inspectionId: string): Promise<InspectionImageItem[]> {
    const res = await fetch(`/api/inspections/${inspectionId}/images`, {
      headers: {
        ...getAuthHeader(),
      },
    });
    if (!res.ok) {
      throw new Error(`Failed to load inspection images: ${res.statusText}`);
    }
    return res.json();
  },

  async uploadInspectionImage(
    inspectionId: string,
    file: File,
    panelType: string = 'UNKNOWN',
    source: string = 'OFFICER_ADDED'
  ): Promise<InspectionImageItem> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('panel_type', panelType);
    formData.append('source', source);

    const res = await fetch(`/api/inspections/${inspectionId}/images`, {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
      },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to upload image.');
    }
    return res.json();
  },

  async updatePanelType(imageId: string, panelType: string): Promise<InspectionImageItem> {
    const res = await fetch(`/api/inspection-images/${imageId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ panel_type: panelType }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update image panel.');
    }
    return res.json();
  },

  async runImageOCR(imageId: string): Promise<any> {
    const res = await fetch(`/api/inspection-images/${imageId}/ocr`, {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to process OCR for image.');
    }
    return res.json();
  },

  async deleteInspectionImage(imageId: string): Promise<any> {
    const res = await fetch(`/api/inspection-images/${imageId}`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeader(),
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to delete inspection image.');
    }
    return res.json();
  },

  async getEvidenceIntelligence(inspectionId: string): Promise<EvidenceIntelligenceResponse> {
    const res = await fetch(`/api/inspections/${inspectionId}/evidence`, {
      headers: {
        ...getAuthHeader(),
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to load evidence intelligence: ${res.statusText}`);
    }
    return res.json();
  },

  async getConflicts(inspectionId: string): Promise<DeclarationConflict[]> {
    const res = await fetch(`/api/inspections/${inspectionId}/conflicts`, {
      headers: {
        ...getAuthHeader(),
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to load conflicts: ${res.statusText}`);
    }
    return res.json();
  },

  getImageContentUrl(imageId: string): string {
    return `/api/inspection-images/${imageId}/content`;
  },
};
