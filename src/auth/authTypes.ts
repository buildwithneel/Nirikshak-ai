export type UserRole = 'OFFICER' | 'USER' | 'ADMIN' | 'SUPERVISOR' | 'REVIEWER';

export interface User {
  id: string;
  email: string;
  displayName?: string;
  display_name?: string;
  role: UserRole;
  cadreCode?: string;
  cadre_code?: string;
  jurisdiction?: string;
  active?: boolean;
  createdAt?: string;
  created_at?: string;
  lastLoginAt?: string;
  last_login_at?: string;
}


export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export type ComplaintStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'INSPECTION_REQUIRED'
  | 'INSPECTION_IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED';

export interface Complaint {
  id: string;
  user_id: string;
  email: string;
  product_name: string;
  product_description?: string;
  issue_category: string;
  description: string;
  image_url?: string | null;
  status: ComplaintStatus;
  created_at: string;
  updated_at: string;
  officer_notes?: string | null;
  linked_inspection_id?: string | null;
}

export interface ComplaintCreatePayload {
  product_name: string;
  issue_category: string;
  description?: string;
  contact_email?: string;
  image_url?: string | null;
  product_description?: string;
}
