import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, LoginCredentials, AuthResponse } from './authTypes';
import { authApi, authStorage } from './authApi';
import {
  signInWithGooglePopup,
  signInWithEmail,
  signUpWithEmail,
  signOutFirebase,
  onFirebaseAuthStateChanged,
  getFirebaseIdToken,
  isFirebaseConfigured,
  mapFirebaseAuthError,
} from '../services/firebase/firebaseClient';
import {
  formatDisplayNameFromEmail,
  detectRoleFromEmail,
  validateDemoCredentials,
} from '../config/demoAccounts';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isOfficer: boolean;
  isConsumer: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  signUp: (credentials: { email: string; password: string; displayName?: string }) => Promise<AuthResponse>;
  loginWithGoogle: (redirectTo?: string) => Promise<void>;
  loginAsDemoCitizen: () => AuthResponse;
  loginAsDemoOfficer: () => AuthResponse;
  loginWithPhone: (phone: string, otp?: string) => Promise<{ user: User; isFirstLogin: boolean }>;
  updateUserProfile: (updates: { displayName?: string; phone?: string }) => Promise<User>;
  logout: () => Promise<void>;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  clearError: () => void;
  changePassword: (currentPass: string, newPass: string, confirmPass: string) => { success: boolean; message: string };
  isFirebaseEnabled: boolean;
  /** @deprecated use isFirebaseEnabled */
  isSupabaseEnabled: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => authStorage.getUser());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to Firebase auth state changes.
    // When Firebase is not configured the helper calls back immediately with null
    // and the app falls back to the local/demo session.
    const unsubscribe = onFirebaseAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // Grab a fresh ID token and store it so authApi can attach it to requests.
        try {
          const idToken = await getFirebaseIdToken();
          if (idToken) {
            authStorage.setToken(idToken);
          }

          // Try to load the canonical user from the backend.
          let appUser: User | null = null;
          try {
            appUser = await authApi.getMe();
          } catch {
            // Backend unreachable — build a minimal local user from Firebase profile.
          }

          if (!appUser) {
            const email = firebaseUser.email || 'citizen@gmail.com';
            const role = detectRoleFromEmail(email) || 'USER';
            const displayName =
              firebaseUser.displayName ||
              formatDisplayNameFromEmail(email);

            const localUser: User = {
              id: firebaseUser.uid,
              email,
              displayName,
              role,
              createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
              lastLoginAt: firebaseUser.metadata.lastSignInTime || new Date().toISOString(),
            };
            authStorage.setSession(idToken || `fb_${firebaseUser.uid}`, localUser, true);
            appUser = localUser;
          }

          setUser(appUser);
        } catch (e) {
          console.warn('Could not sync Firebase user with backend:', e);
        }
      } else {
        // Firebase signed out — check if there is still a local/demo session.
        const storedUser = authStorage.getUser();
        const storedToken = authStorage.getToken();
        if (storedToken?.startsWith('demo_') && storedUser) {
          // Keep demo session alive; Firebase is not managing this user.
          setUser(storedUser);
        } else {
          // No valid session at all.
          authStorage.clearSession();
          setUser(null);
        }
      }

      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // Email / Password login
  // ---------------------------------------------------------------------------
  const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      if (isFirebaseConfigured()) {
        try {
          // --- Primary Firebase authentication path ---
          const userCredential = await signInWithEmail(
            credentials.email,
            credentials.password,
            credentials.rememberMe
          );
          const idToken = await userCredential.user.getIdToken();
          authStorage.setToken(idToken);

          // Try backend sync; fall back to local user derivation.
          let appUser: User | null = null;
          try {
            appUser = await authApi.getMe();
          } catch { /* offline */ }

          if (!appUser) {
            const email = userCredential.user.email || credentials.email;
            const role = detectRoleFromEmail(email) || 'USER';
            appUser = {
              id: userCredential.user.uid,
              email,
              displayName:
                userCredential.user.displayName ||
                formatDisplayNameFromEmail(email),
              role,
              createdAt: userCredential.user.metadata.creationTime || new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
            };
            authStorage.setSession(idToken, appUser, credentials.rememberMe);
          }

          setUser(appUser);
          return {
            access_token: idToken,
            token_type: 'bearer',
            user: appUser,
          };
        } catch (fbErr: any) {
          // If Firebase rejects (e.g. account not in Firebase console yet, or demo credentials used),
          // check if credentials match demo accounts store or backend database
          const demoResult = validateDemoCredentials(credentials.email, credentials.password);
          if (demoResult.success) {
            const mockToken = `demo_${demoResult.role.toLowerCase()}_token_${Date.now()}`;
            authStorage.setSession(mockToken, demoResult.user, credentials.rememberMe);
            setUser(demoResult.user);
            return { access_token: mockToken, token_type: 'bearer', user: demoResult.user };
          }

          // Try backend direct /api/auth/login if reachable
          try {
            const response = await authApi.login(credentials);
            setUser(response.user);
            return response;
          } catch {
            const code: string = fbErr?.code || '';
            const msg = code.startsWith('auth/')
              ? mapFirebaseAuthError(code)
              : fbErr.message || 'Unable to sign in. Check your email and password and try again.';
            setError(msg);
            throw new Error(msg);
          }
        }
      } else {
        // --- Demo / backend-only path (Firebase not configured) ---
        const response = await authApi.login(credentials);
        setUser(response.user);
        return response;
      }
    } catch (err: any) {
      const msg = err.message || 'Unable to sign in. Check your email and password and try again.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Civilian Registration / Sign Up
  // ---------------------------------------------------------------------------
  const signUp = async (credentials: {
    email: string;
    password: string;
    displayName?: string;
  }): Promise<AuthResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      if (isFirebaseConfigured()) {
        try {
          const userCredential = await signUpWithEmail(
            credentials.email,
            credentials.password,
            credentials.displayName
          );
          const idToken = await userCredential.user.getIdToken();
          authStorage.setToken(idToken);

          const email = userCredential.user.email || credentials.email;
          const role = detectRoleFromEmail(email) || 'USER';
          const displayName =
            credentials.displayName ||
            userCredential.user.displayName ||
            formatDisplayNameFromEmail(email);

          const appUser: User = {
            id: userCredential.user.uid,
            email,
            displayName,
            role,
            createdAt: userCredential.user.metadata.creationTime || new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          };
          authStorage.setSession(idToken, appUser, true);
          setUser(appUser);
          return {
            access_token: idToken,
            token_type: 'bearer',
            user: appUser,
          };
        } catch (fbErr: any) {
          const code: string = fbErr?.code || '';
          if (code === 'auth/email-already-in-use') {
            throw new Error('An account with this email address already exists. Please sign in.');
          }
          if (code.startsWith('auth/')) {
            throw new Error(mapFirebaseAuthError(code));
          }
          // Fall back to backend / local registration
          const res = await authApi.register(credentials);
          setUser(res.user);
          return res;
        }
      } else {
        const res = await authApi.register(credentials);
        setUser(res.user);
        return res;
      }
    } catch (err: any) {
      const msg = err.message || 'Unable to create account. Please try again.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Google Sign-In (popup)
  // ---------------------------------------------------------------------------
  const loginWithGoogle = async (_redirectTo?: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      if (isFirebaseConfigured()) {
        await signInWithGooglePopup();
      } else {
        throw new Error(
          'Firebase is not configured. Please add VITE_FIREBASE_* variables to your .env file.'
        );
      }
    } catch (err: any) {
      const code: string = err?.code || '';
      const msg = code.startsWith('auth/')
        ? mapFirebaseAuthError(code)
        : err.message || 'Unable to initiate Google Sign In.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 1-Click Demo Logins (for seamless development, testing, and evaluation)
  // ---------------------------------------------------------------------------
  const loginAsDemoCitizen = (): AuthResponse => {
    const demoResult = validateDemoCredentials('citizen@gmail.com', 'Citizen@2026!');
    if (demoResult.success) {
      const mockToken = `demo_consumer_token_${Date.now()}`;
      authStorage.setSession(mockToken, demoResult.user, true);
      setUser(demoResult.user);
      setError(null);
      return { access_token: mockToken, token_type: 'bearer', user: demoResult.user };
    }
    throw new Error('Unable to sign in as demo citizen.');
  };

  const loginAsDemoOfficer = (): AuthResponse => {
    const demoResult = validateDemoCredentials('inspector@officer.com', 'officer2026');
    if (demoResult.success) {
      const mockToken = `demo_officer_token_${Date.now()}`;
      authStorage.setSession(mockToken, demoResult.user, true);
      setUser(demoResult.user);
      setError(null);
      return { access_token: mockToken, token_type: 'bearer', user: demoResult.user };
    }
    throw new Error('Unable to sign in as demo officer.');
  };

  // ---------------------------------------------------------------------------
  // Mobile Phone Login (Civilian Quick Access)
  // ---------------------------------------------------------------------------
  const loginWithPhone = async (
    phone: string,
    otp?: string
  ): Promise<{ user: User; isFirstLogin: boolean }> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.loginWithPhone(phone, otp);
      setUser(res.user);
      return { user: res.user, isFirstLogin: res.isFirstLogin };
    } catch (err: any) {
      const msg = err.message || 'Unable to sign in with mobile number.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Profile Update (e.g., Setting display name on first login)
  // ---------------------------------------------------------------------------
  const updateUserProfile = async (updates: { displayName?: string; phone?: string }): Promise<User> => {
    try {
      const updated = await authApi.updateProfile(updates);
      setUser(updated);
      return updated;
    } catch (err: any) {
      const msg = err.message || 'Failed to update profile.';
      setError(msg);
      throw new Error(msg);
    }
  };

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------
  const logout = async () => {
    setIsLoading(true);
    try {
      await signOutFirebase();
      await authApi.logout();
    } finally {
      setUser(null);
      setError(null);
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Password Change (demo/local mode only)
  // ---------------------------------------------------------------------------
  const changePassword = (currentPass: string, newPass: string, confirmPass: string) => {
    return authApi.changePassword(currentPass, newPass, confirmPass);
  };

  // ---------------------------------------------------------------------------
  // Role Helpers
  // ---------------------------------------------------------------------------
  const hasRole = (role: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    return user.role === role;
  };

  const isOfficer = user?.role === 'OFFICER';
  const isConsumer = user?.role === 'USER';
  const firebaseEnabled = isFirebaseConfigured();

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        isOfficer,
        isConsumer,
        login,
        signUp,
        loginWithGoogle,
        loginAsDemoCitizen,
        loginAsDemoOfficer,
        loginWithPhone,
        updateUserProfile,
        logout,
        hasRole,
        changePassword,
        clearError: () => setError(null),
        isFirebaseEnabled: firebaseEnabled,
        // Backward-compat alias so existing usages of isSupabaseEnabled don't break
        isSupabaseEnabled: firebaseEnabled,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
