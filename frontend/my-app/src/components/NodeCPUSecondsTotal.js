import React, { useEffect, useState } from 'react';
import { getAbsoluteURL } from '../utils/utils';
import { API_ENDPOINTS } from '../constants';
import RequestIndicator from './RequestIndicator';
import StarToggle from './StarToggle';
import useMetricTracking from '../hooks/useMetricTracking';
import '../index.css';

export default function NodeCPUSecondsTotal() {
  const [value, setValue] = useState(null);
  const [status, setStatus] = useState(null);
  const { isTracked, toggleTracking, initialized } = useMetricTracking('NODE_CPU_SECONDS_TOTAL');

  const fetchData = async () => {
    setStatus(null);
    const res = await fetch(getAbsoluteURL(API_ENDPOINTS.cpuSeconds), { credentials: 'include' });
    setStatus(res.status);
    if (!res.ok) return;
    const json = await res.json();
    if (typeof json.node_cpu_seconds_total === 'number') {
      setValue(json.node_cpu_seconds_total.toFixed(2));
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
        <h1 className="title">Метрика: Node CPU Seconds Total</h1>
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
