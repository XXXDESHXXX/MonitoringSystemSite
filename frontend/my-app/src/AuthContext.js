import React, { createContext, useState, useEffect, useContext } from 'react';
import { getAbsoluteURL } from './utils/utils';
import { API_ENDPOINTS } from './constants';

export const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // При старте приложения получаем данные о пользователе
  useEffect(() => {
    fetch(getAbsoluteURL(API_ENDPOINTS.me), {
      credentials: 'include'
    })
      .then(async res => {
        if (res.ok) {
          const data = await res.json();
          // Ожидаем { id, username, role, email }
          setUser({
            id: data.id,
            username: data.username,
            role: data.role,
            email: data.email
          });
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

  const login = async (username, password) => {
    const res = await fetch(getAbsoluteURL(API_ENDPOINTS.login), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });

    // пытаемся прочитать JSON с ошибкой или данными
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    // Успешно: сохраняем пользователя
    setUser({
      id: data.id,
      username: data.username,
      role: data.role,
      email: data.email
    });
    setIsAuthenticated(true);
  };

  const logout = () => {
    fetch(getAbsoluteURL(API_ENDPOINTS.logout), {
      method: 'POST',
      credentials: 'include'
    }).finally(() => {
      setUser(null);
      setIsAuthenticated(false);
    });
  };

  if (checking) return null; // или спиннер

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
