import React, { useEffect, useState } from 'react';
import { getAbsoluteURL }    from '../utils/utils';
import { API_ENDPOINTS }     from '../constants';
import { useAuth }            from '../AuthContext';
import RequestIndicator      from './RequestIndicator';
import StarToggle            from './StarToggle';
import useMetricTracking     from '../hooks/useMetricTracking';
import CommentsPanel         from './CommentsPanel';
import ValueHistoryPanel     from './ValueHistoryPanel';
import '../index.css';

export default function NodeDiskIOTime() {
  const [value, setValue]     = useState(null);
  const [status, setStatus]   = useState(null);
  const { getAuthHeaders }    = useAuth();

  const {
    metricId,
    isTracked,
    toggleTracking,
    initialized
  } = useMetricTracking('NODE_DISK_IO_TIME');

  useEffect(() => {
    if (!initialized) return;
    let cancelled = false;

    async function fetchData() {
      setStatus(null);
      const res = await fetch(
        getAbsoluteURL(API_ENDPOINTS.diskIOTime),
        { headers: getAuthHeaders() }
      );
      if (cancelled) return;
      setStatus(res.status);
      if (!res.ok) return;
      const json = await res.json();
      if (typeof json.node_disk_io_time === 'number') {
        setValue(json.node_disk_io_time);
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
    if (value < 0.5) return '#4CAF50'; // зеленый
    if (value < 1) return '#FFC107'; // желтый
    return '#F44336'; // красный
  };

  const getRotation = (value) => {
    const maxValue = 2; // максимальное значение для спидометра
    const maxRotation = 180; // максимальный угол поворота стрелки
    const rotation = Math.min((value / maxValue) * maxRotation, maxRotation);
    return rotation;
  };

  const speedometerStyle = {
    width: '300px',
    height: '150px',
    position: 'relative',
    margin: '20px auto',
    background: '#f5f5f5',
    borderRadius: '150px 150px 0 0',
    overflow: 'hidden',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
  };

  const needleStyle = {
    position: 'absolute',
    bottom: '0',
    left: '50%',
    width: '4px',
    height: '140px',
    background: '#333',
    transformOrigin: 'bottom center',
    transform: `rotate(${getRotation(value || 0)}deg)`,
    transition: 'transform 0.5s ease-out',
    zIndex: 2
  };

  const gaugeMarks = Array.from({ length: 11 }, (_, i) => {
    const angle = (i * 18) - 90;
    const rotation = `rotate(${angle}deg)`;
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          bottom: '0',
          left: '50%',
          width: '2px',
          height: '10px',
          background: '#666',
          transformOrigin: 'bottom center',
          transform: rotation
        }}
      />
    );
  });

  const gaugeLabels = Array.from({ length: 6 }, (_, i) => {
    const angle = (i * 36) - 90;
    const rotation = `rotate(${angle}deg)`;
    const value = (i * 0.4).toFixed(1);
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: `translateX(-50%) ${rotation}`,
          fontSize: '12px',
          color: '#666'
        }}
      >
        {value}
      </div>
    );
  });

  return (
    <div className="metric-container">
      <div className="metric-header">
        <StarToggle isOn={isTracked} onToggle={toggleTracking} />
        <h1 className="title">Метрика: Disk IO Time</h1>
      </div>
      <p className="description">
        Время, затраченное на операции ввода-вывода диска.
      </p>
      <div className="metric-status">
        <RequestIndicator statusCode={status} />
      </div>

      <div style={speedometerStyle}>
        {gaugeMarks}
        {gaugeLabels}
        <div style={needleStyle} />
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '24px',
          fontWeight: 'bold',
          color: getColor(value || 0)
        }}>
          {value != null ? `${value} сек` : '—'}
        </div>
      </div>

      <CommentsPanel metricId={metricId} />
      <ValueHistoryPanel metricId={metricId} />
    </div>
  );
} 