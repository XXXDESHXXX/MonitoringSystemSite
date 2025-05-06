import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAbsoluteURL } from '../utils/utils';
import { API_ENDPOINTS } from '../constants';
import './ValueHistoryPanel.css';

const INTERVALS = [
  { label: 'Последний час', value: 'hour' },
  { label: 'Последние 24 часа', value: 'day' },
  { label: 'Последняя неделя', value: 'week' },
];

export default function ValueHistoryPanel({ metricId }) {
  const [open, setOpen] = useState(false);
  const [interval, setInterval] = useState('hour');
  const [data, setData] = useState([]);
  const [sortBy, setSortBy] = useState('date');
  const [order, setOrder] = useState('asc');

  const computeRange = () => {
    const now = new Date();
    const from = new Date(now);
    if (interval === 'hour') from.setHours(now.getHours() - 1);
    if (interval === 'day') from.setDate(now.getDate() - 1);
    if (interval === 'week') from.setDate(now.getDate() - 7);
    return { from: from.toISOString(), to: now.toISOString() };
  };

  useEffect(() => {
    if (!open) return;
    const { from, to } = computeRange();
    const params = new URLSearchParams({
      from,
      to,
      sort_by: sortBy,
      order
    });
    const url = `${getAbsoluteURL(API_ENDPOINTS.metricValues(metricId))}?${params}`;

    fetch(url, { credentials: 'include' })
      .then(async res => res.ok ? res.json() : [])
      .then(arr => setData(Array.isArray(arr) ? arr : []))
      .catch(err => {
        console.error('History fetch error:', err);
        setData([]);
      });
  }, [open, interval, metricId, sortBy, order]);

  return (
    <div className="history-panel">
      <button className="toggle-btn" onClick={() => setOpen(o => !o)}>
        {open ? 'Скрыть историю' : 'Показать историю'}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="history-body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4 }}>
            <div className="history-controls">
              {INTERVALS.map(i => (
                <button key={i.value} className={i.value === interval ? 'active' : ''} onClick={() => setInterval(i.value)}>
                  {i.label}
                </button>
              ))}
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="date">По дате</option>
                <option value="value">По значению</option>
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
                      <span className="hist-date">{new Date(item.date).toLocaleString()}</span>
                      <span className="hist-value">{item.value}</span>
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