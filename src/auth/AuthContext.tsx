import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, LoginCredentials, AuthResponse } from './authTypes';
import { authApi, authStorage } from './authApi';
import { supabase, signInWithGoogle, signOutSupabase, isSupabaseConfigured } from '../services/supabase/supabaseClient';
import { formatDisplayNameFromEmail, detectRoleFromEmail } from '../config/demoAccounts';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isOfficer: boolean;
  isConsumer: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  loginWithGoogle: (redirectTo?: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  clearError: () => void;
  changePassword: (currentPass: string, newPass: string, confirmPass: string) => { success: boolean; message: string };
  isSupabaseEnabled: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => authStorage.getUser());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Initial verification against backend with stored token
    const verifySession = async () => {
      try {
        const token = authStorage.getToken();
        if (token) {
          const currentUser = await authApi.getMe();
          if (currentUser) {
            setUser(currentUser);
          } else {
            authStorage.clearSession();
            setUser(null);
          }
        }
      } catch (err) {
        console.warn('Session verification notice:', err);
      } finally {
        setIsLoading(false);
      }
    };

    verifySession();

    // 2. Supabase Auth listener (for Google OAuth redirects and token refresh)
    if (supabase) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.access_token) {
          authStorage.setToken(session.access_token);
          try {
            const currentUser = await authApi.getMe();
            if (currentUser) {
              setUser(currentUser);
            } else {
              const email = session.user?.email || 'citizen@gmail.com';
              const role = detectRoleFromEmail(email) || 'USER';

              // Prefer real Google profile full_name / name
              const googleFullName =
                session.user?.user_metadata?.full_name ||
                session.user?.user_metadata?.name ||
                session.user?.user_metadata?.user_name;

              // Fallback: derive sensible human-readable name from local-part of email
              const displayName = googleFullName || formatDisplayNameFromEmail(email);

              const googleUser: User = {
                id: session.user?.id || `usr-google-${Date.now()}`,
                email,
                displayName,
                role, // Google OAuth strictly defaults to consumer/citizen role
                createdAt: session.user?.created_at || new Date().toISOString(),
                lastLoginAt: new Date().toISOString(),
              };
              authStorage.setSession(session.access_token, googleUser, true);
              setUser(googleUser);
            }
          } catch (e) {
            console.warn('Could not sync user with backend:', e);
          }
        } else if (event === 'SIGNED_OUT') {
          authStorage.clearSession();
          setUser(null);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.login(credentials);
      setUser(response.user);
      return response;
    } catch (err: any) {
      const msg = err.message || 'Unable to sign in. Check your email and password and try again.';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (redirectTo?: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithGoogle(redirectTo);
    } catch (err: any) {
      const msg = err.message || 'Unable to initiate Google Sign In.';
      setError(msg);
      setIsLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await signOutSupabase();
      await authApi.logout();
    } finally {
      setUser(null);
      setError(null);
      setIsLoading(false);
    }
  };

  const changePassword = (currentPass: string, newPass: string, confirmPass: string) => {
    return authApi.changePassword(currentPass, newPass, confirmPass);
  };

  const hasRole = (role: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    return user.role === role;
  };

  const isOfficer = user?.role === 'OFFICER';
  const isConsumer = user?.role === 'USER';

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
        loginWithGoogle,
        logout,
        hasRole,
        changePassword,
        clearError: () => setError(null),
        isSupabaseEnabled: isSupabaseConfigured(),
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
