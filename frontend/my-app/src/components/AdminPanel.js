// src/components/AdminPanel.js
import React, { useEffect, useState } from 'react'
import { useAuth }        from '../AuthContext'
import { getAbsoluteURL } from '../utils/utils'
import { API_ENDPOINTS }  from '../constants'
import { motion, AnimatePresence } from 'framer-motion'
import './AdminPanel.css'

export default function AdminPanel() {
  const { user, getAuthHeaders } = useAuth()

  const [metrics, setMetrics] = useState([])
  const [allTags, setAllTags] = useState([])
  const [filteredTags, setFilteredTags] = useState([])
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // формы
  const [newTagName, setNewTagName]   = useState('')
  const [newTagColor, setNewTagColor] = useState('#3498db')

  // поисковые строки
  const [searchTag, setSearchTag]       = useState('')
  const [searchUser, setSearchUser]     = useState('')
  const [searchMetric, setSearchMetric] = useState('')

  // Загрузка данных при монтировании
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)

        // Загружаем пользователей
        const usersRes = await fetch(getAbsoluteURL(API_ENDPOINTS.adminUsers), { 
          headers: getAuthHeaders()
        })
        if (!usersRes.ok) throw new Error('Failed to load users')
        const usersData = await usersRes.json()
        setUsers(usersData)

        // Загружаем теги
        const tagsRes = await fetch(getAbsoluteURL(API_ENDPOINTS.adminTags), { 
          headers: getAuthHeaders()
        })
        if (!tagsRes.ok) throw new Error('Failed to load tags')
        const tagsData = await tagsRes.json()
        setAllTags(tagsData)
        setFilteredTags(tagsData)

        // Загружаем метрики
        const metricsRes = await fetch(getAbsoluteURL(API_ENDPOINTS.listMetrics), { 
          headers: getAuthHeaders()
        })
        if (!metricsRes.ok) throw new Error('Failed to load metrics')
        const metricsData = await metricsRes.json()
        setMetrics(metricsData)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [getAuthHeaders])

  // фильтрация тегов локально
  useEffect(() => {
    const query = searchTag.trim().toLowerCase()
    if (!query) {
      setFilteredTags(allTags)
    } else {
      setFilteredTags(
        allTags.filter(t => t.name.toLowerCase().includes(query))
      )
    }
  }, [searchTag, allTags])

  // добавить тег
  const addTag = async () => {
    if (!newTagName.trim()) return
    const res = await fetch(getAbsoluteURL(API_ENDPOINTS.adminTags), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name: newTagName.trim(), color: newTagColor })
    })
    if (res.ok) {
      const tag = await res.json()
      setAllTags(prev => [...prev, tag])
      setFilteredTags(prev => [...prev, tag])
      setNewTagName('')
    }
  }

  // удалить тег
  const delTag = async id => {
    const res = await fetch(
      getAbsoluteURL(`${API_ENDPOINTS.adminTags}/${id}`),
      { method: 'DELETE', headers: getAuthHeaders() }
    )
    if (res.ok) {
      setAllTags(prev => prev.filter(t => t.id !== id))
      setFilteredTags(prev => prev.filter(t => t.id !== id))
    }
  }

  // удалить пользователя
  const delUser = async id => {
    const res = await fetch(
      getAbsoluteURL(`${API_ENDPOINTS.adminUsers}/${id}`),
      { method: 'DELETE', headers: getAuthHeaders() }
    )
    if (res.ok) setUsers(prev => prev.filter(u => u.id !== id))
  }

  // привязать/отвязать тег к метрике
  const toggleMetricTag = async (metricId, tagId, hasTag) => {
    const endpoint = API_ENDPOINTS.adminMetricTags(metricId, tagId)
    const method   = hasTag ? 'DELETE' : 'POST'
    const res      = await fetch(getAbsoluteURL(endpoint), { method, headers: getAuthHeaders() })
    if (!res.ok) return
    setMetrics(prev =>
      prev.map(m => {
        if (m.id !== metricId) return m
        const updated = hasTag
          ? m.tags.filter(t => t.id !== tagId)
          : [...m.tags, allTags.find(t => t.id === tagId)]
        return { ...m, tags: updated }
      })
    )
  }

  if (user?.role !== 'admin') {
    return (
      <div className="admin-panel__no-access">
        <h2>Доступ запрещён</h2>
        <p>У вас нет прав для просмотра этой страницы.</p>
      </div>
    )
  }

  return (
    <div className="admin-panel">
      <header className="admin-panel__header">
        <h1>Панель администратора</h1>
      </header>
      <div className="admin-panel__grid">

        {/* Теги */}
        <section className="admin-section">
          <h2>Теги</h2>
          <input
            type="text"
            className="search-input"
            placeholder="Поиск тегов..."
            value={searchTag}
            onChange={e => setSearchTag(e.target.value)}
          />
          <div className="tag-form">
            <input
              className="tag-input"
              placeholder="Новый тег"
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
            />
            <input
              type="color"
              className="color-picker"
              value={newTagColor}
              onChange={e => setNewTagColor(e.target.value)}
            />
            <button className="btn-add" onClick={addTag}>Добавить</button>
          </div>
          <ul className="admin-list">
            <AnimatePresence>
              {filteredTags.map(t => (
                <motion.li
                  key={t.id}
                  className="admin-list-item"
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <span>{t.name}</span>
                  <button className="btn-delete" onClick={() => delTag(t.id)}>Удалить</button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>

        {/* Метрики */}
        <section className="admin-section">
          <h2>Метрики</h2>
          <input
            type="text"
            className="search-input"
            placeholder="Поиск метрик..."
            value={searchMetric}
            onChange={e => setSearchMetric(e.target.value)}
          />
          <ul className="admin-list metric-list">
            {metrics.map(m => (
              <li key={m.id} className="admin-list-item metric-item">
                <div className="metric-info">
                  <strong className="metric-name">{m.name}</strong>
                  <div className="metric-tags">
                    {m.tags.map(t => (
                      <span
                        key={t.id}
                        className="role-badge"
                        style={{ backgroundColor: t.color, color: '#fff' }}
                      >
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="tags-toggle">
                  {allTags.map(t => {
                    const has = m.tags.some(x => x.id === t.id)
                    return (
                      <button
                        key={t.id}
                        className={`tag-toggle-btn ${has ? 'active' : ''}`}
                        style={{ borderColor: t.color }}
                        onClick={() => toggleMetricTag(m.id, t.id, has)}
                      >
                        {t.name}
                      </button>
                    )
                  })}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Пользователи */}
        <section className="admin-section">
          <h2>Пользователи</h2>
          <input
            type="text"
            className="search-input"
            placeholder="Поиск пользователей..."
            value={searchUser}
            onChange={e => setSearchUser(e.target.value)}
          />
          <ul className="admin-list">
            <AnimatePresence>
              {users.map(u => (
                <motion.li
                  key={u.id}
                  className="admin-list-item"
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <span>{u.username} <small className="role-badge">{u.role}</small></span>
                  <button className="btn-delete" onClick={() => delUser(u.id)}>Удалить</button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>

      </div>
    </div>
  )
}
