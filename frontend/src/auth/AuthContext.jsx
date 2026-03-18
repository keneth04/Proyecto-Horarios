import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

const AuthContext = createContext(null);

const readPersistedUser = () => {
  const raw = localStorage.getItem('user');
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (_) {
    localStorage.removeItem('user');
    return null;
  }
};

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(readPersistedUser);

  useEffect(() => {

    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error?.response?.status === 401) {
          logout(true);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(responseInterceptor);
    };
  }, [token]);

  const login = (nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem('token', nextToken);
    localStorage.setItem('user', JSON.stringify(nextUser));
    api.defaults.headers.common.Authorization = `Bearer ${nextToken}`;
  };

  const logout = (silent = false) => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete api.defaults.headers.common.Authorization;
    navigate('/login', { replace: true });
    if (!silent) {
      // noop visual handled via toast on callers
    }
  };

  const value = useMemo(
    () => ({ token, user, isAuthenticated: Boolean(token), login, logout }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
