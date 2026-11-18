import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '../types';
import { api } from '../api/client';

interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  title?: string;
}

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isLoading: boolean;
  switchRole: (role: UserRole) => Promise<void>;
  loginWithCredentials: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: 'lead',
  isLoading: false,
  switchRole: async () => {},
  loginWithCredentials: async () => false,
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('relay_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [role, setRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('relay_role') as UserRole;
    return saved || 'lead';
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Initialize with demo lead login if no user present
  useEffect(() => {
    if (!user) {
      switchRole('lead');
    }
  }, []);

  const switchRole = async (newRole: UserRole) => {
    try {
      setIsLoading(true);
      const res = await api.demoLogin(newRole);
      if (res.token) {
        localStorage.setItem('relay_token', res.token);
        localStorage.setItem('relay_user', JSON.stringify(res.user));
        localStorage.setItem('relay_role', res.user.role);
        setUser(res.user);
        setRole(res.user.role);
      }
    } catch (err) {
      console.error('[AuthContext] Demo login failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithCredentials = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const res = await api.login(email, password);
      if (res.token) {
        localStorage.setItem('relay_token', res.token);
        localStorage.setItem('relay_user', JSON.stringify(res.user));
        localStorage.setItem('relay_role', res.user.role);
        setUser(res.user);
        setRole(res.user.role);
        return true;
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('relay_token');
    localStorage.removeItem('relay_user');
    localStorage.removeItem('relay_role');
    setUser(null);
    setRole('lead');
  };

  return (
    <AuthContext.Provider value={{ user, role, isLoading, switchRole, loginWithCredentials, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
