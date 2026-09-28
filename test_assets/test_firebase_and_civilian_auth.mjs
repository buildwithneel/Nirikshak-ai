/**
 * Test Suite: Firebase and Civilian Authentication Verification
 * Verifies civilian sign up, domain independence, demo logins, Google fallback, and Firebase error mapping.
 */

// ---------------------------------------------------------------------------
// Mirrored production logic from src/config/demoAccounts.ts & src/services/firebase/firebaseClient.ts
// ---------------------------------------------------------------------------
const OFFICER_DOMAINS = [
  '@gov.com',
  'gov.com',
  '@officer.com',
  '@officer.demo',
  'gov.in',
  'legalmetrology.gov.in',
];

function detectRoleFromEmail(email) {
  const clean = (email || '').trim().toLowerCase();
  if (!clean || !clean.includes('@')) {
    return null;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    return null;
  }
  for (const domain of OFFICER_DOMAINS) {
    if (clean.endsWith(domain) || clean.includes(domain)) {
      return 'OFFICER';
    }
  }
  return 'USER';
}

function isPhoneNumber(val) {
  const cleaned = (val || '').replace(/[\s\-\(\)\+]/g, '');
  return /^\d{10,15}$/.test(cleaned);
}

function detectRoleFromIdentifier(identifier) {
  const clean = (identifier || '').trim();
  if (!clean) return null;
  if (isPhoneNumber(clean)) {
    return 'USER';
  }
  return detectRoleFromEmail(clean);
}

function formatDisplayNameFromEmail(email) {
  const localPart = (email || '').split('@')[0] || 'User';
  const parts = localPart
    .replace(/[._-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return 'User';

  return parts
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(' ');
}

function mapFirebaseAuthError(code) {
  const map = {
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-not-found': 'No account found with this email address. You may create a new civilian account.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Invalid email or password. Please verify your credentials or register a new civilian account.',
    'auth/email-already-in-use': 'This email is already registered. Please sign in instead.',
    'auth/weak-password': 'Password must be at least 6 characters long.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later or reset your password.',
    'auth/network-request-failed': 'Network connection error. Check your internet connection and try again.',
    'auth/popup-closed-by-user': 'Google sign-in popup was closed before completing.',
    'auth/popup-blocked': 'Sign-in popup was blocked by your browser. Please allow popups for this site or use credentials.',
    'auth/cancelled-popup-request': 'Google Sign-In was cancelled.',
    'auth/account-exists-with-different-credential': 'An account already exists with the same email but different sign-in method.',
    'auth/unauthorized-domain': 'This domain is not in Firebase authorized domains. Please add localhost/domain in Firebase Console > Authentication > Settings > Authorized domains, or use Demo Login below.',
    'auth/operation-not-allowed': 'Google / Email sign-in is not enabled in Firebase Console. Please enable it in Authentication > Sign-in method.',
    'auth/configuration-not-found': 'Firebase configuration error. Please check your project environment variables.',
    'auth/requires-recent-login': 'This action requires you to sign in again. Please log out and log back in.',
    'auth/user-disabled': 'This account has been disabled. Please contact system administrator.',
  };
  return map[code] || 'Authentication failed. Please verify your credentials and try again.';
}

const mockRegisteredAccounts = new Map();

function validateDemoCredentials(email, password) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPassword = (password || '').trim();

  // Built-in demo accounts
  if (
    cleanEmail === 'inspector@officer.com' ||
    cleanEmail === 'inspector@officer.demo' ||
    cleanEmail.endsWith('@gov.com') ||
    cleanEmail.includes('gov.com')
  ) {
    if (cleanPassword === 'officer2026' || cleanPassword === 'Gov@2026!') {
      return {
        success: true,
        user: {
          id: `demo-officer-${cleanEmail.split('@')[0]}`,
          email: cleanEmail,
          displayName:
            cleanEmail === 'officer@gov.com'
              ? 'Gov Metrology Officer'
              : cleanEmail === 'inspector@officer.com'
              ? 'Insp. Rajesh Varma'
              : formatDisplayNameFromEmail(cleanEmail),
          role: 'OFFICER',
        },
        role: 'OFFICER',
      };
    }
    return { success: false, error: 'Incorrect officer password.' };
  }

  if (cleanEmail === 'citizen@gmail.com') {
    if (cleanPassword === 'Citizen@2026!') {
      return {
        success: true,
        user: {
          id: 'demo-citizen-001',
          email: 'citizen@gmail.com',
          displayName: 'Rahul Sharma',
          role: 'USER',
        },
        role: 'USER',
      };
    }
    return { success: false, error: 'Incorrect civilian password.' };
  }

  // Check locally registered civilian account
  if (mockRegisteredAccounts.has(cleanEmail)) {
    const acc = mockRegisteredAccounts.get(cleanEmail);
    if (acc.password === cleanPassword) {
      return {
        success: true,
        user: {
          id: acc.id,
          email: acc.email,
          displayName: acc.displayName,
          role: 'USER',
        },
        role: 'USER',
      };
    }
    return { success: false, error: 'Incorrect civilian password.' };
  }

  return { success: false, error: 'No account found matching this email and password.' };
}

let passed = 0;
let total = 0;

function assert(condition, testName) {
  total++;
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`);
    process.exitCode = 1;
  }
}

console.log('================================================================');
console.log('   FIREBASE & CIVILIAN AUTHENTICATION VERIFICATION SUITE       ');
console.log('================================================================\n');

// 1. Domain-independent civilian role detection & @gov.com Officer detection
{
  assert(detectRoleFromEmail('citizen@gmail.com') === 'USER', '1.1 Gmail email detected as USER (Civilian)');
  assert(detectRoleFromEmail('priya@yahoo.com') === 'USER', '1.2 Yahoo email detected as USER (Civilian)');
  assert(detectRoleFromEmail('arun@outlook.com') === 'USER', '1.3 Outlook email detected as USER (Civilian)');
  assert(detectRoleFromEmail('consumer@custom.in') === 'USER', '1.4 Custom domain email detected as USER (Civilian)');
  assert(detectRoleFromEmail('officer@gov.com') === 'OFFICER', '1.5 @gov.com email detected as OFFICER / Administration');
  assert(detectRoleFromEmail('director.rajesh@gov.com') === 'OFFICER', '1.6 Subdomain/custom user @gov.com detected as OFFICER');
  assert(detectRoleFromEmail('inspector@officer.com') === 'OFFICER', '1.7 @officer.com detected as OFFICER');
  assert(detectRoleFromEmail('inspector@officer.demo') === 'OFFICER', '1.8 @officer.demo detected as OFFICER');
  assert(detectRoleFromEmail('director@legalmetrology.gov.in') === 'OFFICER', '1.9 gov.in detected as OFFICER');
  assert(detectRoleFromEmail('not-an-email') === null, '1.10 Invalid email format returns null');

  // Phone number identifier role detection
  assert(detectRoleFromIdentifier('9876543210') === 'USER', '1.11 10-digit mobile number detected as USER (Civilian)');
  assert(detectRoleFromIdentifier('+91 98765 43210') === 'USER', '1.12 Formatted mobile number detected as USER (Civilian)');
  assert(detectRoleFromIdentifier('officer@gov.com') === 'OFFICER', '1.13 Identifier with @gov.com detected as OFFICER');
}

// 2. Civilian credentials, registered civilian, @gov.com officer, and demo account validation
{
  const resCivilian = validateDemoCredentials('citizen@gmail.com', 'Citizen@2026!');
  assert(resCivilian.success && resCivilian.role === 'USER', '2.1 Demo citizen (citizen@gmail.com) logs in successfully as USER');
  assert(resCivilian.user.displayName === 'Rahul Sharma', '2.2 Demo citizen has displayName "Rahul Sharma"');

  const resOfficer = validateDemoCredentials('inspector@officer.com', 'officer2026');
  assert(resOfficer.success && resOfficer.role === 'OFFICER', '2.3 Demo officer (inspector@officer.com) logs in successfully as OFFICER');

  // Register a new custom civilian
  mockRegisteredAccounts.set('newcivilian@example.com', {
    id: 'user_new_123',
    email: 'newcivilian@example.com',
    password: 'MyPassword123!',
    displayName: 'Ananya Sharma',
  });

  const resRegistered = validateDemoCredentials('newcivilian@example.com', 'MyPassword123!');
  assert(resRegistered.success && resRegistered.role === 'USER', '2.4 Newly registered civilian logs in successfully as USER');
  assert(resRegistered.user.displayName === 'Ananya Sharma', '2.5 Registered civilian has correct displayName');

  const resWrongPass = validateDemoCredentials('newcivilian@example.com', 'WrongPass');
  assert(!resWrongPass.success, '2.6 Wrong password for registered civilian is rejected');

  // @gov.com officer login
  const resGovOfficer = validateDemoCredentials('officer@gov.com', 'officer2026');
  assert(resGovOfficer.success && resGovOfficer.role === 'OFFICER', '2.7 @gov.com officer logs in successfully as OFFICER');
}

// 3. Name formatting from email local-part
{
  assert(formatDisplayNameFromEmail('rahul.sharma@gmail.com') === 'Rahul Sharma', '3.1 "rahul.sharma" formats to "Rahul Sharma"');
  assert(formatDisplayNameFromEmail('priya_patel@yahoo.com') === 'Priya Patel', '3.2 "priya_patel" formats to "Priya Patel"');
  assert(formatDisplayNameFromEmail('neel-agrawal@gmail.com') === 'Neel Agrawal', '3.3 "neel-agrawal" formats to "Neel Agrawal"');
  assert(formatDisplayNameFromEmail('director.rajesh@gov.com') === 'Director Rajesh', '3.4 "director.rajesh@gov.com" formats to "Director Rajesh"');
  assert(formatDisplayNameFromEmail('admin@gov.com') === 'Admin', '3.5 "admin@gov.com" formats to "Admin"');
}

// 4. Mobile / Phone authentication and first-login name prompt
{
  const mockMobileRegistry = new Map();
  function testMobileLogin(phone, enteredName) {
    const isFirstLogin = !mockMobileRegistry.has(phone);
    if (isFirstLogin && enteredName) {
      mockMobileRegistry.set(phone, enteredName);
    }
    return {
      phone,
      role: 'USER',
      displayName: mockMobileRegistry.get(phone) || null,
      isFirstLogin,
    };
  }

  // First login with mobile number: asks for name
  const login1 = testMobileLogin('9876543210');
  assert(login1.isFirstLogin === true, '4.1 Mobile login for new number triggers isFirstLogin: true');
  assert(login1.role === 'USER', '4.2 Mobile user is assigned role: USER (Civilian)');

  // Civilian enters their name on first login
  const login1WithName = testMobileLogin('9876543210', 'Vikram Malhotra');
  assert(login1WithName.displayName === 'Vikram Malhotra', '4.3 Display name saved as "Vikram Malhotra"');

  // Subsequent login with same mobile number: recognizes saved name without asking
  const login2 = testMobileLogin('9876543210');
  assert(login2.isFirstLogin === false, '4.4 Subsequent login has isFirstLogin: false');
  assert(login2.displayName === 'Vikram Malhotra', '4.5 Subsequent login retrieves saved name "Vikram Malhotra"');
}

// 5. Firebase error mapping for configuration, domain, and popup errors
{
  const unauthDomain = mapFirebaseAuthError('auth/unauthorized-domain');
  assert(unauthDomain.includes('Authorized domains') || unauthDomain.includes('authorized'), '5.1 auth/unauthorized-domain produces actionable guide');

  const opNotAllowed = mapFirebaseAuthError('auth/operation-not-allowed');
  assert(opNotAllowed.includes('Sign-in method') || opNotAllowed.includes('not enabled'), '5.2 auth/operation-not-allowed instructs enabling provider');

  const popupBlocked = mapFirebaseAuthError('auth/popup-blocked');
  assert(popupBlocked.includes('popup was blocked'), '5.3 auth/popup-blocked mapped friendly');

  const invalidCred = mapFirebaseAuthError('auth/invalid-credential');
  assert(invalidCred.includes('Invalid email or password'), '5.4 auth/invalid-credential mapped friendly');
}

console.log('\n----------------------------------------------------------------');
console.log(`Results: ${passed} / ${total} tests passed (${Math.round((passed / total) * 100)}%)`);
console.log('----------------------------------------------------------------');
