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
 * Case-insensitive:
 *  - Contains @gmail.com   -> 'USER' (CONSUMER)
 *  - Contains @officer.com -> 'OFFICER'
 *  - Otherwise            -> null (unsupported)
 */
export function detectRoleFromEmail(email: string): 'OFFICER' | 'USER' | null {
  const clean = (email || '').trim().toLowerCase();
  if (clean.includes('@gmail.com')) {
    return 'USER';
  }
  if (clean.includes('@officer.com')) {
    return 'OFFICER';
  }
  return null;
}

/**
 * Derives a human-friendly display name from an email address (e.g., for Google fallback).
 * Examples:
 *  - john.doe@gmail.com    -> John Doe
 *  - rahul_patel@gmail.com  -> Rahul Patel
 *  - rahul-patel@gmail.com  -> Rahul Patel
 *  - neel123@gmail.com      -> Neel123
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
  | { success: true; user: User; role: 'OFFICER' | 'USER' }
  | { success: false; error: string };

/**
 * Validates credentials against the single authoritative demo accounts store.
 */
export function validateDemoCredentials(
  email: string,
  password: string
): ValidateDemoResult {
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!cleanEmail) {
    return { success: false, error: 'Please enter your email address.' };
  }

  // Standard email format validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  const detectedRole = detectRoleFromEmail(cleanEmail);
  if (!detectedRole) {
    return { success: false, error: 'Please use a supported account email.' };
  }

  if (detectedRole === 'OFFICER') {
    const activePass = getOfficerPassword();
    if (password !== activePass) {
      return { success: false, error: 'Invalid email or password.' };
    }
    const displayName =
      cleanEmail === 'inspector@officer.com'
        ? 'Insp. Rajesh Varma'
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
    // Consumer
    const activePass = getConsumerPassword();
    if (password !== activePass) {
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
