import React, { useEffect, useState } from 'react';
import { getAbsoluteURL }    from '../utils/utils';
import { API_ENDPOINTS }     from '../constants';
import RequestIndicator      from './RequestIndicator';
import StarToggle            from './StarToggle';
import useMetricTracking     from '../hooks/useMetricTracking';
import CommentsPanel         from './CommentsPanel';
import ValueHistoryPanel     from './ValueHistoryPanel';
import '../index.css';

export default function NodeMemoryTotalBytes() {
  const [value, setValue]     = useState(null);
  const [status, setStatus]   = useState(null);

  const {
    metricId,
    isTracked,
    toggleTracking,
    initialized
  } = useMetricTracking('NODE_MEMORY_TOTAL_BYTES');

  useEffect(() => {
    if (!initialized) return;
    let cancelled = false;

    async function fetchData() {
      setStatus(null);
      const res = await fetch(
        getAbsoluteURL(API_ENDPOINTS.memTotalBytes),
        { credentials: 'include' }
      );
      if (cancelled) return;
      setStatus(res.status);
      if (!res.ok) return;
      const json = await res.json();
      if (typeof json.node_memory_MemTotal_bytes === 'number') {
        // Convert bytes to GB for better readability
        setValue((json.node_memory_MemTotal_bytes / (1024 * 1024 * 1024)).toFixed(2));
      }
    }

    fetchData();
    const id = setInterval(fetchData, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [initialized]);

  if (!initialized) return null;

  return (
    <div className="metric-container">
      <div className="metric-header">
        <StarToggle isOn={isTracked} onToggle={toggleTracking} />
        <h1 className="title">Метрика: Total System Memory</h1>
      </div>
      <p className="description">
        Общий объем оперативной памяти в системе.
      </p>
      <div className="metric-status">
        <RequestIndicator statusCode={status} />
        <span className="metric-value">
          Значение: {value != null ? `${value} GB` : '—'}
        </span>
      </div>

      <CommentsPanel metricId={metricId} />
      <ValueHistoryPanel metricId={metricId} />
    </div>
  );
} 