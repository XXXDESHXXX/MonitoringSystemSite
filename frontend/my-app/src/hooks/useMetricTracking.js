import { useState, useEffect, useCallback } from 'react';
import { getAbsoluteURL } from '../utils/utils';
import { API_ENDPOINTS } from '../constants';

export default function useMetricTracking(metricName) {
  const [metricId, setMetricId] = useState(null);
  const [isTracked, setIsTracked] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        // Получаем все метрики и список отслеживаемых
        const [allRes, trackedRes] = await Promise.all([
          fetch(getAbsoluteURL(API_ENDPOINTS.listMetrics), { credentials: 'include' }),
          fetch(getAbsoluteURL(API_ENDPOINTS.trackedMetrics), { credentials: 'include' })
        ]);
        const [allMetrics, tracked] = await Promise.all([allRes.json(), trackedRes.json()]);

        // Ищем метрику по имени
        const metric = allMetrics.find(m => m.name === metricName);
        if (!metric) return;
        setMetricId(metric.id);

        // Собираем список ID отслеживаемых
        const trackedIds = tracked.map(x => (typeof x === 'object' ? x.id : x));
        setIsTracked(trackedIds.includes(metric.id));
        setInitialized(true);
      } catch (err) {
        console.error('useMetricTracking init error:', err);
      }
    }
    init();
  }, [metricName]);

  const toggleTracking = useCallback(async () => {
    if (!metricId) return;
    const method = isTracked ? 'DELETE' : 'POST';
    try {
      const res = await fetch(
        getAbsoluteURL(API_ENDPOINTS.trackMetric(metricId)),
        { method, credentials: 'include' }
      );
      if (res.ok) setIsTracked(prev => !prev);
    } catch (err) {
      console.error('toggleTracking error:', err);
    }
  }, [isTracked, metricId]);

  return { isTracked, toggleTracking, initialized };
}
