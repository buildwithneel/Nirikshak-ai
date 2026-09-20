import {
  User,
  UserRole,
  LoginCredentials,
  AuthResponse,
  Complaint,
  ComplaintCreatePayload,
  ComplaintStatus,
} from './authTypes';
import { getApiUrl } from '../services/api/config';

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

  setToken: (token: string): void => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {}
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

import {
  validateDemoCredentials,
  detectRoleFromEmail,
  changeUserPassword,
} from '../config/demoAccounts';

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
    const cleanEmail = (credentials.email || '').trim().toLowerCase();
    
    // Check supported account domains (@gmail.com for Consumer, @officer.com for Officer)
    const detectedRole = detectRoleFromEmail(cleanEmail);
    if (!detectedRole) {
      throw new Error('Please use a supported account email.');
    }

    try {
      const res = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (res.ok) {
        const data = await res.json();
        authStorage.setSession(data.access_token, data.user, credentials.rememberMe);
        return data;
      }

      if (res.status === 401 || res.status === 400) {
        throw new Error('Invalid email or password.');
      }
    } catch (e: any) {
      if (
        e.message &&
        (e.message.includes('Invalid email') ||
          e.message.includes('Incorrect email') ||
          e.message.includes('supported account email'))
      ) {
        throw e;
      }
      console.warn('Backend /api/auth/login unreachable, validating against demo credentials store...');
    }

    // Local authoritative evaluation
    const demoResult = validateDemoCredentials(credentials.email, credentials.password);
    if (demoResult.success) {
      const mockToken = `demo_${demoResult.role.toLowerCase()}_token_${Date.now()}`;
      authStorage.setSession(mockToken, demoResult.user, credentials.rememberMe);
      return { access_token: mockToken, token_type: 'bearer', user: demoResult.user };
    }

    throw new Error(demoResult.error || 'Invalid email or password.');
  },

  changePassword(
    currentPass: string,
    newPass: string,
    confirmPass: string
  ): { success: boolean; message: string } {
    const user = authStorage.getUser();
    if (!user || !user.email) {
      return { success: false, message: 'You must be signed in to change your password.' };
    }
    return changeUserPassword(user.email, currentPass, newPass, confirmPass);
  },

  async logout(): Promise<void> {
    const token = authStorage.getToken();
    if (token) {
      try {
        await fetch(getApiUrl('/api/auth/logout'), {
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
      const res = await fetch(getApiUrl('/api/auth/me'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        return await res.json();
      }
      if (res.status === 401) {
        // If token was a demo token, maintain local session
        if (token.startsWith('demo_')) {
          return authStorage.getUser();
        }
        return null;
      }
    } catch {
      // Fallback to local cached user when offline
      return authStorage.getUser();
    }
    return authStorage.getUser();
  },

  // --- Complaints API ---

  async getComplaints(): Promise<Complaint[]> {
    const token = authStorage.getToken();
    try {
      const res = await fetch(getApiUrl('/api/complaints'), {
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
      const res = await fetch(getApiUrl('/api/complaints'), {
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
      const res = await fetch(getApiUrl(`/api/complaints/${id}/status`), {
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
