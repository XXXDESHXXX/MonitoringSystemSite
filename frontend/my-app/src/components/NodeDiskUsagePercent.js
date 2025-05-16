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

export default function NodeDiskUsagePercent() {
  const [diskUsage, setDiskUsage] = useState(null);
  const [status, setStatus] = useState(null);
  const { getAuthHeaders } = useAuth();

  const {
    metricId,
    isTracked,
    toggleTracking,
    initialized
  } = useMetricTracking('NODE_DISK_USAGE_PERCENT');

  useEffect(() => {
    if (!initialized) return;
    let cancelled = false;
    async function fetchData() {
      setStatus(null);
      try {
        const url = getAbsoluteURL(API_ENDPOINTS.diskUsagePercent);
        const res = await fetch(url, { headers: getAuthHeaders() });
        if (cancelled) return;
        
        setStatus(res.status);
        if (!res.ok) {
          console.error('Failed to fetch disk usage:', res.status);
          return;
        }
        
        const json = await res.json();
        const value = json.value || json.node_disk_usage_percent || json.disk_usage_percent;
        if (typeof value === 'number') {
          setDiskUsage(value);
        }
      } catch (error) {
        console.error('Error fetching disk usage:', error);
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

  if (!initialized) return null;

  const pieData = {
    labels: ['Использовано', 'Свободно'],
    datasets: [
      {
        data: [diskUsage || 0, 100 - (diskUsage || 0)],
        backgroundColor: [
          'rgba(255, 159, 64, 0.8)',
          'rgba(54, 162, 235, 0.8)',
        ],
        borderColor: [
          'rgba(255, 159, 64, 1)',
          'rgba(54, 162, 235, 1)',
        ],
        borderWidth: 2,
        hoverOffset: 4,
        hoverBorderWidth: 3,
        hoverBorderColor: 'rgba(255, 255, 255, 0.8)',
        hoverBackgroundColor: [
          'rgba(255, 159, 64, 0.9)',
          'rgba(54, 162, 235, 0.9)',
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
        text: 'Распределение использования диска',
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
        <h1 className="title">Disk Usage Percent</h1>
      </div>
      <p className="description">
        Процент использования дискового пространства.
      </p>
      <div className="metric-status">
        <RequestIndicator statusCode={status} />
        <span className="metric-value">
          Значение: {diskUsage != null ? `${diskUsage.toFixed(2)} %` : '—'}
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
