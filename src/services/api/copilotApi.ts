/**
 * NIRIKSHAK AI — Copilot API Service
 * Interacts with /api/inspections/{id}/copilot for evidence-grounded assistance.
 */

export interface CopilotSource {
  type: 'EVIDENCE' | 'OCR' | 'DECLARATION' | 'FINDING' | 'RULE' | 'OBSERVATION' | 'CONFLICT';
  label: string;
  inspection_id: string;
  image_id?: string;
  panel_type?: string;
  ocr_line_id?: string;
  declaration_key?: string;
  finding_id?: string;
  rule_reference?: string;
  rule_url?: string;
}

export interface CopilotAction {
  type: 'OPEN_EVIDENCE' | 'OPEN_FINDING' | 'OPEN_CONFLICT' | 'OPEN_RULE' | 'OPEN_VERIFICATION';
  label: string;
  target_id?: string;
  target_tab?: string;
}

export interface CopilotQueryRequest {
  message: string;
  context_mode?: 'FINDING_CONTEXT' | 'DECLARATION_CONTEXT' | 'CONFLICT_CONTEXT' | 'INSPECTION_CONTEXT' | 'RULE_CONTEXT';
  finding_id?: string;
  declaration_key?: string;
  image_id?: string;
  conversation_history?: Array<{ role: string; content: string }>;
}

export interface CopilotResponse {
  success: boolean;
  answer: string;
  sources: CopilotSource[];
  actions: CopilotAction[];
  grounded: boolean;
  quality_state: 'GROUNDED' | 'PARTIALLY_GROUNDED' | 'INSUFFICIENT_EVIDENCE' | 'UNAVAILABLE';
  mode: string;
  disclaimer: string;
  request_id?: string;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const copilotApi = {
  async query(inspectionId: string, payload: CopilotQueryRequest): Promise<CopilotResponse> {
    const res = await fetch(`/api/inspections/${inspectionId}/copilot`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (res.status === 429) {
      throw new Error('Copilot request limit reached. Please wait a moment before sending another query.');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || `Copilot query failed (HTTP ${res.status})`);
    }

    return res.json();
  },

  async getSuggestedQuestions(inspectionId: string): Promise<string[]> {
    try {
      const res = await fetch(`/api/inspections/${inspectionId}/copilot/suggested`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.suggested_questions || [];
    } catch {
      return [];
    }
  },

  async submitFeedback(
    inspectionId: string,
    copilotResponseId: string,
    feedback: 'HELPFUL' | 'NOT_HELPFUL' | 'INCORRECT',
    notes?: string
  ): Promise<void> {
    try {
      await fetch(`/api/inspections/${inspectionId}/copilot/feedback`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          copilot_response_id: copilotResponseId,
          feedback,
          notes,
        }),
      });
    } catch (e) {
      console.warn('Failed to submit copilot feedback:', e);
    }
  },

  async getHistory(inspectionId: string): Promise<any[]> {
    try {
      const res = await fetch(`/api/inspections/${inspectionId}/copilot/history`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },
};
