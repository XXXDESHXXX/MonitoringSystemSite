import React, { useEffect, useState } from 'react';
import { getAbsoluteURL }    from '../utils/utils';
import { API_ENDPOINTS }     from '../constants';
import RequestIndicator      from './RequestIndicator';
import StarToggle            from './StarToggle';
import useMetricTracking     from '../hooks/useMetricTracking';
import CommentsPanel         from './CommentsPanel';
import ValueHistoryPanel     from './ValueHistoryPanel';
import '../index.css';

export default function NodeNetworkReceive() {
  const [value, setValue]     = useState(null);
  const [status, setStatus]   = useState(null);

  const {
    metricId,
    isTracked,
    toggleTracking,
    initialized
  } = useMetricTracking('NODE_NETWORK_RECEIVE_BYTES');

  useEffect(() => {
    if (!initialized) return;
    let cancelled = false;

    async function fetchData() {
      setStatus(null);
      const res = await fetch(
        getAbsoluteURL(API_ENDPOINTS.networkReceive),
        { credentials: 'include' }
      );
      if (cancelled) return;
      setStatus(res.status);
      if (!res.ok) return;
      const json = await res.json();
      if (typeof json.node_network_receive_bytes === 'number') {
        // Convert bytes to MB for better readability
        setValue((json.node_network_receive_bytes / (1024 * 1024)).toFixed(2));
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
        <h1 className="title">Метрика: Network Receive</h1>
      </div>
      <p className="description">
        Скорость получения данных по сети.
      </p>
      <div className="metric-status">
        <RequestIndicator statusCode={status} />
        <span className="metric-value">
          Значение: {value != null ? `${value} MB/s` : '—'}
        </span>
      </div>

      <CommentsPanel metricId={metricId} />
      <ValueHistoryPanel metricId={metricId} />
    </div>
  );
} 