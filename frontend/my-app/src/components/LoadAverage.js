import React, { useEffect, useState } from 'react';
import { getAbsoluteURL } from '../utils/utils';
import { API_ENDPOINTS} from "../constants";
import RequestIndicator from './RequestIndicator';
import '../index.css';

export default function LoadAverage() {
  const [load, setLoad] = useState(null);
  const [status, setStatus] = useState(null);

  const fetchData = async () => {
    try {
      // Сбрасываем статус → индикатор оранжевый (ожидание)
      setStatus(null);

      const url = getAbsoluteURL(API_ENDPOINTS.loadAverage);
      const response = await fetch(url, { credentials: 'include' });

      // После получения ответа – выставляем реальный статус
      setStatus(response.status);

      if (!response.ok) {
        console.error(`Server responded ${response.status}`);
        return;
      }

      const json = await response.json();
      if (typeof json.load_average === 'number') {
        setLoad((json.load_average * 100).toFixed(2));
      } else {
        console.warn('Unexpected payload:', json);
      }
    } catch (err) {
      console.error('Ошибка при получении данных:', err);
    }
  };

  useEffect(() => {
    fetchData();                               // первый запрос сразу
    const handle = setInterval(fetchData, 1000);
    return () => clearInterval(handle);
  }, []);

  return (
    <div className="metric-container">
      <h1 className="title">Показатель: Load Average</h1>
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
