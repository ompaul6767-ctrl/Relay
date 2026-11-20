import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserRole } from '../types';
import { api } from '../api/client';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  title?: string;
}

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  isCheckingSession: boolean;
  loginWithCredentials: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  oneClickDemoLogin: (roleOrEmail: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  switchRole: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: 'lead',
  isAuthenticated: false,
  isLoading: false,
  isCheckingSession: true,
  loginWithCredentials: async () => ({ success: false }),
  oneClickDemoLogin: async () => ({ success: false }),
  switchRole: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('relay_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [role, setRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('relay_role') as UserRole;
    return saved || 'lead';
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('relay_token');
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCheckingSession, setIsCheckingSession] = useState<boolean>(true);

  // Verify active session on page refresh using GET /api/auth/me
  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      const token = localStorage.getItem('relay_token');
      if (!token) {
        if (isMounted) {
          setIsAuthenticated(false);
          setUser(null);
          setIsCheckingSession(false);
        }
        return;
      }

      try {
        const res = await api.getMe();
        if (isMounted && res && res.user) {
          setUser(res.user);
          setRole(res.user.role || 'lead');
          setIsAuthenticated(true);
          localStorage.setItem('relay_user', JSON.stringify(res.user));
          localStorage.setItem('relay_role', res.user.role || 'lead');
        }
      } catch (err: any) {
        console.warn('[AuthContext] Session expired or invalid on refresh:', err?.message);
        if (isMounted) {
          localStorage.removeItem('relay_token');
          localStorage.removeItem('relay_user');
          localStorage.removeItem('relay_role');
          setUser(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    }

    checkSession();

    // Listen for unauthorized events from api client
    const handleUnauthorized = () => {
      if (isMounted) {
        setUser(null);
        setIsAuthenticated(false);
      }
    };

    window.addEventListener('relay:unauthorized', handleUnauthorized);
    return () => {
      isMounted = false;
      window.removeEventListener('relay:unauthorized', handleUnauthorized);
    };
  }, []);

  const loginWithCredentials = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const res = await api.login(email, password);
      if (res.token && res.user) {
        localStorage.setItem('relay_token', res.token);
        localStorage.setItem('relay_user', JSON.stringify(res.user));
        localStorage.setItem('relay_role', res.user.role);
        setUser(res.user);
        setRole(res.user.role);
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, error: 'Login failed to return credentials.' };
    } catch (err: any) {
      const msg = err.message || 'Invalid email or password. Please try again.';
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  };

  const oneClickDemoLogin = async (roleOrEmail: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      let res: any;

      if (password) {
        // Direct login with email + password
        res = await api.login(roleOrEmail, password);
      } else {
        // One-click demo role login
        res = await api.demoLogin(roleOrEmail);
      }

      if (res && res.token && res.user) {
        localStorage.setItem('relay_token', res.token);
        localStorage.setItem('relay_user', JSON.stringify(res.user));
        localStorage.setItem('relay_role', res.user.role);
        setUser(res.user);
        setRole(res.user.role);
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, error: 'One-click demo login failed.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Demo authentication failed.' };
    } finally {
      setIsLoading(false);
    }
  };

  const switchRole = async (newRole: UserRole) => {
    try {
      setIsLoading(true);
      const res = await api.demoLogin(newRole);
      if (res.token && res.user) {
        localStorage.setItem('relay_token', res.token);
        localStorage.setItem('relay_user', JSON.stringify(res.user));
        localStorage.setItem('relay_role', res.user.role);
        setUser(res.user);
        setRole(res.user.role);
        setIsAuthenticated(true);
      }
    } catch (err) {
      console.error('[AuthContext] Switch role failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(async () => {
    try {
      await api.logout().catch(() => {});
    } finally {
      localStorage.removeItem('relay_token');
      localStorage.removeItem('relay_user');
      localStorage.removeItem('relay_role');
      setUser(null);
      setIsAuthenticated(false);
      setRole('lead');
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        isLoading,
        isCheckingSession,
        loginWithCredentials,
        oneClickDemoLogin,
        switchRole,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
