import React, { useState, useContext } from 'react';
import { getAbsoluteURL } from '../utils/utils';
import { API_ENDPOINTS } from '../constants';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import './Auth.css';

export default function Login() {
  const { login } = useContext(AuthContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    // Валидация полей
    if (username.length > 16) {
      setMessage({ type: 'error', text: 'Логин не может быть длиннее 16 символов' });
      return;
    }
    if (password.length < 8 || password.length > 64) {
      setMessage({ type: 'error', text: 'Пароль должен быть от 8 до 64 символов' });
      return;
    }

    try {
      const res = await fetch(getAbsoluteURL(API_ENDPOINTS.login), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      console.log('Response Status:', res.status);

      if (res.ok) {
        login();
        navigate('/');
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Login failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="auth-container">
      <h2>Вход</h2>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Логин
          <input
            className="auth-input"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            maxLength={16}
            required
          />
        </label>
        <label>
          Пароль
          <input
            className="auth-input"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            minLength={8}
            maxLength={64}
            required
          />
        </label>
        <button className="auth-button" type="submit">Войти</button>
      </form>
      {message && <div className={`auth-message ${message.type}`}>{message.text}</div>}
    </div>
  );
}
