import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
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
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function NodeProcessCount() {
  const [processData, setProcessData] = useState({
    labels: [],
    datasets: [{
      label: 'Количество процессов',
      data: [],
      backgroundColor: 'rgba(153, 102, 255, 0.8)',
      borderColor: 'rgb(153, 102, 255)',
      borderWidth: 1
    }]
  });
  const [status, setStatus] = useState(null);
  const [currentValue, setCurrentValue] = useState(null);
  const { getAuthHeaders } = useAuth();

  const {
    metricId,
    isTracked,
    toggleTracking,
    initialized
  } = useMetricTracking('NODE_PROCESS_COUNT');

  useEffect(() => {
    if (!initialized) return;
    let cancelled = false;

    async function fetchData() {
      setStatus(null);
      const url = getAbsoluteURL(API_ENDPOINTS.processCount);
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (cancelled) return;
      setStatus(res.status);
      if (!res.ok) return;
      const json = await res.json();
      if (typeof json.node_process_count === 'number') {
        setCurrentValue(json.node_process_count);
        setProcessData(prevData => {
          const newData = {
            labels: [...prevData.labels, new Date().toLocaleTimeString()],
            datasets: [{
              ...prevData.datasets[0],
              data: [...prevData.datasets[0].data, json.node_process_count]
            }]
          };
          return newData;
        });
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

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Количество процессов'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };

  return (
    <div className="metric-container">
      <div className="metric-header">
        <StarToggle isOn={isTracked} onToggle={toggleTracking} />
        <h1 className="title">Метрика: Node Process Count</h1>
      </div>
      <p className="description">
        Текущее количество процессов в системе.
      </p>
      <div className="metric-status">
        <RequestIndicator statusCode={status} />
        <span className="metric-value">
          Текущее значение: {currentValue != null ? `${currentValue} процессов` : '—'}
        </span>
      </div>

      <div className="chart-container">
        <Bar options={options} data={processData} />
      </div>

      <CommentsPanel metricId={metricId} />
      <ValueHistoryPanel metricId={metricId} />
    </div>
  );
} 