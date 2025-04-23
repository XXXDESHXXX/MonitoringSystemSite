import React, { useEffect, useState } from 'react';
import { getAbsoluteURL } from '../utils/utils';
import { API_ENDPOINTS } from '../constants';
import RequestIndicator from './RequestIndicator';
import '../index.css';

export default function NodeCPUSecondsTotal() {
  const [value, setValue] = useState(null);
  const [status, setStatus] = useState(null);

  const fetchData = async () => {
    try {
      setStatus(null);
      const res = await fetch(getAbsoluteURL(API_ENDPOINTS.cpuSeconds), { credentials: 'include' });
      setStatus(res.status);
      if (!res.ok) return;
      const json = await res.json();
      if (typeof json.node_cpu_seconds_total === 'number') {
        setValue((json.node_cpu_seconds_total).toFixed(2));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="metric-container">
      <h1 className="title">Метрика: Node CPU Seconds Total</h1>
      <p className="description">
        Она отражает общее количество времени в секундах, которое процессор (CPU) провёл в режиме работы idle с момента запуска системы.
      </p>
      <div className="metric-status">
        <RequestIndicator statusCode={status} />
        <span className="metric-value">
          Значение: {value != null ? `${value}` : '—'}
        </span>
      </div>
    </div>
  );
}