// src/components/AdminLogin.js
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAbsoluteURL } from '../utils/utils';
import { API_ENDPOINTS } from '../constants';
import { AuthContext } from '../AuthContext';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { setUser, setIsAuthenticated, getAuthHeaders } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    const res = await fetch(getAbsoluteURL(API_ENDPOINTS.login), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      setError('Неверные учётные данные');
      return;
    }
    const data = await res.json();
    const me = await fetch(getAbsoluteURL(API_ENDPOINTS.me), { 
      headers: getAuthHeaders()
    }).then(r => r.json());
    if (me.role !== 'admin') {
      setError('У вас нет прав администратора');
      return;
    }
    setUser(me);
    setIsAuthenticated(true);
    navigate('/admin');
  };

  return (
    <div className="admin-login">
      <h2>Вход для администратора</h2>
      <form onSubmit={handleSubmit}>
        <input
          placeholder="Логин"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        {error && <p className="error">{error}</p>}
        <button type="submit">Войти как администратор</button>
      </form>
    </div>
  );
}
