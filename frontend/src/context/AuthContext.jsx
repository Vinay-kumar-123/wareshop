import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { setAuthToken, clearAuthToken } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Admin credentials and Bearer session token are kept strictly in React memory (never persisted in localStorage)
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const clearLocalSession = useCallback(() => {
    clearAuthToken();
    setToken(null);
    setAdmin(null);
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (token) {
      setIsLoading(true);
      setAuthToken(token);
      api
        .get('/admin/auth/me')
        .then((res) => {
          if (!isMounted) return;
          if (res.success && res.data) {
            setAdmin(res.data);
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
    if (res.success && res.data && res.data.token) {
      const { token: sessionToken, email: adminEmail, role } = res.data;
      const user = { email: adminEmail, role };
      setAuthToken(sessionToken);
      setToken(sessionToken);
      setAdmin(user);
      return { success: true };
    }
    throw new Error(res.message || 'Login failed');
  };

  const logout = async () => {
    const activeToken = token;
    try {
      await api.post(
        '/admin/auth/logout',
        {},
        activeToken ? { headers: { Authorization: `Bearer ${activeToken}` } } : {}
      );
    } catch {
      // Ignore network error during logout cleanup
    }
    clearLocalSession();
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        token,
        login,
        logout,
        isLoading,
        isAuthenticated: Boolean(admin),
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
