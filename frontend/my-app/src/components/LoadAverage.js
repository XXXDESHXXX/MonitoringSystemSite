import React, { useEffect, useState } from 'react';
import { getAbsoluteURL } from '../utils/utils';
import { API_ENDPOINTS } from '../constants';
import RequestIndicator from './RequestIndicator';
import StarToggle from './StarToggle';
import useMetricTracking from '../hooks/useMetricTracking';
import '../index.css';

export default function LoadAverage() {
  const [load, setLoad] = useState(null);
  const [status, setStatus] = useState(null);
  const { isTracked, toggleTracking, initialized } = useMetricTracking('LOAD_AVERAGE');

  const fetchData = async () => {
    setStatus(null);
    const response = await fetch(getAbsoluteURL(API_ENDPOINTS.loadAverage), { credentials: 'include' });
    setStatus(response.status);
    if (!response.ok) return;
    const json = await response.json();
    if (typeof json.load_average === 'number') {
      setLoad((json.load_average * 100).toFixed(2));
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
        <h1 className="title">Показатель: Load Average</h1>
      </div>
      <p className="description">
        Средняя нагрузка на процессор: процессы в состоянии D, R и I/O за 1 минуту.
      </p>
      <div className="metric-status">
        <RequestIndicator statusCode={status} />
        <span className="metric-value">
          Значение: {load != null ? `${load} %` : '—'}
        </span>
      </div>
    </div>
  );
}
