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
  const { getAuthHeaders } = useAuth();

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
        { headers: getAuthHeaders() }
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
  }, [initialized, getAuthHeaders]);

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

  const progressBarContainerStyle = {
    width: '100%',
    height: '40px',
    backgroundColor: '#f0f0f0',
    borderRadius: '20px',
    overflow: 'hidden',
    position: 'relative',
    margin: '20px 0'
  };

  const progressBarStyle = {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: '20px',
    transition: 'width 0.5s ease-in-out',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '14px',
    textShadow: '0 1px 2px rgba(0,0,0,0.2)'
  };

  const statsContainerStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
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
    color: '#4CAF50',
    marginBottom: '5px'
  };

  const statLabelStyle = {
    fontSize: '14px',
    color: '#666'
  };

  // Calculate progress percentage (assuming 30 days as max for visualization)
  const maxUptimeSeconds = 30 * 24 * 3600; // 30 days in seconds
  const progressPercentage = Math.min((uptimeDetails.totalSeconds / maxUptimeSeconds) * 100, 100);

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
        <div style={progressBarContainerStyle}>
          <div 
            style={{
              ...progressBarStyle,
              width: `${progressPercentage}%`
            }}
          >
            {value || '—'}
          </div>
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
      </div>

      <CommentsPanel metricId={metricId} />
      <ValueHistoryPanel metricId={metricId} />
    </div>
  );
} 