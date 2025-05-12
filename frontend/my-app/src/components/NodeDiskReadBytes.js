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

export default function NodeDiskReadBytes() {
  const [value, setValue] = useState(null);
  const [status, setStatus] = useState(null);
  const [lastValue, setLastValue] = useState(null);
  const [speed, setSpeed] = useState(0);

  const {
    metricId,
    isTracked,
    toggleTracking,
    initialized
  } = useMetricTracking('NODE_DISK_READ_BYTES');

  useEffect(() => {
    if (!initialized) return;
    let cancelled = false;

    async function fetchData() {
      try {
        setStatus(null);
        console.log('Fetching disk read bytes data...');
        const url = getAbsoluteURL(API_ENDPOINTS.diskReadBytes);
        console.log('URL:', url);
        
        const res = await fetch(url, { credentials: 'include' });
        if (cancelled) return;
        
        setStatus(res.status);
        if (!res.ok) {
          console.error('Failed to fetch disk read bytes:', res.status);
          return;
        }
        
        const json = await res.json();
        console.log('Received data:', json);
        
        if (typeof json.node_disk_read_bytes === 'number') {
          setLastValue(value);
          setValue(json.node_disk_read_bytes);
          if (value) {
            setSpeed(json.node_disk_read_bytes - value);
          }
        }
      } catch (err) {
        console.error('Error fetching disk read bytes:', err);
        setStatus(500);
      }
    }

    fetchData();
    const id = setInterval(fetchData, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [initialized, value]);

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

  const getColorForSpeed = (speedValue) => {
    const speedMB = speedValue / (1024 * 1024);
    if (speedMB < 1) return 'rgba(75, 192, 192, 0.8)'; // Зеленый для низкой скорости
    if (speedMB < 10) return 'rgba(255, 159, 64, 0.8)'; // Оранжевый для средней скорости
    return 'rgba(255, 99, 132, 0.8)'; // Красный для высокой скорости
  };

  const pieData = {
    labels: ['Общее чтение', 'Текущая скорость'],
    datasets: [
      {
        data: [value || 0, speed || 0],
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)',
          getColorForSpeed(speed || 0),
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          getColorForSpeed(speed || 0).replace('0.8', '1'),
        ],
        borderWidth: 2,
        hoverOffset: 4,
        hoverBorderWidth: 3,
        hoverBorderColor: 'rgba(255, 255, 255, 0.8)',
        hoverBackgroundColor: [
          'rgba(54, 162, 235, 0.9)',
          getColorForSpeed(speed || 0).replace('0.8', '0.9'),
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
        text: 'Статистика чтения диска',
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
            return `${context.label}: ${formatBytes(context.raw)}`;
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
        <h1 className="title">Disk Read Bytes</h1>
      </div>
      <p className="description">
        Общее количество байт, прочитанных с диска.
      </p>
      <div className="metric-status">
        <RequestIndicator statusCode={status} />
        <span className="metric-value">
          Значение: {value != null ? formatBytes(value) : '—'}
        </span>
        {speed > 0 && (
          <span className="metric-speed" style={{ 
            color: getColorForSpeed(speed).replace('0.8', '1'),
            marginLeft: '10px',
            fontWeight: 'bold'
          }}>
            (Скорость: {formatBytes(speed)}/с)
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