import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { AuthApi } from '../api/endpoints';

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
  const [user, setUser] = useState(readPersistedUser);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const clearSession = (shouldRedirect = true) => {
    setUser(null);
    localStorage.removeItem('user');
    if (shouldRedirect) {
      navigate('/login', { replace: true });
    }
  };

  useEffect(() => {
    let isMounted = true;
    const bootstrapSession = async () => {
      try {
        const { data } = await AuthApi.session();
        if (!isMounted) return;

        const sessionUser = data.body.user;
        setUser(sessionUser);
        localStorage.setItem('user', JSON.stringify(sessionUser));
      } catch (_) {
        if (!isMounted) return;
        clearSession(false);
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    };

    bootstrapSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {

    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error?.response?.status === 401) {
          clearSession(true);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(responseInterceptor);
    };
  }, [navigate]);

  const login = (nextUser) => {
    setUser(nextUser);
    localStorage.setItem('user', JSON.stringify(nextUser));
  };

  const logout = async ({ silent = false } = {}) => {
    try {
      await AuthApi.logout();
    } catch (_) {
      // noop: cerrar sesión local aunque falle el endpoint
    } finally {
      clearSession(!silent);
    }
  };

  const value = useMemo(
    () => ({
      user,
      isBootstrapping,
      isAuthenticated: Boolean(user),
      login,
      logout
    }),
    [user, isBootstrapping]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
