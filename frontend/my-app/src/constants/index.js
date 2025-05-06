export const BASE_API_URL = '';

export const API_ENDPOINTS = {
  me: '/auth/me',
  logout: '/auth/logout',
  listMetrics: '/metrics',
  trackMetric: (id) => `/metrics/${id}/track`,
  trackedMetrics: '/metrics/tracked',
  loadAverage: '/metrics/load_average',
  cpuSeconds: '/metrics/node_cpu_seconds_total',
  memFreeBytes: '/metrics/node_memory_memfree_bytes',
  login: '/auth/login',
  register: '/auth/register',
  tags: '/tags',
  metricValues: (id) => `/metrics/${id}/values`,
  commentsByMetric: (metricId) => `/metrics/${metricId}/comments`,
  updateComment:    (commentId) => `/comments/${commentId}`,
};