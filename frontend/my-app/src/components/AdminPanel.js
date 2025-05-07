// src/components/AdminPanel.js

import React, { useEffect, useState } from 'react';
import { getAbsoluteURL }            from '../utils/utils';
import { API_ENDPOINTS }             from '../constants';

export default function AdminPanel() {
  const [tags, setTags]   = useState([]);
  const [users, setUsers] = useState([]);
  // стейты форм…
  const [formTag, setFormTag]     = useState({ name: '', color: '#000000' });
  const [formUser, setFormUser]   = useState({ username: '', password: '', email: '', role: 'user' });

  useEffect(() => {
    // подставляем правильный endpoint из констант
    fetch(getAbsoluteURL(API_ENDPOINTS.adminTags), { credentials: 'include' })
      .then(r => r.json())
      .then(data => setTags(Array.isArray(data) ? data : []))
      .catch(() => setTags([]));

    fetch(getAbsoluteURL(API_ENDPOINTS.adminUsers), { credentials: 'include' })
      .then(r => r.json())
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]));
  }, []);

  const addTag = async () => {
    const res = await fetch(getAbsoluteURL(API_ENDPOINTS.adminTags), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formTag)
    });
    if (res.ok) {
      const created = await res.json();
      setTags(prev => [...prev, created]);
      setFormTag({ name: '', color: '#000000' });
    }
  };

  const delTag = async (id) => {
    const res = await fetch(getAbsoluteURL(`${API_ENDPOINTS.adminTags}/${id}`), {
      method: 'DELETE',
      credentials: 'include'
    });
    if (res.ok) {
      setTags(prev => prev.filter(t => t.id !== id));
    }
  };

  const addUser = async () => {
    const res = await fetch(getAbsoluteURL(API_ENDPOINTS.adminUsers), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formUser)
    });
    if (res.ok) {
      const created = await res.json();
      setUsers(prev => [...prev, created]);
      setFormUser({ username: '', password: '', email: '', role: 'user' });
    }
  };

  const delUser = async (id) => {
    const res = await fetch(getAbsoluteURL(`${API_ENDPOINTS.adminUsers}/${id}`), {
      method: 'DELETE',
      credentials: 'include'
    });
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  return (
    <div className="admin-panel">
      <section>
        <h2>Теги</h2>
        <ul>
          {(Array.isArray(tags) ? tags : []).map(t => (
            <li key={t.id}>
              {t.name} <button onClick={() => delTag(t.id)}>Удалить</button>
            </li>
          ))}
        </ul>
        <input
          placeholder="Имя"
          value={formTag.name}
          onChange={e => setFormTag({ ...formTag, name: e.target.value })}
        />
        <input
          type="color"
          value={formTag.color}
          onChange={e => setFormTag({ ...formTag, color: e.target.value })}
        />
        <button onClick={addTag}>Добавить тег</button>
      </section>

      <section>
        <h2>Пользователи</h2>
        <ul>
          {(Array.isArray(users) ? users : []).map(u => (
            <li key={u.id}>
              {u.username} ({u.role})
              <button onClick={() => delUser(u.id)}>Удалить</button>
            </li>
          ))}
        </ul>
        <input
          placeholder="Имя"
          value={formUser.username}
          onChange={e => setFormUser({ ...formUser, username: e.target.value })}
        />
        <input
          type="password"
          placeholder="Пароль"
          value={formUser.password}
          onChange={e => setFormUser({ ...formUser, password: e.target.value })}
        />
        <input
          placeholder="Email"
          value={formUser.email}
          onChange={e => setFormUser({ ...formUser, email: e.target.value })}
        />
        <select
          value={formUser.role}
          onChange={e => setFormUser({ ...formUser, role: e.target.value })}
        >
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
        <button onClick={addUser}>Добавить пользователя</button>
      </section>
    </div>
  );
}
