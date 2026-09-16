import { authStorage } from '../../auth/authApi';

export interface DashboardStats {
  total_complaints: number;
  submitted_complaints: number;
  under_review_complaints: number;
  scheduled_complaints: number;
  resolved_complaints: number;
  total_inspections: number;
  pending_review_inspections: number;
  verified_inspections: number;
  closed_inspections: number;
  average_compliance_score: number;
  high_risk_violations_detected: number;
}

export interface SearchResultItem {
  id: string;
  type: 'COMPLAINT' | 'INSPECTION';
  title: string;
  subtitle: string;
  status: string;
  url: string;
}

function getAuthHeader(): Record<string, string> {
  const token = authStorage.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const dashboardApi = {
  async getStats(): Promise<DashboardStats> {
    const res = await fetch('/api/dashboard/stats', {
      headers: {
        ...getAuthHeader(),
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch dashboard stats`);
    }
    return res.json();
  },

  async search(query: string): Promise<SearchResultItem[]> {
    if (!query.trim()) return [];
    const res = await fetch(`/api/dashboard/search?q=${encodeURIComponent(query)}`, {
      headers: {
        ...getAuthHeader(),
      },
    });

    if (!res.ok) {
      return [];
    }
    return res.json();
  },

  async getWorkQueue(timeframe: string = '7d'): Promise<{
    requires_attention: any[];
    pending_verification: any[];
    recently_submitted_complaints: any[];
    recently_updated: any[];
  }> {
    const res = await fetch(`/api/dashboard/work-queue?timeframe=${encodeURIComponent(timeframe)}`, {
      headers: {
        ...getAuthHeader(),
      },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch officer work queue');
    }
    return res.json();
  },
};
