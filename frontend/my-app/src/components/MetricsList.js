// src/components/MetricsList.js

import React, { useEffect, useState } from 'react';
import { useNavigate }      from 'react-router-dom';
import { getAbsoluteURL }   from '../utils/utils';
import { API_ENDPOINTS }    from '../constants';
import StarToggle           from './StarToggle';
import './MetricsList.css';

const METRICS_PER_PAGE = 9;

export default function MetricsList() {
  const [metrics, setMetrics]               = useState([]);
  const [allTags, setAllTags]               = useState([]);
  const [trackedIds, setTrackedIds]         = useState(new Set());
  const [selectedTagIds, setSelectedTagIds] = useState(new Set());
  const [searchQuery, setSearchQuery]       = useState('');
  const [currentPage, setCurrentPage]       = useState(1);
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

  // Фильтрация метрик по тегам
  const filteredMetrics = metrics.filter(m => {
    // Если теги не выбраны, показываем все метрики
    if (!selectedTagIds.size) return true;

    // Проверяем, что метрика содержит ВСЕ выбранные теги
    return [...selectedTagIds].every(selectedTag => 
      m.tags.some(tag => tag.id === selectedTag)
    );
  });

  // Пагинация
  const totalPages = Math.ceil(filteredMetrics.length / METRICS_PER_PAGE);
  const startIndex = (currentPage - 1) * METRICS_PER_PAGE;
  const paginatedMetrics = filteredMetrics.slice(startIndex, startIndex + METRICS_PER_PAGE);

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
          {paginatedMetrics.map(m => (
            <li key={m.id} className="metrics-item">
              <StarToggle
                isOn={trackedIds.has(m.id)}
                onToggle={() => toggleTrack(m.id)}
              />
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
                    style={{ 
                      backgroundColor: tag.color,
                      color: getContrastColor(tag.color)
                    }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </li>
          ))}
          {paginatedMetrics.length === 0 && (
            <li className="no-results">Ничего не найдено.</li>
          )}
        </ul>

        {totalPages > 1 && (
          <div className="pagination">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Назад
            </button>
            <span className="page-info">
              Страница {currentPage} из {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Вперед
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
// Helper function to determine text color based on background color
function getContrastColor(hexColor) {
  // Remove the hash if it exists
  const color = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black or white based on luminance
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

