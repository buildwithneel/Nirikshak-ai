import { User } from '../auth/authTypes';

/**
 * NIRIKSHAK AI — Centralized Demo Credentials, Role Detection & Password Store
 * Supports automatic role detection:
 *  - @gmail.com   -> CONSUMER (UserRole: 'USER')
 *  - @officer.com -> OFFICER  (UserRole: 'OFFICER')
 */

const STORAGE_KEY_OFFICER_PASS = 'nirikshak_officer_password';
const STORAGE_KEY_CONSUMER_PASS = 'nirikshak_consumer_password';

export const INITIAL_PASSWORDS = {
  OFFICER: 'officer2026',
  CONSUMER: 'Citizen@2026!',
} as const;

/**
 * Retrieve the active Officer password (persisted across reloads and logouts).
 */
export const getOfficerPassword = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(STORAGE_KEY_OFFICER_PASS) || INITIAL_PASSWORDS.OFFICER;
  }
  return INITIAL_PASSWORDS.OFFICER;
};

/**
 * Retrieve the active Consumer password (persisted across reloads and logouts).
 */
export const getConsumerPassword = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(STORAGE_KEY_CONSUMER_PASS) || INITIAL_PASSWORDS.CONSUMER;
  }
  return INITIAL_PASSWORDS.CONSUMER;
};

/**
 * Update the active Officer password in persistent local storage.
 */
export const setOfficerPassword = (newPass: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_OFFICER_PASS, newPass);
  }
};

/**
 * Update the active Consumer password in persistent local storage.
 */
export const setConsumerPassword = (newPass: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_CONSUMER_PASS, newPass);
  }
};

/**
 * Automatic role detection from email.
 * Institutional/Officer domains:
 *  - @gov.com, gov.com, .gov.com
 *  - @officer.com, @officer.demo, gov.in, legalmetrology.gov.in -> 'OFFICER'
 * All other valid email addresses -> 'USER' (Civilian / Consumer)
 * Invalid email strings -> null
 */
export function detectRoleFromEmail(email: string): 'OFFICER' | 'USER' | null {
  const clean = (email || '').trim().toLowerCase();
  if (!clean || !clean.includes('@')) {
    return null;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    return null;
  }
  const officerDomains = [
    '@gov.com',
    'gov.com',
    '@officer.com',
    '@officer.demo',
    'gov.in',
    'legalmetrology.gov.in',
  ];
  for (const domain of officerDomains) {
    if (clean.endsWith(domain) || clean.includes(domain)) {
      return 'OFFICER';
    }
  }
  return 'USER';
}

/**
 * Checks if a given input string looks like a standard phone / mobile number (10-15 digits).
 */
export function isPhoneNumber(value: string): boolean {
  const cleaned = (value || '').replace(/[\s\-\(\)\+]/g, '');
  return /^\d{10,15}$/.test(cleaned);
}

/**
 * Cleans phone number to digits only or + prefix.
 */
export function normalizePhoneNumber(value: string): string {
  const cleaned = (value || '').trim().replace(/[\s\-\(\)]/g, '');
  return cleaned;
}

/**
 * Detects user role from either email or phone number.
 * - Any mobile / phone number -> 'USER' (Civilian)
 * - Emails with @gov.com, @officer.com, etc. -> 'OFFICER'
 * - Standard emails (e.g. @gmail.com) -> 'USER'
 */
export function detectRoleFromIdentifier(identifier: string): 'OFFICER' | 'USER' | null {
  const clean = (identifier || '').trim();
  if (!clean) return null;
  if (isPhoneNumber(clean)) {
    return 'USER';
  }
  return detectRoleFromEmail(clean);
}

const STORAGE_KEY_MOBILE_USERS = 'nirikshak_mobile_users';

export interface MobileUserData {
  phone: string;
  displayName: string;
  createdAt: string;
  isFirstLogin: boolean;
}

/**
 * Retrieves persisted civilian profile for a mobile number.
 */
export function getMobileUserData(phone: string): { displayName: string | null; isFirstLogin: boolean } {
  const cleanPhone = normalizePhoneNumber(phone);
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_MOBILE_USERS);
      if (raw) {
        const map: Record<string, MobileUserData> = JSON.parse(raw);
        if (map[cleanPhone] && map[cleanPhone].displayName) {
          return { displayName: map[cleanPhone].displayName, isFirstLogin: false };
        }
      }
    } catch (_) {}
  }
  return { displayName: null, isFirstLogin: true };
}

/**
 * Saves a civilian's name upon first login via mobile.
 */
export function saveMobileUserData(phone: string, displayName: string): User {
  const cleanPhone = normalizePhoneNumber(phone);
  const name = displayName.trim();
  const digits = cleanPhone.replace(/[^\d]/g, '').slice(-10);
  const user: User = {
    id: `usr-mob-${digits}`,
    email: `${digits}@citizen.nirikshak.gov`,
    phone: cleanPhone,
    phoneNumber: cleanPhone,
    displayName: name,
    role: 'USER',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    isFirstLogin: false,
  };

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_MOBILE_USERS);
      const map: Record<string, MobileUserData> = raw ? JSON.parse(raw) : {};
      map[cleanPhone] = {
        phone: cleanPhone,
        displayName: name,
        createdAt: map[cleanPhone]?.createdAt || new Date().toISOString(),
        isFirstLogin: false,
      };
      localStorage.setItem(STORAGE_KEY_MOBILE_USERS, JSON.stringify(map));
    } catch (_) {}
  }

  return user;
}

/**
 * Derives a human-friendly display name from an email address (e.g., for Google fallback).
 * Examples:
 *  - john.doe@gmail.com     -> John Doe
 *  - rahul_patel@gmail.com   -> Rahul Patel
 *  - rahul-patel@gmail.com   -> Rahul Patel
 *  - director.sharma@gov.com -> Director Sharma
 *  - officer@gov.com         -> Officer
 *  - neel123@gmail.com       -> Neel123
 */
export function formatDisplayNameFromEmail(email: string): string {
  const localPart = (email || '').split('@')[0] || 'User';
  const parts = localPart
    .replace(/[._-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return 'User';

  return parts
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export type ValidateDemoResult =
  | { success: true; user: User; role: 'OFFICER' | 'USER'; isFirstLogin?: boolean }
  | { success: false; error: string };

/**
 * Validates credentials against demo accounts and registered local store.
 */
export function validateDemoCredentials(
  emailOrPhone: string,
  password?: string
): ValidateDemoResult {
  const cleanInput = (emailOrPhone || '').trim();

  if (!cleanInput) {
    return { success: false, error: 'Please enter your email or mobile number.' };
  }

  // Check if logging in via phone / mobile number
  if (isPhoneNumber(cleanInput)) {
    const cleanPhone = normalizePhoneNumber(cleanInput);
    const existing = getMobileUserData(cleanPhone);
    const digits = cleanPhone.replace(/[^\d]/g, '').slice(-10);

    const user: User = {
      id: `usr-mob-${digits}`,
      email: `${digits}@citizen.nirikshak.gov`,
      phone: cleanPhone,
      phoneNumber: cleanPhone,
      displayName: existing.displayName || undefined,
      role: 'USER',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      isFirstLogin: existing.isFirstLogin,
    };

    return {
      success: true,
      user,
      role: 'USER',
      isFirstLogin: existing.isFirstLogin,
    };
  }

  const cleanEmail = cleanInput.toLowerCase();

  // Standard email format validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { success: false, error: 'Please enter a valid email address or 10-digit mobile number.' };
  }

  const detectedRole = detectRoleFromEmail(cleanEmail);
  if (!detectedRole) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  // Check locally registered civilian accounts
  if (typeof window !== 'undefined') {
    try {
      const storedRaw = localStorage.getItem('nirikshak_registered_users');
      if (storedRaw) {
        const registeredList: Array<{ email: string; password: string; user: User }> = JSON.parse(storedRaw);
        const match = registeredList.find((u) => u.email.toLowerCase() === cleanEmail);
        if (match) {
          if (match.password === password) {
            return { success: true, user: match.user, role: match.user.role as 'OFFICER' | 'USER' };
          }
          return { success: false, error: 'Invalid email or password.' };
        }
      }
    } catch (_) {}
  }

  if (detectedRole === 'OFFICER') {
    const activePass = getOfficerPassword();
    if (
      password !== activePass &&
      password !== INITIAL_PASSWORDS.OFFICER &&
      password !== 'Officer@2026!' &&
      password !== 'Gov@2026!'
    ) {
      return { success: false, error: 'Invalid email or password.' };
    }
    const displayName =
      cleanEmail === 'inspector@officer.com' || cleanEmail === 'inspector@officer.demo'
        ? 'Insp. Rajesh Varma'
        : cleanEmail === 'officer@gov.com'
        ? 'Gov Metrology Officer'
        : cleanEmail === 'director@gov.com'
        ? 'Gov Metrology Director'
        : formatDisplayNameFromEmail(cleanEmail);

    const officerUser: User = {
      id: `usr-officer-${cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '')}`,
      email: cleanEmail,
      displayName,
      role: 'OFFICER',
      cadreCode: 'LM-DL-2024-881',
      jurisdiction: 'State Enforcement Directorate, Zone 1',
      createdAt: '2026-01-15T09:00:00Z',
      lastLoginAt: new Date().toISOString(),
    };
    return { success: true, user: officerUser, role: 'OFFICER' };
  } else {
    // Consumer (Civilian)
    const activePass = getConsumerPassword();
    if (
      password !== activePass &&
      password !== INITIAL_PASSWORDS.CONSUMER &&
      password !== 'Citizen@2026!' &&
      password !== 'citizen2026'
    ) {
      return { success: false, error: 'Invalid email or password.' };
    }
    const displayName =
      cleanEmail === 'citizen@gmail.com'
        ? 'Rahul Sharma'
        : formatDisplayNameFromEmail(cleanEmail);

    const consumerUser: User = {
      id: `usr-citizen-${cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '')}`,
      email: cleanEmail,
      displayName,
      role: 'USER',
      createdAt: '2026-02-10T14:30:00Z',
      lastLoginAt: new Date().toISOString(),
    };
    return { success: true, user: consumerUser, role: 'USER' };
  }
}

/**
 * Handles password modification with robust validation.
 * Persists the new password to local storage so subsequent logins use it.
 */
export function changeUserPassword(
  email: string,
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): { success: boolean; message: string } {
  const cleanEmail = (email || '').trim().toLowerCase();
  const detectedRole = detectRoleFromEmail(cleanEmail);

  if (!detectedRole) {
    return { success: false, message: 'Please use a supported account email.' };
  }

  if (!currentPassword) {
    return { success: false, message: 'Please enter your current password.' };
  }

  if (!newPassword || newPassword.trim().length === 0) {
    return { success: false, message: 'New password cannot be empty.' };
  }

  if (newPassword.length < 6) {
    return { success: false, message: 'New password must be at least 6 characters long.' };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, message: 'New passwords do not match.' };
  }

  if (currentPassword === newPassword) {
    return { success: false, message: 'New password cannot be the same as current password.' };
  }

  if (detectedRole === 'OFFICER') {
    const activePass = getOfficerPassword();
    if (currentPassword !== activePass) {
      return { success: false, message: 'Current password is incorrect.' };
    }
    setOfficerPassword(newPassword);
    return { success: true, message: 'Password changed successfully.' };
  } else {
    const activePass = getConsumerPassword();
    if (currentPassword !== activePass) {
      return { success: false, message: 'Current password is incorrect.' };
    }
    setConsumerPassword(newPassword);
    return { success: true, message: 'Password changed successfully.' };
  }
}
