import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, LoginCredentials, AuthResponse } from './authTypes';
import { authApi, authStorage } from './authApi';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isOfficer: boolean;
  isConsumer: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => authStorage.getUser());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Validate session with backend or local store on initial mount
    const verifySession = async () => {
      try {
        const token = authStorage.getToken();
        if (token) {
          const currentUser = await authApi.getMe();
          if (currentUser) {
            setUser(currentUser);
          } else {
            // Token expired or invalid
            authStorage.clearSession();
            setUser(null);
          }
        }
      } catch (err) {
        console.warn('Session verification fallback:', err);
      } finally {
        setIsLoading(false);
      }
    };

    verifySession();
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

  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setError(null);
      setIsLoading(false);
    }
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
        logout,
        hasRole,
        clearError: () => setError(null),
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
