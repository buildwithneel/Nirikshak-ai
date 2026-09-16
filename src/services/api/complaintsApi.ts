import { authStorage } from '../../auth/authApi';

export interface ComplaintItem {
  id: string;
  complaint_reference: string;
  user_id: string;
  consumer_email: string;
  product_name: string;
  product_description?: string | null;
  complaint_description: string;
  issue_category: string;
  image_reference?: string | null;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'INSPECTION_SCHEDULED' | 'RESOLVED' | 'REJECTED';
  created_at: string;
  updated_at: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  officer_notes?: string | null;
  linked_inspection_id?: string | null;
}

export interface ComplaintCreateInput {
  product_name: string;
  issue_category: string;
  description: string;
  contact_email?: string;
  image_reference?: string;
  product_description?: string;
}

function getAuthHeader(): Record<string, string> {
  const token = authStorage.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const complaintsApi = {
  async getComplaints(params?: { status?: string; search?: string }): Promise<ComplaintItem[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);

    const res = await fetch(`/api/complaints?${query.toString()}`, {
      headers: {
        ...getAuthHeader(),
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch complaints: ${res.statusText}`);
    }
    return res.json();
  },

  async getComplaintById(complaintId: string): Promise<ComplaintItem> {
    const res = await fetch(`/api/complaints/${complaintId}`, {
      headers: {
        ...getAuthHeader(),
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Complaint not found or restricted.`);
    }
    return res.json();
  },

  async submitComplaint(payload: ComplaintCreateInput): Promise<ComplaintItem> {
    const res = await fetch('/api/complaints', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to submit grievance.`);
    }
    return res.json();
  },

  async updateComplaintStatus(
    complaintId: string,
    status: string,
    officerNotes?: string
  ): Promise<ComplaintItem> {
    const res = await fetch(`/api/complaints/${complaintId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({
        status,
        officer_notes: officerNotes,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to update status.`);
    }
    return res.json();
  },

  async initiateInspection(complaintId: string): Promise<{ id: string; inspection_reference: string }> {
    const res = await fetch(`/api/complaints/${complaintId}/initiate-inspection`, {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to initiate inspection.`);
    }
    return res.json();
  },
};
