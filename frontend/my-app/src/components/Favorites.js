import React, { useEffect, useState } from 'react';
import { useNavigate }    from 'react-router-dom';
import { getAbsoluteURL } from '../utils/utils';
import { API_ENDPOINTS }  from '../constants';
import StarToggle         from './StarToggle';
import './Favorites.css';

export default function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const navigate = useNavigate();

  // Загрузка избранного при монтировании
  useEffect(() => {
    async function loadFavs() {
      try {
        const res = await fetch(getAbsoluteURL(API_ENDPOINTS.trackedMetrics), {
          credentials: 'include'
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        setFavorites(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed loading favorites:', err);
      }
    }
    loadFavs();
  }, []);

  // Удаление из избранного
  const removeFromFav = async (id) => {
    try {
      const res = await fetch(
        getAbsoluteURL(API_ENDPOINTS.trackMetric(id)),
        { method: 'DELETE', credentials: 'include' }
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
