// src/ProtectedAdminRoute.js
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';

export default function ProtectedAdminRoute({ children }) {
  const { isAuthenticated, user } = useContext(AuthContext);
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }
  if (user.role !== 'admin') {
    // если обычный юзер попытался зайти
    return <Navigate to="/" replace />;
  }
  return children;
}
