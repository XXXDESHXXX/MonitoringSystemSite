import React, { useEffect, useState } from 'react';
import { getAbsoluteURL }    from '../utils/utils';
import { API_ENDPOINTS }     from '../constants';
import { useAuth }            from '../AuthContext';
import RequestIndicator      from './RequestIndicator';
import StarToggle            from './StarToggle';
import useMetricTracking     from '../hooks/useMetricTracking';
import CommentsPanel         from './CommentsPanel';
import '../index.css';
import ValueHistoryPanel from './ValueHistoryPanel';

export default function NodeMemoryFreeBytes() {
  const [value, setValue]     = useState(null);
  const [status, setStatus]   = useState(null);
  const { getAuthHeaders }    = useAuth();

  const {
    metricId,
    isTracked,
    toggleTracking,
    initialized
  } = useMetricTracking('NODE_MEMORY_MEMFREE_BYTES');

  useEffect(() => {
    if (!initialized) return;
    let cancelled = false;

    async function fetchData() {
      setStatus(null);
      const res = await fetch(
        getAbsoluteURL(API_ENDPOINTS.memFreeBytes),
        { headers: getAuthHeaders() }
      );
      if (cancelled) return;
      setStatus(res.status);
      if (!res.ok) return;
      const json = await res.json();
      if (typeof json.node_memory_memfree_bytes === 'number') {
        // Convert bytes to GB for better readability
        setValue((json.node_memory_memfree_bytes / (1024 * 1024 * 1024)).toFixed(2));
      }
    }

    fetchData();
    const id = setInterval(fetchData, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [initialized, getAuthHeaders]);

  if (!initialized) return null;

  const getColor = (value) => {
    if (value > 8) return '#4CAF50'; // зеленый
    if (value > 4) return '#FFC107'; // желтый
    return '#F44336'; // красный
  };

  const containerStyle = {
    width: '100%',
    maxWidth: '600px',
    margin: '20px auto',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '15px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
  };

  const memoryContainerStyle = {
    width: '100%',
    height: '200px',
    position: 'relative',
    backgroundColor: '#e9ecef',
    borderRadius: '10px',
    overflow: 'hidden',
    marginBottom: '20px'
  };

  const memoryLevelStyle = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    height: `${(value / 16) * 100}%`, // Предполагаем максимум 16GB
    backgroundColor: getColor(value || 0),
    transition: 'height 0.5s ease-out, background-color 0.5s ease-out',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: '10px',
    boxSizing: 'border-box'
  };

  const particles = Array.from({ length: 20 }, (_, i) => {
    const size = Math.random() * 4 + 2;
    const left = Math.random() * 100;
    const delay = Math.random() * 2;
    const duration = Math.random() * 3 + 2;
    
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          width: `${size}px`,
          height: `${size}px`,
          backgroundColor: 'rgba(255, 255, 255, 0.5)',
          borderRadius: '50%',
          left: `${left}%`,
          bottom: '0',
          animation: `float ${duration}s ease-in-out ${delay}s infinite`
        }}
      />
    );
  });

  const valueStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#fff',
    textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
    zIndex: 2
  };

  return (
    <div className="metric-container">
      <div className="metric-header">
        <StarToggle isOn={isTracked} onToggle={toggleTracking} />
        <h1 className="title">Метрика: Free Memory</h1>
      </div>
      <p className="description">
        Количество свободной оперативной памяти в системе.
      </p>
      <div className="metric-status">
        <RequestIndicator statusCode={status} />
      </div>

      <div style={containerStyle}>
        <div style={memoryContainerStyle}>
          <div style={memoryLevelStyle}>
            {particles}
          </div>
          <div style={valueStyle}>
            {value != null ? `${value} GB` : '—'}
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes float {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-20px);
            }
          }
        `}
      </style>

      <CommentsPanel metricId={metricId} />
      <ValueHistoryPanel metricId={metricId} />
    </div>
  );
}
