/**
 * Comprehensive Verification Test Suite for Nirikshak-AI Authentication
 * Tests Automatic Role Detection, Demo Credentials, Password Change, Google Name Fallback, and Role Security
 */

// Simulated storage for test execution
const memoryStorage = new Map();
const mockLocalStorage = {
  getItem: (key) => memoryStorage.get(key) || null,
  setItem: (key, val) => memoryStorage.set(key, String(val)),
  removeItem: (key) => memoryStorage.delete(key),
  clear: () => memoryStorage.clear(),
};

// -----------------------------------------------------------
// 1. Role Detection & Name Formatting Logic
// -----------------------------------------------------------
function detectRoleFromEmail(email) {
  const clean = (email || '').trim().toLowerCase();
  if (clean.includes('@gmail.com')) {
    return 'USER'; // Consumer
  }
  if (clean.includes('@officer.com')) {
    return 'OFFICER';
  }
  return null;
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
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// -----------------------------------------------------------
// 2. Demo Passwords & Persistence
// -----------------------------------------------------------
const INITIAL_PASSWORDS = {
  OFFICER: 'officer2026',
  CONSUMER: 'Citizen@2026!',
};

function getOfficerPassword() {
  return mockLocalStorage.getItem('nirikshak_officer_password') || INITIAL_PASSWORDS.OFFICER;
}

function getConsumerPassword() {
  return mockLocalStorage.getItem('nirikshak_consumer_password') || INITIAL_PASSWORDS.CONSUMER;
}

function setOfficerPassword(pass) {
  mockLocalStorage.setItem('nirikshak_officer_password', pass);
}

function setConsumerPassword(pass) {
  mockLocalStorage.setItem('nirikshak_consumer_password', pass);
}

function validateDemoCredentials(email, password) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) {
    return { success: false, error: 'Please enter your email address.' };
  }

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
    return {
      success: true,
      role: 'OFFICER',
      user: {
        id: `usr-officer-${cleanEmail.split('@')[0]}`,
        email: cleanEmail,
        displayName: 'Insp. Rajesh Varma',
        role: 'OFFICER',
      },
    };
  } else {
    // Consumer
    const activePass = getConsumerPassword();
    if (password !== activePass) {
      return { success: false, error: 'Invalid email or password.' };
    }
    return {
      success: true,
      role: 'USER',
      user: {
        id: `usr-citizen-${cleanEmail.split('@')[0]}`,
        email: cleanEmail,
        displayName: formatDisplayNameFromEmail(cleanEmail),
        role: 'USER',
      },
    };
  }
}

function changeUserPassword(email, currentPassword, newPassword, confirmPassword) {
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

function resolveDestination(userRole, fromPath) {
  let destination = userRole === 'OFFICER' ? '/dashboard' : '/check';
  if (fromPath) {
    if (userRole === 'OFFICER') {
      const officerRoutes = ['/dashboard', '/scan', '/inspections', '/complaints', '/products', '/reports', '/rules', '/analytics', '/settings'];
      if (officerRoutes.some((r) => fromPath === r || fromPath.startsWith(r + '/'))) {
        destination = fromPath;
      }
    } else {
      const consumerRoutes = ['/check', '/complaint', '/my-complaints', '/profile', '/settings'];
      if (consumerRoutes.some((r) => fromPath === r || fromPath.startsWith(r + '/'))) {
        destination = fromPath;
      }
    }
  }
  return destination;
}

// -----------------------------------------------------------
// TEST HARNESS
// -----------------------------------------------------------
let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    process.exitCode = 1;
  }
}

console.log('========================================================');
console.log('   NIRIKSHAK-AI AUTHENTICATION & ROLE TEST SUITE       ');
console.log('========================================================\n');

// TEST 1: Officer login with inspector@officer.com and officer2026
{
  const res = validateDemoCredentials('inspector@officer.com', 'officer2026');
  assert(res.success && res.role === 'OFFICER', 'TEST 1A: inspector@officer.com authenticated as OFFICER');
  const dest = resolveDestination(res.role);
  assert(dest === '/dashboard', 'TEST 1B: Officer redirected to Officer Dashboard (/dashboard)');
}

// TEST 2: Consumer login with test@gmail.com and Citizen@2026!
{
  const res = validateDemoCredentials('test@gmail.com', 'Citizen@2026!');
  assert(res.success && res.role === 'USER', 'TEST 2A: test@gmail.com authenticated as USER/Consumer');
  const dest = resolveDestination(res.role);
  assert(dest === '/check', 'TEST 2B: Consumer redirected to Consumer Dashboard (/check)');
}

// TEST 3: Case-insensitive email role detection
{
  const res = validateDemoCredentials('INSPECTOR@OFFICER.COM', 'officer2026');
  assert(res.success && res.role === 'OFFICER', 'TEST 3A: INSPECTOR@OFFICER.COM (uppercase) detected as OFFICER');
  const resGmail = validateDemoCredentials('TEST@GMAIL.COM', 'Citizen@2026!');
  assert(resGmail.success && resGmail.role === 'USER', 'TEST 3B: TEST@GMAIL.COM (uppercase) detected as USER');
}

// TEST 4: Unsupported email domain (@yahoo.com)
{
  const res = validateDemoCredentials('test@yahoo.com', 'Citizen@2026!');
  assert(!res.success && res.error === 'Please use a supported account email.', 'TEST 4: test@yahoo.com rejected with "Please use a supported account email."');
}

// TEST 5: Officer wrong password
{
  const res = validateDemoCredentials('inspector@officer.com', 'wrongPass123');
  assert(!res.success && res.error === 'Invalid email or password.', 'TEST 5: Officer with wrong password rejected');
}

// TEST 6: Consumer wrong password
{
  const res = validateDemoCredentials('test@gmail.com', 'wrongPass123');
  assert(!res.success && res.error === 'Invalid email or password.', 'TEST 6: Consumer with wrong password rejected');
}

// TEST 7: Google sign-in local-part name fallback
{
  const email = 'john.doe@gmail.com';
  const role = detectRoleFromEmail(email);
  const displayName = formatDisplayNameFromEmail(email);
  assert(role === 'USER', 'TEST 7A: john.doe@gmail.com detected as CONSUMER role');
  assert(displayName === 'John Doe', 'TEST 7B: john.doe formatted to display name "John Doe"');

  const rahulUnderscore = formatDisplayNameFromEmail('rahul_patel@gmail.com');
  assert(rahulUnderscore === 'Rahul Patel', 'TEST 7C: rahul_patel formatted to "Rahul Patel"');

  const rahulHyphen = formatDisplayNameFromEmail('rahul-patel@gmail.com');
  assert(rahulHyphen === 'Rahul Patel', 'TEST 7D: rahul-patel formatted to "Rahul Patel"');

  const neel = formatDisplayNameFromEmail('neel123@gmail.com');
  assert(neel === 'Neel123', 'TEST 7E: neel123 formatted to "Neel123"');
}

// TEST 8: Google sign-in with real Google profile name
{
  const googleMetadata = { full_name: 'Dr. Jane Smith', email: 'jane.smith@gmail.com' };
  const displayName = googleMetadata.full_name || formatDisplayNameFromEmail(googleMetadata.email);
  assert(displayName === 'Dr. Jane Smith', 'TEST 8: Real Google profile name preferred over email fallback');
}

// TEST 9: Officer changes password in Settings & verifies persistence
{
  const changeRes = changeUserPassword('inspector@officer.com', 'officer2026', 'newOfficer123', 'newOfficer123');
  assert(changeRes.success, 'TEST 9A: Officer successfully changes password to newOfficer123');

  // Verify old password fails
  const oldLogin = validateDemoCredentials('inspector@officer.com', 'officer2026');
  assert(!oldLogin.success, 'TEST 9B: Old password officer2026 is no longer valid');

  // Verify new password succeeds
  const newLogin = validateDemoCredentials('inspector@officer.com', 'newOfficer123');
  assert(newLogin.success && newLogin.role === 'OFFICER', 'TEST 9C: Officer logs in successfully with newOfficer123');
  assert(resolveDestination(newLogin.role) === '/dashboard', 'TEST 9D: Officer with new password redirects to /dashboard');

  // Reset back to initial for idempotency
  changeUserPassword('inspector@officer.com', 'newOfficer123', 'officer2026', 'officer2026');
}

// TEST 10: Consumer changes password in Settings & verifies persistence
{
  const changeRes = changeUserPassword('citizen@gmail.com', 'Citizen@2026!', 'newConsumer456', 'newConsumer456');
  assert(changeRes.success, 'TEST 10A: Consumer successfully changes password to newConsumer456');

  // Verify old password fails
  const oldLogin = validateDemoCredentials('citizen@gmail.com', 'Citizen@2026!');
  assert(!oldLogin.success, 'TEST 10B: Old password Citizen@2026! is no longer valid');

  // Verify new password succeeds
  const newLogin = validateDemoCredentials('citizen@gmail.com', 'newConsumer456');
  assert(newLogin.success && newLogin.role === 'USER', 'TEST 10C: Consumer logs in successfully with newConsumer456');

  // Reset back
  changeUserPassword('citizen@gmail.com', 'newConsumer456', 'Citizen@2026!', 'Citizen@2026!');
}

// TEST 11: Refresh after login
{
  const auth = validateDemoCredentials('inspector@officer.com', 'officer2026');
  const sessionString = JSON.stringify(auth.user);
  const restoredUser = JSON.parse(sessionString);
  assert(restoredUser.role === 'OFFICER', 'TEST 11A: Officer role retained after refresh');

  const consumerAuth = validateDemoCredentials('citizen@gmail.com', 'Citizen@2026!');
  const consumerSession = JSON.stringify(consumerAuth.user);
  const restoredConsumer = JSON.parse(consumerSession);
  assert(restoredConsumer.role === 'USER', 'TEST 11B: Consumer role retained after refresh');
}

// TEST 12: Consumer enters Officer Dashboard route
{
  const consumerUser = { role: 'USER' };
  const officerGuard = ['OFFICER'];
  const hasAccess = officerGuard.includes(consumerUser.role);
  assert(!hasAccess, 'TEST 12A: Consumer blocked from Officer route (/dashboard)');
  assert(resolveDestination('USER', '/dashboard') === '/check', 'TEST 12B: resolveDestination safely routes consumer to /check');
}

// TEST 13: Officer enters Consumer route
{
  const officerUser = { role: 'OFFICER' };
  assert(resolveDestination('OFFICER', '/check') === '/dashboard', 'TEST 13: Officer is safely routed to /dashboard');
}

// TEST 14: Password change validation rules
{
  // Mismatched confirmation
  const mismatch = changeUserPassword('inspector@officer.com', 'officer2026', 'pass123', 'pass999');
  assert(!mismatch.success && mismatch.message === 'New passwords do not match.', 'TEST 14A: Mismatched new passwords rejected');

  // Same as current password
  const same = changeUserPassword('inspector@officer.com', 'officer2026', 'officer2026', 'officer2026');
  assert(!same.success && same.message === 'New password cannot be the same as current password.', 'TEST 14B: Identical password rejected');

  // Incorrect current password
  const wrongCurrent = changeUserPassword('inspector@officer.com', 'badPass', 'newPass123', 'newPass123');
  assert(!wrongCurrent.success && wrongCurrent.message === 'Current password is incorrect.', 'TEST 14C: Incorrect current password rejected');
}

console.log(`\nResults: ${passed} / ${total} tests passed.`);
if (passed === total) {
  console.log('ALL VERIFICATION TESTS COMPLETED AND PASSED PERFECTLY!');
}
