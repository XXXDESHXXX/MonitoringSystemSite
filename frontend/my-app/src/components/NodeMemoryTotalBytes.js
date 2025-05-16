import React, { useEffect, useState } from 'react';
import { getAbsoluteURL } from '../utils/utils';
import { API_ENDPOINTS } from '../constants';
import { useAuth } from '../AuthContext';
import RequestIndicator from './RequestIndicator';
import StarToggle from './StarToggle';
import useMetricTracking from '../hooks/useMetricTracking';
import CommentsPanel from './CommentsPanel';
import ValueHistoryPanel from './ValueHistoryPanel';
import '../index.css';

export default function NodeMemoryTotalBytes() {
  const [totalMemory, setTotalMemory] = useState(null);
  const [status, setStatus] = useState(null);
  const { getAuthHeaders } = useAuth();

  const {
    metricId,
    isTracked,
    toggleTracking,
    initialized
  } = useMetricTracking('NODE_MEMORY_TOTAL_BYTES');

  useEffect(() => {
    if (!initialized) return;
    let cancelled = false;

    async function fetchData() {
      try {
        setStatus(null);
        console.log('Fetching memory data...');
        
        const url = getAbsoluteURL(API_ENDPOINTS.memTotalBytes);
        console.log('Request URL:', url);
        
        const response = await fetch(url, { headers: getAuthHeaders() });
        if (cancelled) return;
        
        if (!response.ok) {
          console.error('Failed to fetch memory data:', response.status);
          setStatus(response.status);
          return;
        }
        
        const data = await response.json();
        console.log('Received memory data:', data);
        
        if (typeof data.node_memory_MemTotal_bytes === 'number') {
          setTotalMemory(data.node_memory_MemTotal_bytes);
          setStatus(200);
        } else {
          console.error('Invalid memory data format:', data);
          setStatus(500);
        }
      } catch (err) {
        console.error('Error fetching memory data:', err);
        setStatus(500);
      }
    }

    fetchData();
    const id = setInterval(fetchData, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [initialized, getAuthHeaders]);

  if (!initialized) {
    console.log('Component not initialized yet');
    return null;
  }

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const containerStyle = {
    width: '100%',
    maxWidth: '600px',
    margin: '20px auto',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '15px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
  };

  const memoryDisplayStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '30px',
    backgroundColor: '#fff',
    borderRadius: '10px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  };

  const valueStyle = {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#2c3e50',
    margin: '20px 0',
    textAlign: 'center'
  };

  const labelStyle = {
    fontSize: '18px',
    color: '#666',
    marginBottom: '10px'
  };

  const iconStyle = {
    fontSize: '64px',
    color: '#3498db',
    marginBottom: '20px'
  };

  return (
    <div className="metric-container">
      <div className="metric-header">
        <StarToggle isOn={isTracked} onToggle={toggleTracking} />
        <h1 className="title">Memory Total Bytes</h1>
      </div>
      <p className="description">
        Общий объем оперативной памяти в системе.
      </p>
      <div className="metric-status">
        <RequestIndicator statusCode={status} />
      </div>

      <div style={containerStyle}>
        <div style={memoryDisplayStyle}>
          <div style={iconStyle}>💾</div>
          <div style={labelStyle}>Общий объем памяти</div>
          <div style={valueStyle}>
            {totalMemory != null ? formatBytes(totalMemory) : '—'}
          </div>
        </div>
      </div>

      <CommentsPanel metricId={metricId} />
      <ValueHistoryPanel metricId={metricId} />
    </div>
  );
} 