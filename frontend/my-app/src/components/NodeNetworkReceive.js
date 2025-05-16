import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function NodeNetworkReceive() {
  console.log('NodeNetworkReceive component rendering...');
  
  const [networkData, setNetworkData] = useState({
    labels: [],
    datasets: [{
      label: 'Получено байт',
      data: [],
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1
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
  } = useMetricTracking('NODE_NETWORK_RECEIVE_BYTES');

  console.log('useMetricTracking hook state:', { metricId, isTracked, initialized });

  useEffect(() => {
    console.log('useEffect triggered, initialized:', initialized);
    if (!initialized) {
      console.log('Component not initialized yet, skipping data fetch');
      return;
    }
    
    let cancelled = false;
    async function fetchData() {
      setStatus(null);
      console.log('Fetching network receive data...');
      try {
        const url = getAbsoluteURL(API_ENDPOINTS.networkReceive);
        console.log('Request URL:', url);
        
        const res = await fetch(url, { headers: getAuthHeaders() });
        if (cancelled) {
          console.log('Request cancelled');
          return;
        }
        
        setStatus(res.status);
        if (!res.ok) {
          console.error('Failed to fetch network receive:', res.status);
          return;
        }
        
        const json = await res.json();
        console.log('Received data:', json);
        
        // Проверяем разные возможные форматы ответа
        const value = json.value || json.node_network_receive_bytes || json.network_receive_bytes;
        if (typeof value === 'number') {
          console.log('Setting network receive value:', value);
          setCurrentValue(value);
          setNetworkData(prevData => {
            const newData = {
              labels: [...prevData.labels, new Date().toLocaleTimeString()],
              datasets: [{
                ...prevData.datasets[0],
                data: [...prevData.datasets[0].data, value]
              }]
            };
            console.log('Updated chart data:', newData);
            return newData;
          });
        } else {
          console.warn('Unexpected data format:', json);
        }
      } catch (error) {
        console.error('Error fetching network receive:', error);
        setStatus(500);
      }
    }
    fetchData();
    const id = setInterval(fetchData, 1000);
    return () => {
      console.log('Cleaning up interval and cancelling requests');
      cancelled = true;
      clearInterval(id);
    };
  }, [initialized, getAuthHeaders]);

  if (!initialized) {
    console.log('Component not initialized yet, returning null');
    return null;
  }

  console.log('Rendering component with data:', { currentValue, networkData });

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Получено байт по сети'
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  return (
    <div className="metric-container">
      <div className="metric-header">
        <StarToggle isOn={isTracked} onToggle={toggleTracking} />
        <h1 className="title">Метрика: Network Receive Bytes</h1>
      </div>
      <p className="description">
        Количество байт, полученных по сети.
      </p>
      <div className="metric-status">
        <RequestIndicator statusCode={status} />
        <span className="metric-value">
          Текущее значение: {currentValue != null 
            ? `${(currentValue / (1024 * 1024)).toFixed(2)} MB` 
            : '—'}
        </span>
      </div>

      <div className="chart-container">
        <Line options={options} data={networkData} />
      </div>

      <CommentsPanel metricId={metricId} />
      <ValueHistoryPanel metricId={metricId} />
    </div>
  );
} 