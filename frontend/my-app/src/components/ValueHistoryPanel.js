// src/components/ValueHistoryPanel.js
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence }          from 'framer-motion';
import { io }                                from 'socket.io-client';
import { getAbsoluteURL }                    from '../utils/utils';
import { API_ENDPOINTS }                     from '../constants';
import './ValueHistoryPanel.css';
import { useAuth } from '../AuthContext';

const INTERVALS = [
  { label: 'Последний час',     value: 'hour' },
  { label: 'Последние 24 часа', value: 'day'  },
  { label: 'Последняя неделя',  value: 'week' },
];

export default function ValueHistoryPanel({ metricId }) {
  const [open,     setOpen]     = useState(false);
  const [interval, setInterval] = useState('hour');
  const [data,     setData]     = useState([]);
  const [sortBy,   setSortBy]   = useState('date');
  const [order,    setOrder]    = useState('asc');
  const socketRef = useRef(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { getAuthHeaders } = useAuth();

  // 1) Подключаемся к бекенд‑WebSocket один раз
  useEffect(() => {
    const socketUrl = window.location.protocol === 'https:' 
      ? `wss://${window.location.host}`
      : `ws://${window.location.host}`;

    socketRef.current = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true,
      forceNew: true,
      timeout: 10000
    });

    socketRef.current.on('connect', () => {
      console.log('Socket.IO connected to:', socketUrl);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // 2) При открытии панели: initial load + подписка
  useEffect(() => {
    if (!open) return;

    // initial HTTP‑запрос
    const { from, to } = computeRange();
    const params = new URLSearchParams({ from, to, sort_by: sortBy, order });
    fetch(`${getAbsoluteURL(API_ENDPOINTS.metricValues(metricId))}?${params}`, {
      headers: getAuthHeaders()
    })
      .then(res => res.ok ? res.json() : [])
      .then(arr => setData(Array.isArray(arr) ? arr : []))
      .catch(() => setData([]));

    // WebSocket‑подписка
    socketRef.current.emit('subscribe', { metricId });
    const handler = ({ metricId: mid, value, date }) => {
      if (mid !== metricId) return;
      setData(prev => {
        const next = [...prev, { value, date }];
        return next.sort((a, b) => {
          const fieldA = sortBy === 'value' ? a.value : new Date(a.date).getTime();
          const fieldB = sortBy === 'value' ? b.value : new Date(b.date).getTime();
          return order === 'asc' ? fieldA - fieldB : fieldB - fieldA;
        });
      });
    };
    socketRef.current.on('newValue', handler);

    return () => {
      socketRef.current.emit('unsubscribe', { metricId });
      socketRef.current.off('newValue', handler);
    };
  }, [open, metricId, interval, sortBy, order]);

  useEffect(() => {
    async function fetchHistory() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          getAbsoluteURL(API_ENDPOINTS.metricHistory(metricId)),
          { headers: getAuthHeaders() }
        );
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        setHistory(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [metricId, getAuthHeaders]);

  // Вычисление временного окна
  const computeRange = () => {
    const now = new Date(), from = new Date(now);
    if (interval === 'hour') from.setHours(now.getHours() - 1);
    if (interval === 'day')  from.setDate(now.getDate() - 1);
    if (interval === 'week') from.setDate(now.getDate() - 7);
    return { from: from.toISOString(), to: now.toISOString() };
  };

  return (
    <div className="history-panel">
      <button className="toggle-btn" onClick={() => setOpen(o => !o)}>
        {open ? 'Скрыть историю' : 'Показать историю'}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="history-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit   ={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="history-controls">
              {INTERVALS.map(i => (
                <button
                  key={i.value}
                  className={i.value === interval ? 'active' : ''}
                  onClick={() => setInterval(i.value)}
                >
                  {i.label}
                </button>
              ))}
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="date">Сортировать по дате</option>
                <option value="value">Сортировать по значению</option>
              </select>
              <select value={order} onChange={e => setOrder(e.target.value)}>
                <option value="asc">По возрастанию</option>
                <option value="desc">По убыванию</option>
              </select>
            </div>
            <ul className="history-list">
              {data.length === 0
                ? <li className="no-data">Данных нет</li>
                : data.map((item, idx) => (
                    <li key={idx}>
                      <span className="hist-date">
                        {new Date(item.date).toLocaleString()}
                      </span>
                      <span className="hist-value">
                        {item.value}
                      </span>
                    </li>
                  ))
              }
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
