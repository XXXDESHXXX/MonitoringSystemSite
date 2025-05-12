// src/components/LoadAverage.js
import React, { useEffect, useState } from 'react';
import { getAbsoluteURL }    from '../utils/utils';
import { API_ENDPOINTS }     from '../constants';
import RequestIndicator      from './RequestIndicator';
import StarToggle            from './StarToggle';
import useMetricTracking     from '../hooks/useMetricTracking';
import CommentsPanel         from './CommentsPanel';
import ValueHistoryPanel from './ValueHistoryPanel';
import '../index.css';

export default function LoadAverage() {
  const [load, setLoad]     = useState(null);
  const [status, setStatus] = useState(null);

  const {
    metricId,
    isTracked,
    toggleTracking,
    initialized
  } = useMetricTracking('LOAD_AVERAGE');

  useEffect(() => {
    if (!initialized) return;
    let cancelled = false;
    async function fetchData() {
      setStatus(null);
      console.log('Fetching load average data...');
      const res = await fetch(
        getAbsoluteURL(API_ENDPOINTS.loadAverage),
        { credentials: 'include' }
      );
      if (cancelled) return;
      setStatus(res.status);
      if (!res.ok) {
        console.error('Failed to fetch load average:', res.status);
        return;
      }
      const json = await res.json();
      console.log('Received data:', json);
      if (typeof json.load_average === 'number') {
        setLoad(json.load_average * 100);
      }
    }
    fetchData();
    const id = setInterval(fetchData, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [initialized]);

  if (!initialized) {
    console.log('Component not initialized yet');
    return null;
  }

  const getColorForLoad = (loadValue) => {
    if (loadValue < 50) return '#4BC0C0'; // Зеленый для низкой нагрузки
    if (loadValue < 80) return '#FF9F40'; // Оранжевый для средней нагрузки
    return '#FF6384'; // Красный для высокой нагрузки
  };

  const progressBarStyle = {
    width: '100%',
    height: '30px',
    backgroundColor: '#f0f0f0',
    borderRadius: '15px',
    overflow: 'hidden',
    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)',
    margin: '20px 0'
  };

  const progressFillStyle = {
    width: `${Math.min(load || 0, 100)}%`,
    height: '100%',
    backgroundColor: getColorForLoad(load || 0),
    transition: 'width 0.5s ease-in-out, background-color 0.5s ease-in-out',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
    textShadow: '1px 1px 1px rgba(0,0,0,0.3)'
  };

  return (
    <div className="metric-container">
      <div className="metric-header">
        <StarToggle isOn={isTracked} onToggle={toggleTracking} />
        <h1 className="title">Метрика: Load Average</h1>
      </div>
      <p className="description">
        Средняя нагрузка на процессор за последнюю минуту.
      </p>
      <div className="metric-status">
        <RequestIndicator statusCode={status} />
        <span className="metric-value">
          Значение: {load != null ? `${load.toFixed(2)} %` : '—'}
        </span>
      </div>

      <div style={progressBarStyle}>
        <div style={progressFillStyle}>
          {load != null ? `${load.toFixed(2)}%` : '—'}
        </div>
      </div>

      {/* Перенесли внутрь .metric-container */}
      <CommentsPanel metricId={metricId} />
      <ValueHistoryPanel metricId={metricId} />
    </div>
  );
}
