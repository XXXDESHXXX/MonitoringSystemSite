import React, { useEffect, useState } from 'react';
import { getAbsoluteURL }    from '../utils/utils';
import { API_ENDPOINTS }     from '../constants';
import RequestIndicator      from './RequestIndicator';
import StarToggle            from './StarToggle';
import useMetricTracking     from '../hooks/useMetricTracking';
import CommentsPanel         from './CommentsPanel';
import ValueHistoryPanel     from './ValueHistoryPanel';
import '../index.css';

export default function NodeUptime() {
  const [value, setValue] = useState(null);
  const [status, setStatus] = useState(null);
  const [uptimeDetails, setUptimeDetails] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalSeconds: 0
  });

  const {
    metricId,
    isTracked,
    toggleTracking,
    initialized
  } = useMetricTracking('NODE_UPTIME');

  useEffect(() => {
    if (!initialized) return;
    let cancelled = false;

    async function fetchData() {
      setStatus(null);
      const res = await fetch(
        getAbsoluteURL(API_ENDPOINTS.uptime),
        { credentials: 'include' }
      );
      if (cancelled) return;
      setStatus(res.status);
      if (!res.ok) return;
      const json = await res.json();
      if (typeof json.node_uptime === 'number') {
        const totalSeconds = json.node_uptime;
        const days = Math.floor(totalSeconds / (24 * 3600));
        const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);
        
        setUptimeDetails({
          days,
          hours,
          minutes,
          seconds,
          totalSeconds
        });
        
        setValue(`${days}d ${hours}h ${minutes}m ${seconds}s`);
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

  const containerStyle = {
    width: '100%',
    maxWidth: '800px',
    margin: '20px auto',
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '10px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  };

  const clockContainerStyle = {
    position: 'relative',
    width: '300px',
    height: '300px',
    margin: '0 auto',
    backgroundColor: '#f8f9fa',
    borderRadius: '50%',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
  };

  const handStyle = (rotation, length, width, color) => ({
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: `${width}px`,
    height: `${length}px`,
    backgroundColor: color,
    transformOrigin: 'bottom center',
    transform: `translateX(-50%) rotate(${rotation}deg)`,
    borderRadius: '4px',
    transition: 'transform 0.5s cubic-bezier(0.4, 2.08, 0.55, 0.44)'
  });

  const centerPointStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '12px',
    height: '12px',
    backgroundColor: '#333',
    borderRadius: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 2
  };

  const hourMarkStyle = (rotation) => ({
    position: 'absolute',
    top: '10px',
    left: '50%',
    width: '2px',
    height: '10px',
    backgroundColor: '#666',
    transformOrigin: 'bottom center',
    transform: `translateX(-50%) rotate(${rotation}deg)`
  });

  const statsContainerStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
    marginTop: '30px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '10px'
  };

  const statItemStyle = {
    textAlign: 'center',
    padding: '15px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  };

  const statValueStyle = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: '5px'
  };

  const statLabelStyle = {
    fontSize: '14px',
    color: '#666'
  };

  const calculateHandRotation = (value, max) => (value / max) * 360;

  const hourMarks = Array.from({ length: 12 }, (_, i) => (
    <div key={i} style={hourMarkStyle(i * 30)} />
  ));

  return (
    <div className="metric-container">
      <div className="metric-header">
        <StarToggle isOn={isTracked} onToggle={toggleTracking} />
        <h1 className="title">Метрика: System Uptime</h1>
      </div>
      <p className="description">
        Время работы системы с момента последней перезагрузки.
      </p>
      <div className="metric-status">
        <RequestIndicator statusCode={status} />
      </div>

      <div style={containerStyle}>
        <div style={clockContainerStyle}>
          {hourMarks}
          <div style={handStyle(calculateHandRotation(uptimeDetails.hours, 24), 80, 4, '#2196F3')} />
          <div style={handStyle(calculateHandRotation(uptimeDetails.minutes, 60), 100, 3, '#4CAF50')} />
          <div style={handStyle(calculateHandRotation(uptimeDetails.seconds, 60), 120, 2, '#F44336')} />
          <div style={centerPointStyle} />
        </div>

        <div style={statsContainerStyle}>
          <div style={statItemStyle}>
            <div style={statValueStyle}>{uptimeDetails.days}</div>
            <div style={statLabelStyle}>Дней</div>
          </div>
          <div style={statItemStyle}>
            <div style={statValueStyle}>{uptimeDetails.hours}</div>
            <div style={statLabelStyle}>Часов</div>
          </div>
          <div style={statItemStyle}>
            <div style={statValueStyle}>{uptimeDetails.minutes}</div>
            <div style={statLabelStyle}>Минут</div>
          </div>
          <div style={statItemStyle}>
            <div style={statValueStyle}>{uptimeDetails.seconds}</div>
            <div style={statLabelStyle}>Секунд</div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px', color: '#666' }}>
          <div style={{ fontSize: '14px', marginBottom: '5px' }}>Общее время работы</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2196F3' }}>
            {value || '—'}
          </div>
        </div>
      </div>

      <CommentsPanel metricId={metricId} />
      <ValueHistoryPanel metricId={metricId} />
    </div>
  );
} 