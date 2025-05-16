import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../AuthContext';
import { getAbsoluteURL } from '../utils/utils';
import { API_ENDPOINTS } from '../constants';
import { FaCheck, FaEnvelope } from 'react-icons/fa';
import './EmailSettings.css';

export default function EmailSettings({ isOpen, setIsOpen }) {
  const { user, setUser, getAuthHeaders } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(null);
  const [isValid, setIsValid] = useState(false);

  // Reset email field when modal opens
  useEffect(() => {
    if (isOpen) {
      setEmail(user?.email || '');
      setMessage(null);
      setIsValid(!!user?.email);
    }
  }, [isOpen, user]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    setIsValid(validateEmail(newEmail));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!isValid) {
      setMessage({ type: 'error', text: 'Пожалуйста, введите корректный email' });
      return;
    }

    try {
      const res = await fetch(getAbsoluteURL(API_ENDPOINTS.userSettings), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update settings');
      }

      setUser(data);
      setMessage({ type: 'success', text: 'Email успешно обновлен' });
      setTimeout(() => setIsOpen(false), 1500);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="email-settings-overlay">
      <div className="email-settings-modal">
        <h3>Настройки Email</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email для уведомлений:</label>
            <div className="email-input-container">
              <input
                type="email"
                id="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="Введите ваш email"
                className={isValid ? 'valid' : ''}
              />
              {isValid && <FaCheck className="valid-icon" />}
              {!isValid && email && <FaEnvelope className="email-icon" />}
            </div>
          </div>
          {message && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}
          <div className="button-group">
            <button type="submit" className="save-button" disabled={!isValid}>
              Сохранить
            </button>
            <button
              type="button"
              className="cancel-button"
              onClick={() => setIsOpen(false)}
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 