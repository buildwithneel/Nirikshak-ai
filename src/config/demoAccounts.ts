import { User } from '../auth/authTypes';

/**
 * NIRIKSHAK AI — Official Predefined Demo Credentials & Configurations
 * Centralizes credentials for statutory evaluation and citizen testing.
 */

export const DEMO_PASSWORDS = {
  OFFICER: 'Officer@2026!',
  CONSUMER: 'Citizen@2026!',
} as const;

export const DEMO_OFFICER_USER: User = {
  id: 'usr-officer-001',
  email: 'inspector@officer.demo',
  displayName: 'Insp. R. Varma',
  role: 'OFFICER',
  cadreCode: 'LM-DL-2024-881',
  jurisdiction: 'State Enforcement Directorate, Zone 1',
  createdAt: '2026-01-15T09:00:00Z',
  lastLoginAt: new Date().toISOString(),
};

export const DEMO_CONSUMER_USER: User = {
  id: 'usr-citizen-002',
  email: 'citizen@gmail.com',
  displayName: 'Rahul Sharma',
  role: 'USER',
  createdAt: '2026-02-10T14:30:00Z',
  lastLoginAt: new Date().toISOString(),
};

/**
 * Validates if the email belongs to an authorized officer or government domain.
 */
export const isOfficerEmail = (email: string): boolean => {
  const clean = email.trim().toLowerCase();
  return (
    clean === 'inspector@officer.demo' ||
    clean === 'inspector@officer.gov.in' ||
    clean.endsWith('@officer.demo') ||
    clean.endsWith('@officer.gov.in') ||
    clean.endsWith('.gov.in') ||
    clean.endsWith('legalmetrology.gov.in')
  );
};

/**
 * Validates standard email address format.
 */
export const isValidEmailFormat = (email: string): boolean => {
  const clean = email.trim().toLowerCase();
  if (!clean || clean.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
};

/**
 * Authenticates credentials against the predefined demo system.
 * Password validation is strictly enforced. Returns user profile or null if invalid.
 */
export const validateDemoCredentials = (
  email: string,
  password: string
): { user: User; role: 'OFFICER' | 'USER' } | null => {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password || !isValidEmailFormat(cleanEmail)) {
    return null;
  }

  // 1. Officer Demo Accounts
  if (isOfficerEmail(cleanEmail)) {
    if (password === DEMO_PASSWORDS.OFFICER) {
      if (cleanEmail === 'inspector@officer.demo') {
        return {
          user: { ...DEMO_OFFICER_USER, lastLoginAt: new Date().toISOString() },
          role: 'OFFICER',
        };
      }
      // Authorized government/officer demo user
      const dynamicOfficer: User = {
        id: `usr-officer-${cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '')}`,
        email: cleanEmail,
        displayName: cleanEmail.split('@')[0].toUpperCase(),
        role: 'OFFICER',
        cadreCode: 'LM-OFFICIAL',
        jurisdiction: 'Legal Metrology Enforcement Directorate',
        createdAt: '2026-01-01T00:00:00Z',
        lastLoginAt: new Date().toISOString(),
      };
      return { user: dynamicOfficer, role: 'OFFICER' };
    }
    // Wrong password for officer account
    return null;
  }

  // 2. Consumer / Citizen Demo Accounts (e.g. citizen@gmail.com or personal emails)
  if (password === DEMO_PASSWORDS.CONSUMER) {
    if (cleanEmail === 'citizen@gmail.com') {
      return {
        user: { ...DEMO_CONSUMER_USER, lastLoginAt: new Date().toISOString() },
        role: 'USER',
      };
    }
    const username = cleanEmail.split('@')[0];
    const formattedName = username.charAt(0).toUpperCase() + username.slice(1);
    const dynamicConsumer: User = {
      id: `usr-citizen-${username.replace(/[^a-zA-Z0-9]/g, '')}`,
      email: cleanEmail,
      displayName: formattedName,
      role: 'USER',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
    return { user: dynamicConsumer, role: 'USER' };
  }

  // Password does not match consumer demo password either
  return null;
};
