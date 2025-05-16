import React, { useEffect, useState } from 'react';
import { getAbsoluteURL }    from '../utils/utils';
import { API_ENDPOINTS }     from '../constants';
import { useAuth }            from '../AuthContext';
import RequestIndicator      from './RequestIndicator';
import StarToggle            from './StarToggle';
import useMetricTracking     from '../hooks/useMetricTracking';
import CommentsPanel         from './CommentsPanel';
import ValueHistoryPanel     from './ValueHistoryPanel';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import '../index.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function NodeDiskWriteBytes() {
  const [value, setValue] = useState(null);
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [timestamps, setTimestamps] = useState([]);
  const { getAuthHeaders } = useAuth();

  const {
    metricId,
    isTracked,
    toggleTracking,
    initialized
  } = useMetricTracking('NODE_DISK_WRITE_BYTES');

  useEffect(() => {
    if (!initialized) return;
    let cancelled = false;

    async function fetchData() {
      setStatus(null);
      const res = await fetch(
        getAbsoluteURL(API_ENDPOINTS.diskWriteBytes),
        { headers: getAuthHeaders() }
      );
      if (cancelled) return;
      setStatus(res.status);
      if (!res.ok) return;
      const json = await res.json();
      if (typeof json.node_disk_write_bytes === 'number') {
        const currentValue = (json.node_disk_write_bytes / (1024 * 1024)).toFixed(2);
        setValue(currentValue);
        
        // Обновляем историю
        const now = new Date();
        setTimestamps(prev => [...prev.slice(-29), now.toLocaleTimeString()]);
        setHistory(prev => [...prev.slice(-29), parseFloat(currentValue)]);
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

  const chartData = {
    labels: timestamps,
    datasets: [
      {
        label: 'Скорость записи (MB/s)',
        data: history,
        borderColor: '#2196F3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} MB/s`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'MB/s'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  const containerStyle = {
    width: '100%',
    maxWidth: '800px',
    margin: '20px auto',
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '10px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  };

  const chartContainerStyle = {
    height: '300px',
    marginTop: '20px'
  };

  const statsContainerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '20px',
    padding: '10px',
    backgroundColor: '#f8f9fa',
    borderRadius: '5px'
  };

  const statItemStyle = {
    textAlign: 'center'
  };

  const statValueStyle = {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#2196F3'
  };

  const statLabelStyle = {
    fontSize: '12px',
    color: '#666'
  };

  const getStats = () => {
    if (history.length === 0) return { min: 0, max: 0, avg: 0 };
    const values = history.filter(v => !isNaN(v));
    return {
      min: Math.min(...values).toFixed(2),
      max: Math.max(...values).toFixed(2),
      avg: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)
    };
  };

  const stats = getStats();

  return (
    <div className="metric-container">
      <div className="metric-header">
        <StarToggle isOn={isTracked} onToggle={toggleTracking} />
        <h1 className="title">Метрика: Disk Write Rate</h1>
      </div>
      <p className="description">
        Скорость записи данных на диск.
      </p>
      <div className="metric-status">
        <RequestIndicator statusCode={status} />
      </div>

      <div style={containerStyle}>
        <div style={chartContainerStyle}>
          <Line data={chartData} options={chartOptions} />
        </div>
        
        <div style={statsContainerStyle}>
          <div style={statItemStyle}>
            <div style={statValueStyle}>{stats.min}</div>
            <div style={statLabelStyle}>Мин. (MB/s)</div>
          </div>
          <div style={statItemStyle}>
            <div style={statValueStyle}>{stats.max}</div>
            <div style={statLabelStyle}>Макс. (MB/s)</div>
          </div>
          <div style={statItemStyle}>
            <div style={statValueStyle}>{stats.avg}</div>
            <div style={statLabelStyle}>Сред. (MB/s)</div>
          </div>
          <div style={statItemStyle}>
            <div style={statValueStyle}>{value || '—'}</div>
            <div style={statLabelStyle}>Текущее (MB/s)</div>
          </div>
        </div>
      </div>

      <CommentsPanel metricId={metricId} />
      <ValueHistoryPanel metricId={metricId} />
    </div>
  );
} 