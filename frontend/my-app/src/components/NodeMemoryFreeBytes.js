import React, { useEffect, useState } from 'react';
import { getAbsoluteURL } from '../utils/utils';
import { API_ENDPOINTS } from '../constants';
import RequestIndicator from './RequestIndicator';
import StarToggle from './StarToggle';
import useMetricTracking from '../hooks/useMetricTracking';
import '../index.css';

export default function NodeMemoryFreeBytes() {
  const [value, setValue] = useState(null);
  const [status, setStatus] = useState(null);
  const { isTracked, toggleTracking, initialized } = useMetricTracking('NODE_MEMORY_MEMFREE_BYTES');

  const fetchData = async () => {
    setStatus(null);
    const res = await fetch(getAbsoluteURL(API_ENDPOINTS.memFreeBytes), { credentials: 'include' });
    setStatus(res.status);
    if (!res.ok) return;
    const json = await res.json();
    if (typeof json.node_memory_memfree_bytes === 'number') {
      setValue(json.node_memory_memfree_bytes.toFixed(2));
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="metric-container">
      <div className="metric-header">
        {initialized && <StarToggle isOn={isTracked} onToggle={toggleTracking} />}
        <h1 className="title">Метрика: Node Memory Free Bytes</h1>
      </div>
      <div className="metric-status">
        <RequestIndicator statusCode={status} />
        <span className="metric-value">
          Значение: {value != null ? `${value}` : '—'}
        </span>
      </div>
    </div>
  );
}
