import React, { useState } from 'react';
import { useNavigate }   from 'react-router-dom';
import { getAbsoluteURL } from '../utils/utils';
import { API_ENDPOINTS }  from '../constants';
import { useAuth }        from '../AuthContext';
import './Auth.css';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage]   = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    // Валидация на клиенте
    if (username.length > 16) {
      return setMessage({ type: 'error', text: 'Логин не может быть длиннее 16 символов' });
    }
    if (password.length < 8 || password.length > 64) {
      return setMessage({ type: 'error', text: 'Пароль должен быть от 8 до 64 символов' });
    }

    try {
      await login(username, password);
      navigate('/', { replace: true });
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
      {message && (
        <div className={`auth-message ${message.type}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
