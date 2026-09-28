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
import { getFirebaseIdToken } from '../services/firebase/firebaseClient';

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
  formatDisplayNameFromEmail,
  changeUserPassword,
  isPhoneNumber,
  normalizePhoneNumber,
  getMobileUserData,
  saveMobileUserData,
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
    
    // Check valid email format
    const detectedRole = detectRoleFromEmail(cleanEmail);
    if (!detectedRole) {
      throw new Error('Please enter a valid email address.');
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
          e.message.includes('valid email address'))
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

  async register(data: { email: string; password: string; displayName?: string }): Promise<AuthResponse> {
    const cleanEmail = (data.email || '').trim().toLowerCase();
    const detectedRole = detectRoleFromEmail(cleanEmail);
    if (!detectedRole) {
      throw new Error('Please enter a valid email address.');
    }

    try {
      const res = await fetch(getApiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password: data.password,
          display_name: data.displayName || formatDisplayNameFromEmail(cleanEmail),
        }),
      });

      if (res.ok) {
        const resData = await res.json();
        authStorage.setSession(resData.access_token, resData.user, true);
        return resData;
      }
    } catch {
      // Backend offline fallback
    }

    // Local registration fallback
    const displayName = data.displayName || formatDisplayNameFromEmail(cleanEmail);
    const localUser: User = {
      id: `usr-${detectedRole.toLowerCase()}-${Date.now().toString(36)}`,
      email: cleanEmail,
      displayName,
      role: detectedRole,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    // Save to locally registered users store
    if (typeof window !== 'undefined') {
      try {
        const storedRaw = localStorage.getItem('nirikshak_registered_users');
        const list = storedRaw ? JSON.parse(storedRaw) : [];
        list.push({ email: cleanEmail, password: data.password, user: localUser });
        localStorage.setItem('nirikshak_registered_users', JSON.stringify(list));
      } catch (_) {}
    }

    const mockToken = `local_${detectedRole.toLowerCase()}_token_${Date.now()}`;
    authStorage.setSession(mockToken, localUser, true);
    return { access_token: mockToken, token_type: 'bearer', user: localUser };
  },

  /**
   * Civilian authentication via mobile phone number.
   * If first time logging in, returns isFirstLogin: true so UI prompts for name.
   */
  async loginWithPhone(
    phone: string,
    otp?: string
  ): Promise<{ user: User; isFirstLogin: boolean; access_token: string }> {
    const cleanPhone = normalizePhoneNumber(phone);
    if (!isPhoneNumber(cleanPhone)) {
      throw new Error('Please enter a valid 10-digit mobile number.');
    }

    // Try backend endpoint if available
    try {
      const res = await fetch(getApiUrl('/api/auth/mobile-login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: cleanPhone, otp: otp || '123456' }),
      });
      if (res.ok) {
        const data = await res.json();
        authStorage.setSession(data.access_token, data.user, true);
        return {
          user: data.user,
          isFirstLogin: Boolean(data.user.is_first_login || data.is_first_login),
          access_token: data.access_token,
        };
      }
    } catch {
      // Offline fallback to local mobile profile store
    }

    const { displayName, isFirstLogin } = getMobileUserData(cleanPhone);
    const digits = cleanPhone.replace(/[^\d]/g, '').slice(-10);

    const user: User = {
      id: `usr-mob-${digits}`,
      email: `${digits}@citizen.nirikshak.gov`,
      phone: cleanPhone,
      phoneNumber: cleanPhone,
      displayName: displayName || undefined,
      role: 'USER',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      isFirstLogin,
    };

    const token = `mob_token_${digits}_${Date.now()}`;
    authStorage.setSession(token, user, true);

    return { user, isFirstLogin, access_token: token };
  },

  /**
   * Update civilian or user profile (e.g. Setting name on first mobile login).
   */
  async updateProfile(updates: { displayName?: string; phone?: string }): Promise<User> {
    const currentUser = authStorage.getUser();
    if (!currentUser) {
      throw new Error('User session not found.');
    }

    const updatedUser: User = {
      ...currentUser,
      displayName: updates.displayName?.trim() || currentUser.displayName,
      phone: updates.phone || currentUser.phone,
      phoneNumber: updates.phone || currentUser.phoneNumber,
      isFirstLogin: false,
    };

    // If mobile number exists, persist in local mobile users registry
    if (updatedUser.phone && updates.displayName) {
      saveMobileUserData(updatedUser.phone, updates.displayName);
    }

    // Attempt backend sync
    try {
      const token = authStorage.getToken();
      if (token && !token.startsWith('demo_') && !token.startsWith('local_') && !token.startsWith('mob_')) {
        await fetch(getApiUrl('/api/auth/profile'), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            display_name: updates.displayName,
            phone_number: updates.phone,
          }),
        });
      }
    } catch (_) {}

    const token = authStorage.getToken() || `token_${Date.now()}`;
    authStorage.setSession(token, updatedUser, true);
    return updatedUser;
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
    // Prefer a fresh Firebase ID token; fall back to stored token (demo sessions).
    const freshToken = await getFirebaseIdToken();
    const token = freshToken || authStorage.getToken();
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
    // Always prefer a fresh Firebase ID token so we never send an expired JWT.
    const freshToken = await getFirebaseIdToken();
    const token = freshToken || authStorage.getToken();
    if (!token) return null;

    // Keep stored token up to date if Firebase issued a fresh one.
    if (freshToken && freshToken !== authStorage.getToken()) {
      authStorage.setToken(freshToken);
    }

    try {
      const res = await fetch(getApiUrl('/api/auth/me'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        return await res.json();
      }
      if (res.status === 401) {
        // Demo tokens are not validated by the backend — preserve local session.
        if (token.startsWith('demo_')) {
          return authStorage.getUser();
        }
        return null;
      }
    } catch {
      // Offline — fall back to cached user.
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
