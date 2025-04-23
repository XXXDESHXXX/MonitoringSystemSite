// src/components/MetricsList.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAbsoluteURL } from '../utils/utils';
import { API_ENDPOINTS } from '../constants';
import './MetricsList.css';

export default function MetricsList() {
  const [metrics, setMetrics] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Правильно: API_ENDPOINTS.listMetrics === '/metrics'
    fetch(getAbsoluteURL(API_ENDPOINTS.listMetrics), {
      credentials: 'include'
    })
      .then(res => {
        if (!res.ok) {
          console.error(`Failed to fetch metrics, status ${res.status}`);
          return [];
        }
        return res.json();
      })
      .then(data => setMetrics(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('Fetch metrics failed:', err);
        setMetrics([]);
      });
  }, []);

  return (
    <div className="metrics-container">
      <h1 className="metrics-title">Список метрик</h1>
      <ul className="metrics-list">
        {metrics.map(m => (
          <li
            key={m.id}
            className="metrics-item"
            onClick={() => navigate(`/metrics/${m.name.toLowerCase()}`)}
          >
            {m.name.replace(/_/g, ' ')}
          </li>
        ))}
      </ul>
    </div>
  );
}
