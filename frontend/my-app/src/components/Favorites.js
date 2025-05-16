import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAbsoluteURL } from '../utils/utils';
import { API_ENDPOINTS } from '../constants';
import { useAuth } from '../AuthContext';
import StarToggle from './StarToggle';
import './Favorites.css';

const METRIC_NAMES = {
  NODE_CPU_USAGE_PERCENT: 'CPU Usage',
  NODE_MEMORY_USAGE_PERCENT: 'Memory Usage',
  NODE_DISK_USAGE_PERCENT: 'Disk Usage',
  NODE_NETWORK_RECEIVE_BYTES: 'Network Receive',
  NODE_MEMORY_CACHED_BYTES: 'Cached Memory',
  NODE_DISK_READ_BYTES: 'Disk Read',
  NODE_UPTIME: 'System Uptime'
};

export default function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();

  // Загрузка избранного при монтировании
  useEffect(() => {
    async function loadFavs() {
      try {
        const res = await fetch(
          getAbsoluteURL(API_ENDPOINTS.trackedMetrics),
          { headers: getAuthHeaders() }
        );
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        setFavorites(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed loading favorites:', err);
      }
    }
    loadFavs();
  }, [getAuthHeaders]);

  // Удаление из избранного
  const removeFromFav = async (id) => {
    try {
      const res = await fetch(
        getAbsoluteURL(API_ENDPOINTS.trackMetric(id)),
        {
          method: 'DELETE',
          headers: getAuthHeaders()
        }
      );
      if (res.ok) {
        // просто фильтруем из списка
        setFavorites(prev => prev.filter(m => m.id !== id));
      }
    } catch (err) {
      console.error('Failed to remove favorite:', err);
    }
  };

  if (favorites.length === 0) {
    return <p className="favorites-empty">Нет избранных метрик.</p>;
  }

  return (
    <div className="favorites-container">
      <h1 className="favorites-title">Мои избранные метрики</h1>
      <ul className="favorites-list">
        {favorites.map(m => (
          <li key={m.id} className="favorites-item">
            <div
              className="favorites-link"
              onClick={() => navigate(`/metrics/${m.name.toLowerCase()}`)}
            >
              {m.name.replace(/_/g, ' ')}
            </div>
            <StarToggle
              isOn={true}
              onToggle={() => removeFromFav(m.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
