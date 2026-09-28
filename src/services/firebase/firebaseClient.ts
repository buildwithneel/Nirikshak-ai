import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  UserCredential,
  getIdToken,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';

// ---------------------------------------------------------------------------
// Firebase configuration (all values are public — safe to expose in browser)
// ---------------------------------------------------------------------------
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

/**
 * Returns true when all required Firebase env vars are provided.
 */
export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId
  );
};

// ---------------------------------------------------------------------------
// Singleton Firebase App & Auth
// ---------------------------------------------------------------------------
let app: FirebaseApp | null = null;
let _auth: Auth | null = null;

if (isFirebaseConfigured()) {
  // Avoid duplicate initialization in HMR / dev environments
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  _auth = getAuth(app);
}

export const auth: Auth | null = _auth;

// ---------------------------------------------------------------------------
// Google Auth Provider
// ---------------------------------------------------------------------------
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({ prompt: 'select_account' });

// ---------------------------------------------------------------------------
// Auth Helpers
// ---------------------------------------------------------------------------

/**
 * Sign in with Google via a popup window (no page redirect required).
 */
export const signInWithGooglePopup = async (): Promise<UserCredential> => {
  if (!auth) {
    throw new Error(
      'Firebase is not configured. Please set VITE_FIREBASE_* environment variables.'
    );
  }
  return signInWithPopup(auth, googleProvider);
};

/**
 * Sign in with email and password.
 * @param rememberMe - If true, persists session in localStorage; otherwise sessionStorage.
 */
export const signInWithEmail = async (
  email: string,
  password: string,
  rememberMe = true
): Promise<UserCredential> => {
  if (!auth) {
    throw new Error(
      'Firebase is not configured. Please set VITE_FIREBASE_* environment variables.'
    );
  }
  await setPersistence(
    auth,
    rememberMe ? browserLocalPersistence : browserSessionPersistence
  );
  return signInWithEmailAndPassword(auth, email, password);
};

/**
 * Register a new user with email, password and optional display name.
 */
export const signUpWithEmail = async (
  email: string,
  password: string,
  displayName?: string
): Promise<UserCredential> => {
  if (!auth) {
    throw new Error(
      'Firebase is not configured. Please set VITE_FIREBASE_* environment variables.'
    );
  }
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName && credential.user) {
    try {
      await updateProfile(credential.user, { displayName });
    } catch (e) {
      console.warn('Failed to attach display name to Firebase profile:', e);
    }
  }
  return credential;
};

/**
 * Sign out the current Firebase user.
 */
export const signOutFirebase = async (): Promise<void> => {
  if (auth) {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Firebase sign-out notice:', e);
    }
  }
};

/**
 * Get the current Firebase user's ID token (for backend authorization).
 * Returns null when no user is signed in or Firebase is unconfigured.
 */
export const getFirebaseIdToken = async (): Promise<string | null> => {
  if (!auth?.currentUser) return null;
  try {
    return await getIdToken(auth.currentUser, /* forceRefresh */ false);
  } catch {
    return null;
  }
};

/**
 * Subscribe to Firebase auth state changes.
 * Returns the unsubscribe function.
 */
export const onFirebaseAuthStateChanged = (
  callback: (user: FirebaseUser | null) => void
): (() => void) => {
  if (!auth) {
    // Not configured – call callback immediately with null and return no-op
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

// ---------------------------------------------------------------------------
// Firebase Auth Error Code → User-Friendly Message
// ---------------------------------------------------------------------------
export const mapFirebaseAuthError = (code: string): string => {
  const map: Record<string, string> = {
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-not-found': 'No account found with this email address. You may create a new civilian account.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Invalid email or password. Please verify your credentials or register a new civilian account.',
    'auth/email-already-in-use': 'This email is already registered. Please sign in instead.',
    'auth/weak-password': 'Password must be at least 6 characters long.',
    'auth/too-many-requests':
      'Too many failed attempts. Please try again later or reset your password.',
    'auth/network-request-failed':
      'Network connection error. Check your internet connection and try again.',
    'auth/popup-closed-by-user': 'Google sign-in popup was closed before completing.',
    'auth/popup-blocked':
      'Sign-in popup was blocked by your browser. Please allow popups for this site or use credentials.',
    'auth/cancelled-popup-request': 'Google Sign-In was cancelled.',
    'auth/account-exists-with-different-credential':
      'An account already exists with the same email but different sign-in method.',
    'auth/unauthorized-domain':
      'This domain is not in Firebase authorized domains. Please add localhost/domain in Firebase Console > Authentication > Settings > Authorized domains, or use Demo Login below.',
    'auth/operation-not-allowed':
      'Google / Email sign-in is not enabled in Firebase Console. Please enable it in Authentication > Sign-in method.',
    'auth/configuration-not-found':
      'Firebase configuration error. Please check your project environment variables.',
    'auth/requires-recent-login':
      'This action requires you to sign in again. Please log out and log back in.',
    'auth/user-disabled': 'This account has been disabled. Please contact system administrator.',
  };
  return map[code] || 'Authentication failed. Please verify your credentials and try again.';
};
