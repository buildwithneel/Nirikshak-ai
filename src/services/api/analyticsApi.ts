import { authStorage } from '../../auth/authApi';
import { getApiUrl } from './config';

export interface AnalyticsOverview {
  inspections: {
    total: number;
    active: number;
    completed: number;
    pending_verification: number;
    average_compliance_score: number;
  };
  complaints: {
    total: number;
    new: number;
    under_review: number;
    resolved: number;
  };
}

export interface AnalyticsTrendMonth {
  period: string;
  total: number;
  compliant: number;
  review: number;
  violation: number;
}

export interface AnalyticsTrends {
  has_data: boolean;
  message?: string;
  monthly: AnalyticsTrendMonth[];
}

export interface AnalyticsCategory {
  category: string;
  count: number;
  compliant: number;
  violations: number;
}

export interface AnalyticsCategories {
  has_data: boolean;
  categories: AnalyticsCategory[];
}

export interface ReviewSignals {
  total_conflicts_detected: number;
  top_missing_declarations: { declaration: string; occurrences: number }[];
  top_conflicting_declarations: { field: string; count: number }[];
  has_signals: boolean;
}

function getAuthHeader(): Record<string, string> {
  const token = authStorage.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const analyticsApi = {
  async getOverview(fromDate?: string, toDate?: string): Promise<AnalyticsOverview> {
    const params = new URLSearchParams();
    if (fromDate) params.append('from', fromDate);
    if (toDate) params.append('to', toDate);
    const qs = params.toString() ? `?${params.toString()}` : '';

    const res = await fetch(getApiUrl(`/api/analytics/overview${qs}`), {
      headers: {
        ...getAuthHeader(),
      },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch analytics overview');
    }
    return res.json();
  },

  async getTrends(): Promise<AnalyticsTrends> {
    const res = await fetch(getApiUrl('/api/analytics/trends'), {
      headers: {
        ...getAuthHeader(),
      },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch analytics trends');
    }
    return res.json();
  },

  async getCategories(): Promise<AnalyticsCategories> {
    const res = await fetch(getApiUrl('/api/analytics/categories'), {
      headers: {
        ...getAuthHeader(),
      },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch analytics categories');
    }
    return res.json();
  },

  async getReviewSignals(): Promise<ReviewSignals> {
    const res = await fetch(getApiUrl('/api/analytics/review-signals'), {
      headers: {
        ...getAuthHeader(),
      },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch analytics review signals');
    }
    return res.json();
  },
};
