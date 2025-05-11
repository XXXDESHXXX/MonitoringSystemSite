export const BASE_API_URL = 'http://localhost:5000';

export const API_ENDPOINTS = {
  // Auth
  login: '/auth/login',
  logout: '/auth/logout',
  register: '/auth/register',
  checkAuth: '/auth/check',

  // Metrics
  listMetrics: '/metrics',
  listTags: '/tags',
  trackedMetrics: '/metrics/tracked',
  trackMetric: (id) => `/metrics/${id}/track`,
  untrackMetric: (id) => `/metrics/${id}/track`,
  metricComments: (id) => `/metrics/${id}/comments`,
  metricHistory: (id) => `/metrics/${id}/values`,

  // Metric endpoints
  loadAverage: '/metrics/load_average',
  cpuSecondsTotal: '/metrics/node_cpu_seconds_total',
  memFreeBytes: '/metrics/node_memory_memfree_bytes',
  memTotalBytes: '/metrics/node_memory_total_bytes',
  cpuUsagePercent: '/metrics/node_cpu_usage_percent',
  diskReadBytes: '/metrics/node_disk_read_bytes',
  diskWriteBytes: '/metrics/node_disk_write_bytes',
  memCachedBytes: '/metrics/node_memory_cached_bytes',
  diskIOTime: '/metrics/node_disk_io_time',
  uptime: '/metrics/node_uptime',
  networkTransmit: '/metrics/node_network_transmit_bytes',
  tags: '/tags',
  adminPanel: '/admin',
  adminTags: '/admin/tags',
  adminUsers: '/admin/users',
  metricValues: (id) => `/metrics/${id}/values`,
  commentsByMetric: (metricId) => `/metrics/${metricId}/comments`,
  updateComment: (commentId) => `/comments/${commentId}`,
  adminMetricTags: (metricId, tagId) => `/admin/metrics/${metricId}/tags/${tagId}`,
  userSettings: '/auth/settings'
};