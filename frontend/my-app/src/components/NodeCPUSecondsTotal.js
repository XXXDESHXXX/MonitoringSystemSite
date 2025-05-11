import React, { useEffect, useState } from 'react';
import { getAbsoluteURL }    from '../utils/utils';
import { API_ENDPOINTS }     from '../constants';
import RequestIndicator      from './RequestIndicator';
import StarToggle            from './StarToggle';
import useMetricTracking     from '../hooks/useMetricTracking';
import CommentsPanel         from './CommentsPanel';
import ValueHistoryPanel     from './ValueHistoryPanel';
import '../index.css';

export default function NodeCPUSecondsTotal() {
  const [value, setValue]     = useState(null);
  const [status, setStatus]   = useState(null);

  const {
    metricId,
    isTracked,
    toggleTracking,
    initialized
  } = useMetricTracking('NODE_CPU_SECONDS_TOTAL');

  useEffect(() => {
    if (!initialized) return;
    let cancelled = false;

    async function fetchData() {
      try {
        setStatus(null);
        console.log('Fetching CPU seconds total data...');
        const url = getAbsoluteURL(API_ENDPOINTS.cpuSecondsTotal);
        console.log('URL:', url);
        
        const res = await fetch(url, { credentials: 'include' });
        if (cancelled) return;
        
        setStatus(res.status);
        if (!res.ok) {
          console.error('Failed to fetch CPU seconds total:', res.status);
          return;
        }
        
        const json = await res.json();
        console.log('Received data:', json);
        
        if (typeof json.node_cpu_seconds_total === 'number') {
          setValue(json.node_cpu_seconds_total.toFixed(2));
        }
      } catch (err) {
        console.error('Error fetching CPU seconds total:', err);
        setStatus(500);
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

  return (
    <div className="metric-container">
      <div className="metric-header">
        <StarToggle isOn={isTracked} onToggle={toggleTracking} />
        <h1 className="title">Метрика: CPU Seconds Total</h1>
      </div>
      <p className="description">
        Общее время работы процессора в секундах.
      </p>
      <div className="metric-status">
        <RequestIndicator statusCode={status} />
        <span className="metric-value">
          Значение: {value != null ? `${value} сек` : '—'}
        </span>
      </div>

      <CommentsPanel metricId={metricId} />
      <ValueHistoryPanel metricId={metricId} />
    </div>
  );
}
