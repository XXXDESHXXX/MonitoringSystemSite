// src/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import { getAbsoluteURL } from './utils/utils';
import { API_ENDPOINTS } from './constants';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Правильно: API_ENDPOINTS.me === '/auth/me'
    fetch(getAbsoluteURL(API_ENDPOINTS.me), {
      credentials: 'include'
    })
      .then(res => {
        setIsAuthenticated(res.ok);
      })
      .catch(() => setIsAuthenticated(false))
      .finally(() => setChecking(false));
  }, []);

  const login = () => setIsAuthenticated(true);
  const logout = () => {
    fetch(getAbsoluteURL(API_ENDPOINTS.logout), {
      method: 'POST',
      credentials: 'include'
    }).finally(() => setIsAuthenticated(false));
  };

  if (checking) return null; // можно показать спиннер

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
