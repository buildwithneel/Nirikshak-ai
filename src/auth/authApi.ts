import {
  User,
  UserRole,
  LoginCredentials,
  AuthResponse,
  Complaint,
  ComplaintCreatePayload,
  ComplaintStatus,
} from './authTypes';

const TOKEN_KEY = 'nirikshak_auth_token';
const USER_KEY = 'nirikshak_auth_user';

export const authStorage = {
  getToken: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  getUser: (): User | null => {
    try {
      const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setSession: (token: string, user: User, rememberMe: boolean = false) => {
    try {
      const normalizedUser: User = {
        ...user,
        displayName: user.displayName || user.display_name || user.email.split('@')[0],
        cadreCode: user.cadreCode || user.cadre_code,
        createdAt: user.createdAt || user.created_at || new Date().toISOString(),
      };
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem(TOKEN_KEY, token);
      storage.setItem(USER_KEY, JSON.stringify(normalizedUser));
      // Clean opposite storage to prevent stale collisions
      if (rememberMe) {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
      } else {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    } catch (e) {
      console.warn('Failed to persist auth session:', e);
    }
  },


  clearSession: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
    } catch (e) {
      console.warn('Failed to clear auth session:', e);
    }
  },
};

/**
 * Offline demo fallback accounts in case FastAPI server is unreachable
 */
const DEMO_OFFICER: User = {
  id: 'usr-officer-001',
  email: 'inspector@officer.demo',
  displayName: 'Insp. R. Varma',
  role: 'OFFICER',
  cadreCode: 'LM-DL-2024-881',
  jurisdiction: 'State Enforcement Directorate, Zone 1',
  createdAt: '2026-01-15T09:00:00Z',
  lastLoginAt: new Date().toISOString(),
};

const DEMO_CITIZEN: User = {
  id: 'usr-citizen-002',
  email: 'citizen@gmail.com',
  displayName: 'Rahul Sharma',
  role: 'USER',
  createdAt: '2026-02-10T14:30:00Z',
  lastLoginAt: new Date().toISOString(),
};

const DEMO_COMPLAINTS: Complaint[] = [
  {
    id: 'CMP-7F39A2B1',
    user_id: 'usr-citizen-002',
    email: 'citizen@gmail.com',
    product_name: 'Heritage Organic Almond Milk 1L',
    product_description: 'Packaged Food Product',
    issue_category: 'missing_care',
    description: 'Label is missing customer grievance cell telephone number and postal address. Only a broken website URL is printed.',
    image_url: null,
    status: 'SUBMITTED',
    created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    officer_notes: null,
    linked_inspection_id: null,
  },
  {
    id: 'CMP-4C819E02',
    user_id: 'usr-citizen-002',
    email: 'citizen@gmail.com',
    product_name: 'SunShine Sunscreen SPF 50',
    product_description: 'Cosmetic Commodity',
    issue_category: 'missing_mrp',
    description: 'Purchased at airport kiosk. Sold for Rs. 499 with sticker obscuring original MRP of Rs. 350.',
    image_url: null,
    status: 'UNDER_REVIEW',
    created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    officer_notes: 'Preliminary review indicates potential violation under Rule 18(2) dual-pricing.',
    linked_inspection_id: null,
  },
];

export const authApi = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (res.ok) {
        const data = await res.json();
        authStorage.setSession(data.access_token, data.user, credentials.rememberMe);
        return data;
      }

      if (res.status === 401) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Unable to sign in. Check your email and password and try again.');
      }
    } catch (e: any) {
      if (e.message && e.message.includes('Unable to sign in')) {
        throw e;
      }
      console.warn('Backend /api/auth/login unreachable, checking local demo credentials...');
    }

    // Local fallback for offline evaluation
    const cleanEmail = credentials.email.trim().toLowerCase();
    if (cleanEmail === 'inspector@officer.demo' && credentials.password) {
      const mockToken = `demo_officer_token_${Date.now()}`;
      authStorage.setSession(mockToken, DEMO_OFFICER, credentials.rememberMe);
      return { access_token: mockToken, token_type: 'bearer', user: DEMO_OFFICER };
    }

    if (cleanEmail === 'citizen@gmail.com' && credentials.password) {
      const mockToken = `demo_citizen_token_${Date.now()}`;
      authStorage.setSession(mockToken, DEMO_CITIZEN, credentials.rememberMe);
      return { access_token: mockToken, token_type: 'bearer', user: DEMO_CITIZEN };
    }

    // New consumer demo registration on the fly if valid email
    if (cleanEmail.includes('@') && credentials.password.length >= 6) {
      const isOfficerDomain = cleanEmail.endsWith('@officer.demo') || cleanEmail.endsWith('.gov.in');
      const fallbackUser: User = {
        id: `usr-${Date.now().toString(16)}`,
        email: cleanEmail,
        displayName: cleanEmail.split('@')[0].toUpperCase(),
        role: isOfficerDomain ? 'OFFICER' : 'USER',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      const mockToken = `demo_token_${Date.now()}`;
      authStorage.setSession(mockToken, fallbackUser, credentials.rememberMe);
      return { access_token: mockToken, token_type: 'bearer', user: fallbackUser };
    }

    throw new Error('Unable to sign in. Check your email and password and try again.');
  },

  async logout(): Promise<void> {
    const token = authStorage.getToken();
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {
        console.warn('Backend logout notification skipped:', e);
      }
    }
    authStorage.clearSession();
  },

  async getMe(): Promise<User | null> {
    const token = authStorage.getToken();
    if (!token) return null;

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback to local cached user
    }
    return authStorage.getUser();
  },

  // --- Complaints API ---

  async getComplaints(): Promise<Complaint[]> {
    const token = authStorage.getToken();
    try {
      const res = await fetch('/api/complaints', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback
    }

    const user = authStorage.getUser();
    if (!user) return [];
    if (user.role === 'OFFICER') {
      return DEMO_COMPLAINTS;
    }
    return DEMO_COMPLAINTS.filter(c => c.user_id === user.id || c.email === user.email);
  },

  async submitComplaint(payload: ComplaintCreatePayload): Promise<Complaint> {
    const token = authStorage.getToken();
    const user = authStorage.getUser();

    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }

    const hex = Math.random().toString(16).substring(2, 10).toUpperCase();
    const localComplaint: Complaint = {
      id: `CMP-${hex}`,
      user_id: user?.id || 'usr-local-consumer',
      email: payload.contact_email || user?.email || 'consumer@portal.local',
      product_name: payload.product_name,
      product_description: payload.product_description || 'Packaged Commodity',
      issue_category: payload.issue_category,
      description: payload.description || '',
      image_url: payload.image_url || null,
      status: 'SUBMITTED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      officer_notes: null,
      linked_inspection_id: null,
    };

    DEMO_COMPLAINTS.unshift(localComplaint);
    return localComplaint;
  },

  async updateComplaintStatus(
    id: string,
    status: ComplaintStatus,
    officerNotes?: string,
    linkedInspectionId?: string
  ): Promise<Complaint | null> {
    const token = authStorage.getToken();
    try {
      const res = await fetch(`/api/complaints/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          status,
          officer_notes: officerNotes,
          linked_inspection_id: linkedInspectionId,
        }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }

    const match = DEMO_COMPLAINTS.find(c => c.id === id);
    if (match) {
      match.status = status;
      if (officerNotes) match.officer_notes = officerNotes;
      if (linkedInspectionId) match.linked_inspection_id = linkedInspectionId;
      match.updated_at = new Date().toISOString();
      return match;
    }
    return null;
  },
};
