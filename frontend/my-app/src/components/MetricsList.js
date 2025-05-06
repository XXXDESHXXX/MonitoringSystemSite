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

  useEffect(() => {
    async function loadAll() {
      try {
        const [allRes, trackedRes, tagsRes] = await Promise.all([
          fetch(getAbsoluteURL(API_ENDPOINTS.listMetrics),    { credentials: 'include' }),
          fetch(getAbsoluteURL(API_ENDPOINTS.trackedMetrics), { credentials: 'include' }),
          fetch(getAbsoluteURL(API_ENDPOINTS.tags),           { credentials: 'include' }),
        ]);
        const [all, tracked, tags] = await Promise.all([
          allRes.json(), trackedRes.json(), tagsRes.json()
        ]);

        setMetrics(Array.isArray(all) ? all : []);
        setAllTags(Array.isArray(tags) ? tags : []);
        const ids = (Array.isArray(tracked) ? tracked : [])
          .map(x => typeof x === 'object' ? x.id : x);
        setTrackedIds(new Set(ids));
      } catch (err) {
        console.error('Error loading data:', err);
      }
    }
    loadAll();
  }, []);

  const toggleTrack = async (metricId) => {
    const isTracked = trackedIds.has(metricId);
    const method    = isTracked ? 'DELETE' : 'POST';
    const res       = await fetch(
      getAbsoluteURL(API_ENDPOINTS.trackMetric(metricId)),
      { method, credentials: 'include' }
    );
    if (res.ok) {
      setTrackedIds(prev => {
        const copy = new Set(prev);
        isTracked ? copy.delete(metricId) : copy.add(metricId);
        return copy;
      });
    }
  };

  const toggleFilterTag = (tagId) => {
    setSelectedTagIds(prev => {
      const copy = new Set(prev);
      copy.has(tagId) ? copy.delete(tagId) : copy.add(tagId);
      return copy;
    });
  };

  // Фильтрация по тегам + по поисковому запросу
   useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    if (selectedTagIds.size) params.append('tags', [...selectedTagIds].join(','));
    fetch(getAbsoluteURL(API_ENDPOINTS.listMetrics) + '?' + params, { credentials: 'include' })
      .then(res => res.json())
      .then(setMetrics)
      .catch(console.error);
  }, [searchQuery, selectedTagIds]);

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
