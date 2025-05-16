import React, { createContext, useState, useEffect, useContext } from 'react';
import { getAbsoluteURL } from './utils/utils';
import { API_ENDPOINTS } from './constants';

export const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Helper function to set auth headers
  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  // Check token validity on mount
  useEffect(() => {
    if (token) {
      fetch(getAbsoluteURL(API_ENDPOINTS.me), {
        headers: getAuthHeaders()
      })
        .then(async res => {
          if (res.ok) {
            const data = await res.json();
            setUser(data);
            setIsAuthenticated(true);
          } else {
            // Token is invalid
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
            setIsAuthenticated(false);
          }
        })
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
        })
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, [token]);

  const login = async (username, password) => {
    const res = await fetch(getAbsoluteURL(API_ENDPOINTS.login), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    // Save token and user data
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser({
      id: data.id,
      username: data.username,
      role: data.role,
      email: data.email
    });
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = (newUserData) => {
    setUser(newUserData);
    if (newUserData.token) {
      localStorage.setItem('token', newUserData.token);
      setToken(newUserData.token);
    }
  };

  if (checking) return null;

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      login, 
      logout, 
      setUser: updateUser,
      getAuthHeaders 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
