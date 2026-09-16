import { authStorage } from '../../auth/authApi';
import { getApiUrl } from './config';

export interface InspectionSummary {
  id: string;
  inspection_reference: string;
  complaint_id?: string | null;
  complaint_reference?: string | null;
  officer_id: string;
  product_name: string;
  brand?: string | null;
  retail_point?: string | null;
  category?: string | null;
  source: string;
  status: 'DRAFT' | 'IN_PROGRESS' | 'PENDING_OFFICER_REVIEW' | 'VERIFIED' | 'REPORT_GENERATED' | 'CLOSED';
  verification_state: 'UNVERIFIED' | 'CONFIRMED' | 'OVERRIDDEN' | 'DISMISSED' | 'COMPLIANT';
  compliance_score: number;
  package_image_url?: string | null;
  report_status: string;
  report_pdf_path?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

export interface InspectionDetail extends InspectionSummary {
  analysis?: {
    id: string;
    inspection_id: string;
    ocr_text?: string;
    ocr_lines_json?: string;
    declarations_json?: string;
    normalized_values_json?: string;
    statutory_findings_json?: string;
    evidence_metadata_json?: string;
    analysis_timestamp: string;
    ocr_processing_time_ms: number;
  } | null;
  observations: Array<{
    id: string;
    inspection_id: string;
    officer_id: string;
    category: string;
    observation: string;
    created_at: string;
    updated_at: string;
  }>;
  verification?: {
    id: string;
    inspection_id: string;
    officer_id: string;
    reviewed_ai_findings: boolean;
    reviewed_visual_evidence: boolean;
    recorded_physical_observations: boolean;
    verification_decision: string;
    statutory_action?: string;
    officer_justification: string;
    verified_at: string;
  } | null;
  audit_events?: AuditEventItem[];
}

export interface AuditEventItem {
  id: string;
  timestamp: string;
  actor_user_id?: string;
  actor_email?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata_json?: string;
}

function getAuthHeader(): Record<string, string> {
  const token = authStorage.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const inspectionsApi = {
  async getInspections(params?: { status?: string; search?: string }): Promise<InspectionSummary[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);

    const res = await fetch(getApiUrl(`/api/inspections?${query.toString()}`), {
      headers: {
        ...getAuthHeader(),
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch inspections: ${res.statusText}`);
    }
    return res.json();
  },

  async getInspectionById(inspectionId: string): Promise<InspectionDetail> {
    const res = await fetch(getApiUrl(`/api/inspections/${inspectionId}`), {
      headers: {
        ...getAuthHeader(),
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Inspection not found.`);
    }
    return res.json();
  },

  async createInspection(payload: {
    product_name: string;
    brand?: string;
    retail_point?: string;
    category?: string;
    complaint_id?: string;
    complaint_reference?: string;
  }): Promise<InspectionSummary> {
    const res = await fetch(getApiUrl('/api/inspections'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to create inspection.`);
    }
    return res.json();
  },

  async updateInspection(
    inspectionId: string,
    payload: {
      status?: string;
      verification_state?: string;
      package_image_url?: string;
      product_name?: string;
      brand?: string;
      retail_point?: string;
    }
  ): Promise<InspectionSummary> {
    const res = await fetch(getApiUrl(`/api/inspections/${inspectionId}`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to update inspection.`);
    }
    return res.json();
  },

  async saveAnalysis(
    inspectionId: string,
    payload: {
      ocr_text: string;
      ocr_lines_json: string;
      declarations_json: string;
      statutory_findings_json: string;
      normalized_values_json?: string;
      compliance_score: number;
      ocr_processing_time_ms?: number;
    }
  ): Promise<any> {
    const res = await fetch(getApiUrl(`/api/inspections/${inspectionId}/analysis`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to persist inspection analysis.`);
    }
    return res.json();
  },

  async addObservation(
    inspectionId: string,
    payload: { category: string; observation: string }
  ): Promise<any> {
    const res = await fetch(getApiUrl(`/api/inspections/${inspectionId}/observations`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to record physical observation.`);
    }
    return res.json();
  },

  async submitVerification(
    inspectionId: string,
    payload: {
      reviewed_ai_findings: boolean;
      reviewed_visual_evidence: boolean;
      recorded_physical_observations: boolean;
      verification_decision: string;
      statutory_action?: string;
      officer_justification: string;
    }
  ): Promise<any> {
    const res = await fetch(getApiUrl(`/api/inspections/${inspectionId}/verify`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to submit officer verification.`);
    }
    return res.json();
  },

  async getAuditTimeline(inspectionId: string): Promise<AuditEventItem[]> {
    const res = await fetch(getApiUrl(`/api/inspections/${inspectionId}/audit`), {
      headers: {
        ...getAuthHeader(),
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch audit trail.`);
    }
    return res.json();
  },

  async generateReport(inspectionId: string): Promise<Blob> {
    const res = await fetch(getApiUrl(`/api/inspections/${inspectionId}/generate-report`), {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to generate statutory report.`);
    }
    return res.blob();
  },
};
