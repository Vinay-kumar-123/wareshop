import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    try {
      const saved = localStorage.getItem('konnevia_admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('konnevia_admin_token') || null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  const clearLocalSession = useCallback(() => {
    setToken(null);
    setAdmin(null);
    try {
      localStorage.removeItem('konnevia_admin_token');
      localStorage.removeItem('konnevia_admin_user');
    } catch {
      // Ignore storage errors
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Validate existing session on mount
    if (token) {
      api
        .get('/admin/auth/me')
        .then((res) => {
          if (!isMounted) return;
          if (res.success && res.data) {
            setAdmin(res.data);
            try {
              localStorage.setItem('konnevia_admin_user', JSON.stringify(res.data));
            } catch {}
          } else {
            clearLocalSession();
          }
        })
        .catch(() => {
          if (isMounted) {
            clearLocalSession();
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });
    } else {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [token, clearLocalSession]);

  const login = async (email, password) => {
    const res = await api.post('/admin/auth/login', { email, password });
    if (res.success && res.data) {
      const { token: sessionToken, email: adminEmail, role } = res.data;
      const user = { email: adminEmail, role };
      setToken(sessionToken);
      setAdmin(user);
      try {
        localStorage.setItem('konnevia_admin_token', sessionToken);
        localStorage.setItem('konnevia_admin_user', JSON.stringify(user));
      } catch {}
      return { success: true };
    }
    throw new Error(res.message || 'Login failed');
  };

  const logout = async () => {
    const activeToken = token;
    clearLocalSession();
    if (activeToken) {
      try {
        await api.post('/admin/auth/logout', {});
      } catch {
        // Session already cleared locally
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        token,
        login,
        logout,
        isLoading,
        isAuthenticated: !!token && !!admin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
