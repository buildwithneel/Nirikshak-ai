import { authStorage } from '../../auth/authApi';

export interface ProductCatalogItem {
  id: string;
  product_name: string;
  brand: string;
  category: string;
  inspection_count: number;
  complaint_count: number;
  review_signals_count: number;
  last_inspection_date: string;
  average_score: number;
}

export interface ProductDetail {
  product_name: string;
  brand: string;
  category: string;
  total_inspections: number;
  total_complaints: number;
  average_compliance_score: number;
  observed_patterns: { pattern: string; occurrences: number; type: string }[];
  declared_attributes: Record<string, string[]>;
  inspections: {
    id: string;
    inspection_reference: string;
    status: string;
    compliance_score: number;
    created_at: string;
  }[];
  complaints: {
    id: string;
    complaint_reference: string;
    issue_category: string;
    status: string;
    created_at: string;
  }[];
}

function getAuthHeader(): Record<string, string> {
  const token = authStorage.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const productsApi = {
  async getProducts(search?: string, category?: string): Promise<ProductCatalogItem[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category && category !== 'ALL') params.append('category', category);
    const qs = params.toString() ? `?${params.toString()}` : '';

    const res = await fetch(`/api/products${qs}`, {
      headers: {
        ...getAuthHeader(),
      },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch products');
    }
    return res.json();
  },

  async getProductDetail(productId: string): Promise<ProductDetail> {
    const res = await fetch(`/api/products/${encodeURIComponent(productId)}`, {
      headers: {
        ...getAuthHeader(),
      },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch product details');
    }
    return res.json();
  },
};
