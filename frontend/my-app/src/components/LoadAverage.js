import React, { useEffect, useState } from 'react';
import { getAbsoluteURL }    from '../utils/utils';
import { API_ENDPOINTS }     from '../constants';
import RequestIndicator      from './RequestIndicator';
import StarToggle            from './StarToggle';
import useMetricTracking     from '../hooks/useMetricTracking';
import CommentsPanel         from './CommentsPanel';
import '../index.css'; // здесь у нас стили .metric-container и т.п.

export default function LoadAverage() {
  const [load, setLoad]     = useState(null);
  const [status, setStatus] = useState(null);

  const {
    metricId,
    isTracked,
    toggleTracking,
    initialized
  } = useMetricTracking('LOAD_AVERAGE');

  // Всегда вызываем хук
  useEffect(() => {
    if (!initialized) return;

    let cancelled = false;
    async function fetchData() {
      setStatus(null);
      const res = await fetch(
        getAbsoluteURL(API_ENDPOINTS.loadAverage),
        { credentials: 'include' }
      );
      if (cancelled) return;
      setStatus(res.status);
      if (!res.ok) return;
      const json = await res.json();
      if (typeof json.load_average === 'number') {
        setLoad((json.load_average * 100).toFixed(2));
      }
    }
    fetchData();
    const id = setInterval(fetchData, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [initialized]);

  // Если ещё не готовы данные по metricId — не отображаем ничего
  if (!initialized) return null;

  return (
    <>
      {/* Старая обёртка, стили из index.css */}
      <div className="metric-container">
        <div className="metric-header">
          <StarToggle isOn={isTracked} onToggle={toggleTracking} />
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

      {/* И прямо под карточкой метрики — блок комментариев */}
      <CommentsPanel metricId={metricId} />
    </>
  );
}
