// src/hooks/useMetricTracking.js

import { useState, useEffect, useCallback } from 'react';
import { getAbsoluteURL } from '../utils/utils';
import { API_ENDPOINTS } from '../constants';
import { useAuth } from '../AuthContext';

export default function useMetricTracking(metricName) {
  const { getAuthHeaders } = useAuth();
  // ID метрики в БД
  const [metricId, setMetricId] = useState(null);
  // находится ли она сейчас в избранном
  const [isTracked, setIsTracked] = useState(false);
  // признак того, что init-запросы завершились
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        // параллельно получаем все метрики и список отслеживаемых ID
        const [allRes, trackedRes] = await Promise.all([
          fetch(getAbsoluteURL(API_ENDPOINTS.listMetrics), { 
            headers: getAuthHeaders()
          }),
          fetch(getAbsoluteURL(API_ENDPOINTS.trackedMetrics), { 
            headers: getAuthHeaders()
          })
        ]);
        if (!allRes.ok || !trackedRes.ok) {
          console.error('Failed to fetch metrics or tracked metrics');
          return;
        }

        const [allMetrics, tracked] = await Promise.all([
          allRes.json(),
          trackedRes.json()
        ]);

        // находим объект метрики по её имени
        const metric = allMetrics.find(m => m.name === metricName);
        if (!metric) {
          console.warn(`Metric "${metricName}" not found`);
          return;
        }

        // сохраняем её ID
        setMetricId(metric.id);

        // tracked может быть массивом {id,name} или просто [id,...]
        const trackedIds = tracked.map(x => (typeof x === 'object' ? x.id : x));
        setIsTracked(trackedIds.includes(metric.id));

        setInitialized(true);
      } catch (err) {
        console.error('useMetricTracking init error:', err);
      }
    }

    init();
  }, [metricName, getAuthHeaders]);

  const toggleTracking = useCallback(async () => {
    if (!metricId) return;
    const method = isTracked ? 'DELETE' : 'POST';
    try {
      const res = await fetch(
        getAbsoluteURL(API_ENDPOINTS.trackMetric(metricId)),
        { 
          method, 
          headers: getAuthHeaders()
        }
      );
      if (res.ok) {
        setIsTracked(prev => !prev);
      } else {
        console.error(`toggleTracking failed: ${res.status}`);
      }
    } catch (err) {
      console.error('toggleTracking error:', err);
    }
  }, [isTracked, metricId, getAuthHeaders]);

  return { metricId, isTracked, toggleTracking, initialized };
}
