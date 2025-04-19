import React, { useState } from 'react';
import { getAbsoluteURL } from '../utils/utils';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../AuthContext';
import './Auth.css';

export default function Register() {
  const { login } = useContext(AuthContext); // если вам нужно автоматически залогинить пользователя после регистрации
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await fetch(getAbsoluteURL('auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      if (res.status === 201) {
        login(); // автоматически залогинить пользователя
        navigate('/protected'); // перенаправление на защищённую страницу
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.message || 'Registration failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="auth-container">
      <h2>Регистрация</h2>
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
        <button className="auth-button" type="submit">Зарегистрироваться</button>
      </form>
      {message && (
        <div className={`auth-message ${message.type}`}>{message.text}</div>
      )}
    </div>
  );
}
