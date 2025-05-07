// src/components/MetricsList.js

import React, { useEffect, useState } from 'react';
import { useNavigate }      from 'react-router-dom';
import { getAbsoluteURL }   from '../utils/utils';
import { API_ENDPOINTS }    from '../constants';
import StarToggle           from './StarToggle';
import './MetricsList.css';

export default function MetricsList() {
  const [metrics, setMetrics]               = useState([]);
  const [allTags, setAllTags]               = useState([]);
  const [trackedIds, setTrackedIds]         = useState(new Set());
  const [selectedTagIds, setSelectedTagIds] = useState(new Set());
  const [searchQuery, setSearchQuery]       = useState('');
  const navigate = useNavigate();

  // 1) Загрузка всех тегов и трекнутых метрик
  useEffect(() => {
    async function loadInitial() {
      try {
        const [trackedRes, tagsRes] = await Promise.all([
          fetch(getAbsoluteURL(API_ENDPOINTS.trackedMetrics), { credentials: 'include' }),
          fetch(getAbsoluteURL(API_ENDPOINTS.tags),           { credentials: 'include' }),
        ]);
        const [tracked, tags] = await Promise.all([
          trackedRes.json(),
          tagsRes.json(),
        ]);
        setAllTags(Array.isArray(tags) ? tags : []);
        const ids = (Array.isArray(tracked) ? tracked : [])
          .map(x => (typeof x === 'object' ? x.id : x));
        setTrackedIds(new Set(ids));
      } catch (err) {
        console.error('Error loading initial data:', err);
      }
    }
    loadInitial();
  }, []);

  // 2) Каждый раз при изменении searchQuery или выбранных тегов запрашиваем отфильтрованный список
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery.trim())   params.append('search', searchQuery.trim());
    if (selectedTagIds.size)  params.append('tags', [...selectedTagIds].join(','));

    fetch(getAbsoluteURL(API_ENDPOINTS.listMetrics) + '?' + params, { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then(data => {
        setMetrics(Array.isArray(data) ? data : []);
      })
      .catch(err => {
        console.error('Error fetching metrics:', err);
        setMetrics([]);
      });
  }, [searchQuery, selectedTagIds]);

  // 3) Тоггл трекинга
  const toggleTrack = async (metricId) => {
    const isOn = trackedIds.has(metricId);
    const method = isOn ? 'DELETE' : 'POST';
    try {
      const res = await fetch(
        getAbsoluteURL(API_ENDPOINTS.trackMetric(metricId)),
        { method, credentials: 'include' }
      );
      if (!res.ok) throw new Error(`Status ${res.status}`);
      setTrackedIds(prev => {
        const copy = new Set(prev);
        isOn ? copy.delete(metricId) : copy.add(metricId);
        return copy;
      });
    } catch (err) {
      console.error('Error toggling track:', err);
    }
  };

  // 4) Выбор/снятие фильтра по тегу
  const toggleFilterTag = (tagId) => {
    setSelectedTagIds(prev => {
      const copy = new Set(prev);
      copy.has(tagId) ? copy.delete(tagId) : copy.add(tagId);
      return copy;
    });
  };

  return (
    <div className="metrics-page">
      <aside className="tag-sidebar">
        <h2>Фильтр по тегам</h2>
        <ul className="tag-list">
          {allTags.map(t => (
            <li
              key={t.id}
              className={`tag-item${selectedTagIds.has(t.id) ? ' selected' : ''}`}
              onClick={() => toggleFilterTag(t.id)}
            >
              {t.name}
            </li>
          ))}
        </ul>
      </aside>

      <section className="metrics-main">
        <div className="metrics-header">
          <h1 className="metrics-title">Список метрик</h1>
          <input
            type="text"
            className="metrics-search"
            placeholder="Поиск по названию…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <ul className="metrics-list">
          {metrics.map(m => (
            <li key={m.id} className="metrics-item">
              <div
                className="metrics-link"
                onClick={() => navigate(`/metrics/${m.name.toLowerCase()}`)}
              >
                {m.name.replace(/_/g, ' ')}
              </div>
              <div className="metrics-tags">
                {m.tags.map(tag => (
                  <span
                    key={tag.id}
                    className="tag"
                    style={{ backgroundColor: tag.color, color: '#000' }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
              <StarToggle
                isOn={trackedIds.has(m.id)}
                onToggle={() => toggleTrack(m.id)}
              />
            </li>
          ))}
          {metrics.length === 0 && (
            <li className="no-results">Ничего не найдено.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
