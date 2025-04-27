import React, { createContext, useState, useEffect, useContext } from 'react';
import { getAbsoluteURL } from './utils/utils';
import { API_ENDPOINTS } from './constants';

export const AuthContext = createContext();

// хук для удобного доступа
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [checking, setChecking]   = useState(true);
  const [user, setUser]           = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    fetch(getAbsoluteURL(API_ENDPOINTS.me), { credentials: 'include' })
      .then(async res => {
        if (res.ok) {
          const data = await res.json();
          // ожидаем, что бэкенд отдаёт { username, id }
          setUser({ username: data.username, id: data.id });
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      })
      .catch(() => {
        setUser(null);
        setIsAuthenticated(false);
      })
      .finally(() => setChecking(false));
  }, []);

  const login = () => setIsAuthenticated(true);
  const logout = () => {
    fetch(getAbsoluteURL(API_ENDPOINTS.logout), {
      method: 'POST',
      credentials: 'include'
    }).finally(() => {
      setIsAuthenticated(false);
      setUser(null);
    });
  };

  if (checking) return null;

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
