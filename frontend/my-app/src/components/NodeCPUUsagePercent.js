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

export default function NodeCPUUsagePercent() {
  const [value, setValue] = useState(null);
  const [status, setStatus] = useState(null);
  const { getAuthHeaders } = useAuth();

  const {
    metricId,
    isTracked,
    toggleTracking,
    initialized
  } = useMetricTracking('NODE_CPU_USAGE_PERCENT');

  useEffect(() => {
    if (!initialized) return;
    let cancelled = false;

    async function fetchData() {
      setStatus(null);
      const res = await fetch(
        getAbsoluteURL(API_ENDPOINTS.cpuUsagePercent),
        { headers: getAuthHeaders() }
      );
      if (cancelled) return;
      setStatus(res.status);
      if (!res.ok) return;
      const json = await res.json();
      if (typeof json.node_cpu_usage_percent === 'number') {
        setValue(json.node_cpu_usage_percent);
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

  const getColorForUsage = (usage) => {
    if (usage < 50) return 'rgba(75, 192, 192, 0.8)'; // Зеленый для низкой нагрузки
    if (usage < 80) return 'rgba(255, 159, 64, 0.8)'; // Оранжевый для средней нагрузки
    return 'rgba(255, 99, 132, 0.8)'; // Красный для высокой нагрузки
  };

  const pieData = {
    labels: ['Использовано', 'Свободно'],
    datasets: [
      {
        data: [value || 0, 100 - (value || 0)],
        backgroundColor: [
          getColorForUsage(value || 0),
          'rgba(201, 203, 207, 0.8)',
        ],
        borderColor: [
          getColorForUsage(value || 0).replace('0.8', '1'),
          'rgba(201, 203, 207, 1)',
        ],
        borderWidth: 2,
        hoverOffset: 4,
        hoverBorderWidth: 3,
        hoverBorderColor: 'rgba(255, 255, 255, 0.8)',
        hoverBackgroundColor: [
          getColorForUsage(value || 0).replace('0.8', '0.9'),
          'rgba(201, 203, 207, 0.9)',
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
        text: 'Использование CPU',
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
            return `${context.label}: ${context.raw.toFixed(2)}%`;
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
        <h1 className="title">CPU Usage</h1>
      </div>
      <p className="description">
        Процент использования CPU в системе.
      </p>
      <div className="metric-status">
        <RequestIndicator statusCode={status} />
        <span className="metric-value">
          Значение: {value != null ? `${value.toFixed(2)}%` : '—'}
        </span>
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