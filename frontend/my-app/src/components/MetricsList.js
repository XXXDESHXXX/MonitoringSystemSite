// src/components/MetricsList.js
import React, { useEffect, useState } from 'react';
import { useNavigate }      from 'react-router-dom';
import { getAbsoluteURL }   from '../utils/utils';
import { API_ENDPOINTS }    from '../constants';
import StarToggle           from './StarToggle';  // можно оставить CSS-анимацию
import './MetricsList.css';

export default function MetricsList() {
  const [metrics, setMetrics]       = useState([]);
  const [trackedIds, setTrackedIds] = useState(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    async function loadAll() {
      try {
        const [allRes, trackedRes] = await Promise.all([
          fetch(getAbsoluteURL(API_ENDPOINTS.listMetrics),   { credentials: 'include' }),
          fetch(getAbsoluteURL(API_ENDPOINTS.trackedMetrics),{ credentials: 'include' }),
        ]);
        const all     = await allRes.json();
        const tracked = await trackedRes.json();

        setMetrics(Array.isArray(all) ? all : []);
        // tracked может быть [{id,name},…] или [id,…]
        const ids = tracked.map(x => typeof x === 'object' ? x.id : x);
        setTrackedIds(new Set(ids));
      } catch (err) {
        console.error('Error loading metrics/tracked:', err);
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

  return (
    <div className="metrics-container">
      <h1 className="metrics-title">Список метрик</h1>
      <ul className="metrics-list">
        {metrics.map(m => (
          <li key={m.id} className="metrics-item">
            <div
              className="metrics-link"
              onClick={() => navigate(`/metrics/${m.name.toLowerCase()}`)}
            >
              {m.name.replace(/_/g, ' ')}
            </div>
            <StarToggle
              isOn={trackedIds.has(m.id)}
              onToggle={() => toggleTrack(m.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
