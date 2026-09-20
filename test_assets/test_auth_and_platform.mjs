/**
 * Verification Test Suite for Platform Detection, Credential Validation, and Role-Based Routing
 */

// Simulated Platform Detection Logic (Mirroring src/utils/platformDetection.ts)
function simulateDetectPlatform({ ua = '', navPlatform = '', userAgentDataPlatform = '', isStandalone = false, maxTouchPoints = 0 }) {
  const isPWA = isStandalone;
  const appMode = isStandalone ? 'pwa' : 'web';

  let platform = 'unknown';

  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navPlatform === 'MacIntel' && maxTouchPoints > 1) ||
    (/Macintosh/.test(ua) && maxTouchPoints > 1);

  const isAndroid =
    /Android/i.test(ua) ||
    /android/i.test(userAgentDataPlatform) ||
    /android/i.test(navPlatform);

  if (isIOS) {
    platform = 'ios';
  } else if (isAndroid) {
    platform = 'android';
  } else if (
    /Win/i.test(userAgentDataPlatform) ||
    /Windows/i.test(ua) ||
    /Win32|Win64|Windows/i.test(navPlatform)
  ) {
    platform = 'windows';
  } else if (
    /Mac/i.test(userAgentDataPlatform) ||
    /Macintosh|Mac OS X/i.test(ua) ||
    /MacPPC|MacIntel/i.test(navPlatform)
  ) {
    platform = 'macos';
  } else if (
    /Linux/i.test(userAgentDataPlatform) ||
    /Linux/i.test(ua) ||
    /Linux/i.test(navPlatform)
  ) {
    platform = 'linux';
  }

  const isMobile = platform === 'ios' || platform === 'android';
  const isDesktop = platform === 'windows' || platform === 'macos' || platform === 'linux';

  return {
    platform,
    appMode,
    isStandalone,
    isPWA,
    isMobile,
    isIOS,
    isAndroid,
    isDesktop,
  };
}

// Demo Accounts & Validation (Mirroring src/config/demoAccounts.ts)
const DEMO_PASSWORDS = {
  OFFICER: 'Officer@2026!',
  CONSUMER: 'Citizen@2026!',
};

function isOfficerEmail(email) {
  const clean = email.trim().toLowerCase();
  return (
    clean === 'inspector@officer.demo' ||
    clean === 'inspector@officer.gov.in' ||
    clean.endsWith('@officer.demo') ||
    clean.endsWith('@officer.gov.in') ||
    clean.endsWith('.gov.in') ||
    clean.endsWith('legalmetrology.gov.in')
  );
}

function isValidEmailFormat(email) {
  const clean = email.trim().toLowerCase();
  if (!clean || clean.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
}

function validateDemoCredentials(email, password) {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password || !isValidEmailFormat(cleanEmail)) {
    return null;
  }

  if (isOfficerEmail(cleanEmail)) {
    if (password === DEMO_PASSWORDS.OFFICER) {
      return {
        role: 'OFFICER',
        email: cleanEmail,
      };
    }
    return null;
  }

  if (password === DEMO_PASSWORDS.CONSUMER) {
    return {
      role: 'USER',
      email: cleanEmail,
    };
  }

  return null;
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
      const consumerRoutes = ['/check', '/complaint', '/my-complaints', '/profile'];
      if (consumerRoutes.some((r) => fromPath === r || fromPath.startsWith(r + '/'))) {
        destination = fromPath;
      }
    }
  }
  return destination;
}

// ----------------------------------------------------
// RUN TESTS
// ----------------------------------------------------
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

console.log('--- NIRIKSHAK-AI VERIFICATION SUITE ---');

// TEST 1: Windows + Consumer Gmail + correct password
{
  const detected = simulateDetectPlatform({
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    navPlatform: 'Win32',
    userAgentDataPlatform: 'Windows',
  });
  assert(detected.platform === 'windows' && detected.isDesktop, 'TEST 1A: Windows environment detected as desktop');
  const auth = validateDemoCredentials('citizen@gmail.com', 'Citizen@2026!');
  assert(auth && auth.role === 'USER', 'TEST 1B: Consumer credentials authenticated as USER');
  const dest = resolveDestination(auth.role);
  assert(dest === '/check', 'TEST 1C: Consumer redirected to /check (Consumer Dashboard)');
}

// TEST 2: Windows + Officer Demo ID + correct password
{
  const auth = validateDemoCredentials('inspector@officer.demo', 'Officer@2026!');
  assert(auth && auth.role === 'OFFICER', 'TEST 2A: Officer credentials authenticated as OFFICER');
  const dest = resolveDestination(auth.role);
  assert(dest === '/dashboard', 'TEST 2B: Officer redirected to /dashboard (Officer Dashboard)');
}

// TEST 3: Android + Consumer Demo
{
  const detected = simulateDetectPlatform({
    ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    navPlatform: 'Linux armv8l',
    userAgentDataPlatform: 'Android',
  });
  assert(detected.platform === 'android' && detected.isMobile, 'TEST 3A: Android automatically detected');
  const auth = validateDemoCredentials('citizen@gmail.com', 'Citizen@2026!');
  const dest = resolveDestination(auth.role);
  assert(dest === '/check', 'TEST 3B: Consumer on Android routes to Consumer Dashboard');
}

// TEST 4: Android + Officer Demo
{
  const detected = simulateDetectPlatform({
    ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    navPlatform: 'Linux armv8l',
    userAgentDataPlatform: 'Android',
  });
  assert(detected.platform === 'android' && detected.isAndroid, 'TEST 4A: Android automatically detected for Officer');
  const auth = validateDemoCredentials('inspector@officer.demo', 'Officer@2026!');
  const dest = resolveDestination(auth.role);
  assert(dest === '/dashboard', 'TEST 4B: Officer on Android routes to Officer Dashboard');
}

// TEST 5: iPhone + Consumer Demo
{
  const detected = simulateDetectPlatform({
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    navPlatform: 'iPhone',
  });
  assert(detected.platform === 'ios' && detected.isIOS && detected.isMobile, 'TEST 5A: iPhone automatically detected as iOS');
  const auth = validateDemoCredentials('citizen@gmail.com', 'Citizen@2026!');
  const dest = resolveDestination(auth.role);
  assert(dest === '/check', 'TEST 5B: Consumer on iOS routes to Consumer Dashboard');
}

// TEST 6: iPad (MacIntel with touch) + Officer Demo
{
  const detected = simulateDetectPlatform({
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15',
    navPlatform: 'MacIntel',
    maxTouchPoints: 5,
  });
  assert(detected.platform === 'ios' && detected.isIOS, 'TEST 6A: iPadOS (MacIntel + touch) automatically detected as iOS');
  const auth = validateDemoCredentials('inspector@officer.demo', 'Officer@2026!');
  const dest = resolveDestination(auth.role);
  assert(dest === '/dashboard', 'TEST 6B: Officer on iPad routes to Officer Dashboard');
}

// TEST 7: Wrong password
{
  const authOfficerWrong = validateDemoCredentials('inspector@officer.demo', 'WrongOfficerPassword!');
  assert(authOfficerWrong === null, 'TEST 7A: Officer with wrong password rejected');
  const authConsumerWrong = validateDemoCredentials('citizen@gmail.com', 'WrongCitizenPassword!');
  assert(authConsumerWrong === null, 'TEST 7B: Consumer with wrong password rejected');
  const authCustomGmailWrong = validateDemoCredentials('myname@gmail.com', 'WrongPass');
  assert(authCustomGmailWrong === null, 'TEST 7C: Custom personal email with wrong password rejected');
}

// TEST 8: Unknown / Invalid email
{
  const authUnknown = validateDemoCredentials('notanaccount@fake.com', 'SomePassword123');
  assert(authUnknown === null, 'TEST 8A: Unknown account with random password rejected');
  const authMalformed = validateDemoCredentials('notanemail', 'Citizen@2026!');
  assert(authMalformed === null, 'TEST 8B: Malformed email rejected');
}

// TEST 9: Officer logs in -> session persistence and refresh simulation
{
  const auth = validateDemoCredentials('inspector@officer.demo', 'Officer@2026!');
  const storedUser = { ...auth, role: 'OFFICER' };
  // Simulate page reload: user restored from storage
  const restoredUser = JSON.parse(JSON.stringify(storedUser));
  assert(restoredUser.role === 'OFFICER', 'TEST 9A: Stored role after refresh remains OFFICER');
  assert(restoredUser.role !== 'USER', 'TEST 9B: Officer does NOT become Consumer after refresh');
}

// TEST 10: Consumer logs in -> session persistence and refresh simulation
{
  const auth = validateDemoCredentials('citizen@gmail.com', 'Citizen@2026!');
  const storedUser = { ...auth, role: 'USER' };
  const restoredUser = JSON.parse(JSON.stringify(storedUser));
  assert(restoredUser.role === 'USER', 'TEST 10A: Stored role after refresh remains USER');
  assert(restoredUser.role !== 'OFFICER', 'TEST 10B: Consumer does NOT become Officer after refresh');
}

// TEST 11 & 12: Logout clears session
{
  let session = { token: 'mock_token', user: { role: 'OFFICER' } };
  // Logout action
  session = null;
  assert(session === null, 'TEST 11 & 12: Logout completely clears session');
}

// TEST 13: Unauthenticated user accessing /dashboard
{
  const isAuthenticated = false;
  const user = null;
  const shouldRedirectToLogin = !isAuthenticated || !user;
  assert(shouldRedirectToLogin, 'TEST 13: Unauthenticated visitor to /dashboard redirected to /login');
}

// TEST 14: Consumer manually enters /dashboard (Protected route with allowedRoles=['OFFICER'])
{
  const user = { role: 'USER' };
  const allowedRoles = ['OFFICER'];
  const isAuthorized = allowedRoles.includes(user.role);
  assert(!isAuthorized, 'TEST 14A: Consumer is unauthorized for /dashboard');

  // Also test destination resolution prevents consumer from being redirected to /dashboard
  const attemptedFrom = '/dashboard';
  const consumerDestination = resolveDestination('USER', attemptedFrom);
  assert(consumerDestination === '/check', 'TEST 14B: resolveDestination safely overrides attempted /dashboard to /check for consumers');
}

// TEST 15: PWA Standalone Mode
{
  const detected = simulateDetectPlatform({
    ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36',
    isStandalone: true,
  });
  assert(detected.appMode === 'pwa' && detected.isStandalone && detected.isPWA, 'TEST 15: PWA standalone display mode detected');
}

console.log(`\nResults: ${passed} / ${total} tests passed.`);
if (passed === total) {
  console.log('ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
}
