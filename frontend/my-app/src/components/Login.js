import React, { useState } from 'react';
import { getAbsoluteURL } from '../utils/utils';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
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
    try {
      const res = await fetch(getAbsoluteURL('auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      // Логируем статус ответа
      console.log('Response Status:', res.status);

      if (res.status === 302) {
        login(); // Вызываем login, если статус 302
        navigate('/protected'); // Перенаправляем на защищенную страницу
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.message || 'Login failed' });
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
            required
          />
        </label>
        <button className="auth-button" type="submit">Войти</button>
      </form>
      {message && (
        <div className={`auth-message ${message.type}`}>{message.text}</div>
      )}
    </div>
  );
}
