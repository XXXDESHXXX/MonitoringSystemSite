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
import { useAuth } from '../AuthContext';
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

export default function NodeCPUSecondsTotal() {
  const [value, setValue] = useState(null);
  const [status, setStatus] = useState(null);
  const [lastValue, setLastValue] = useState(null);
  const { getAuthHeaders } = useAuth();

  const {
    metricId,
    isTracked,
    toggleTracking,
    initialized
  } = useMetricTracking('NODE_CPU_SECONDS_TOTAL');

  useEffect(() => {
    if (!initialized) return;
    let cancelled = false;

    async function fetchData() {
      try {
        setStatus(null);
        console.log('Fetching CPU seconds total data...');
        const url = getAbsoluteURL(API_ENDPOINTS.cpuSecondsTotal);
        console.log('URL:', url);
        
        const res = await fetch(url, { headers: getAuthHeaders() });
        if (cancelled) return;
        
        setStatus(res.status);
        if (!res.ok) {
          console.error('Failed to fetch CPU seconds total:', res.status);
          return;
        }
        
        const json = await res.json();
        console.log('Received data:', json);
        
        if (typeof json.node_cpu_seconds_total === 'number') {
          setLastValue(value);
          setValue(json.node_cpu_seconds_total);
        }
      } catch (err) {
        console.error('Error fetching CPU seconds total:', err);
        setStatus(500);
      }
    }

    fetchData();
    const id = setInterval(fetchData, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [initialized, value, getAuthHeaders]);

  if (!initialized) {
    console.log('Component not initialized yet');
    return null;
  }

  const getIncrement = () => {
    if (!value || !lastValue) return 0;
    return value - lastValue;
  };

  const pieData = {
    labels: ['Прошлое значение', 'Прирост'],
    datasets: [
      {
        data: [lastValue || 0, getIncrement()],
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 159, 64, 0.8)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 159, 64, 1)',
        ],
        borderWidth: 2,
        hoverOffset: 4,
        hoverBorderWidth: 3,
        hoverBorderColor: 'rgba(255, 255, 255, 0.8)',
        hoverBackgroundColor: [
          'rgba(54, 162, 235, 0.9)',
          'rgba(255, 159, 64, 0.9)',
        ],
      },
    ],
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          font: {
            size: 14,
            weight: 'bold'
          },
          color: '#666'
        }
      },
      title: {
        display: true,
        text: 'Распределение времени CPU',
        font: {
          size: 18,
          weight: 'bold'
        },
        padding: {
          top: 20,
          bottom: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          size: 16,
          weight: 'bold'
        },
        bodyFont: {
          size: 14
        },
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context) {
            return `${context.label}: ${context.raw.toFixed(2)} сек`;
          }
        }
      }
    },
    animation: {
      animateScale: true,
      animateRotate: true,
      duration: 1000,
      easing: 'easeOutQuart'
    },
    cutout: '30%',
    radius: '90%'
  };

  return (
    <div className="metric-container">
      <div className="metric-header">
        <StarToggle isOn={isTracked} onToggle={toggleTracking} />
        <h1 className="title">CPU Seconds Total</h1>
      </div>
      <p className="description">
        Общее время работы процессора в секундах.
      </p>
      <div className="metric-status">
        <RequestIndicator statusCode={status} />
        <span className="metric-value">
          Значение: {value != null ? `${value.toFixed(2)} сек` : '—'}
        </span>
        {getIncrement() > 0 && (
          <span className="metric-increment" style={{ color: '#FF9F40', marginLeft: '10px' }}>
            (+{getIncrement().toFixed(2)} сек)
          </span>
        )}
      </div>

      <div className="chart-container" style={{ 
        maxWidth: '400px', 
        margin: '20px auto',
        height: '400px',
        position: 'relative'
      }}>
        <Pie data={pieData} options={pieOptions} />
      </div>

      <CommentsPanel metricId={metricId} />
      <ValueHistoryPanel metricId={metricId} />
    </div>
  );
}
