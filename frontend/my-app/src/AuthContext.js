import React, { createContext, useState, useEffect, useContext } from 'react';
import { getAbsoluteURL } from './utils/utils';
import { API_ENDPOINTS } from './constants';

export const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('user');
  });

  // При старте приложения получаем данные о пользователе
  useEffect(() => {
    fetch(getAbsoluteURL(API_ENDPOINTS.me), {
      credentials: 'include'
    })
      .then(async res => {
        if (res.ok) {
          const data = await res.json();
          const userData = {
            id: data.id,
            username: data.username,
            role: data.role,
            email: data.email
          };
          setUser(userData);
          setIsAuthenticated(true);
          localStorage.setItem('user', JSON.stringify(userData));
        } else {
          setUser(null);
          setIsAuthenticated(false);
          localStorage.removeItem('user');
        }
      })
      .catch(() => {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('user');
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

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    const userData = {
      id: data.id,
      username: data.username,
      role: data.role,
      email: data.email
    };
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    fetch(getAbsoluteURL(API_ENDPOINTS.logout), {
      method: 'POST',
      credentials: 'include'
    }).finally(() => {
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('user');
    });
  };

  if (checking) return null;

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
