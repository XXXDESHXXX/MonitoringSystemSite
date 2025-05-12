import React, { useEffect, useState } from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { getAbsoluteURL } from '../utils/utils';
import { API_ENDPOINTS } from '../constants';
import RequestIndicator from './RequestIndicator';
import StarToggle from './StarToggle';
import useMetricTracking from '../hooks/useMetricTracking';
import CommentsPanel from './CommentsPanel';
import ValueHistoryPanel from './ValueHistoryPanel';
import '../index.css';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
);

export default function NodeMemoryUsagePercent() {
  const [memoryUsage, setMemoryUsage] = useState(null);
  const [status, setStatus] = useState(null);

  const {
    metricId,
    isTracked,
    toggleTracking,
    initialized
  } = useMetricTracking('NODE_MEMORY_USAGE_PERCENT');

  useEffect(() => {
    if (!initialized) return;
    let cancelled = false;
    async function fetchData() {
      setStatus(null);
      console.log('Fetching memory usage data...');
      try {
        const url = getAbsoluteURL(API_ENDPOINTS.memoryUsagePercent);
        console.log('Request URL:', url);
        
        const res = await fetch(url, { credentials: 'include' });
        if (cancelled) return;
        
        setStatus(res.status);
        if (!res.ok) {
          console.error('Failed to fetch memory usage:', res.status);
          return;
        }
        
        const json = await res.json();
        console.log('Received data:', json);
        
        // Проверяем разные возможные форматы ответа
        const value = json.value || json.node_memory_usage_percent || json.memory_usage_percent;
        if (typeof value === 'number') {
          console.log('Setting memory usage value:', value);
          setMemoryUsage(value);
        } else {
          console.warn('Unexpected data format:', json);
        }
      } catch (error) {
        console.error('Error fetching memory usage:', error);
        setStatus(500);
      }
    }
    fetchData();
    const id = setInterval(fetchData, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [initialized]);

  if (!initialized) {
    console.log('Component not initialized yet');
    return null;
  }

  const pieData = {
    labels: ['Использовано', 'Свободно'],
    datasets: [
      {
        data: [memoryUsage || 0, 100 - (memoryUsage || 0)],
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)',
          'rgba(75, 192, 192, 0.8)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(75, 192, 192, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: 'Распределение использования памяти'
      }
    }
  };

  return (
    <div className="metric-container">
      <div className="metric-header">
        <StarToggle isOn={isTracked} onToggle={toggleTracking} />
        <h1 className="title">Метрика: Memory Usage Percent</h1>
      </div>
      <p className="description">
        Процент использования оперативной памяти.
      </p>
      <div className="metric-status">
        <RequestIndicator statusCode={status} />
        <span className="metric-value">
          Значение: {memoryUsage != null ? `${memoryUsage.toFixed(2)} %` : '—'}
        </span>
      </div>

      <div className="chart-container" style={{ maxWidth: '300px', margin: '20px auto' }}>
        <Pie data={pieData} options={pieOptions} />
      </div>

      <CommentsPanel metricId={metricId} />
      <ValueHistoryPanel metricId={metricId} />
    </div>
  );
} 