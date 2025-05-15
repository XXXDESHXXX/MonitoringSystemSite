export const BASE_API_URL = 'http://monitoringsite.online';

export const API_ENDPOINTS = {
  // Auth
  login: '/api/auth/login',
  logout: '/api/auth/logout',
  register: '/api/auth/register',
  checkAuth: '/api/auth/check',

  // Metrics
  listMetrics: '/api/metrics',
  listTags: '/api/tags',
  trackedMetrics: '/api/metrics/tracked',
  trackMetric: (id) => `/api/metrics/${id}/track`,
  untrackMetric: (id) => `/api/metrics/${id}/track`,
  metricComments: (id) => `/api/metrics/${id}/comments`,
  metricHistory: (id) => `/api/metrics/${id}/values`,

  // Metric endpoints
  loadAverage: '/api/metrics/load_average',
  cpuSecondsTotal: '/api/metrics/node_cpu_seconds_total',
  memFreeBytes: '/api/metrics/node_memory_memfree_bytes',
  memTotalBytes: '/api/metrics/node_memory_total_bytes',
  cpuUsagePercent: '/api/metrics/node_cpu_usage_percent',
  diskReadBytes: '/api/metrics/node_disk_read_bytes',
  diskWriteBytes: '/api/metrics/node_disk_write_bytes',
  memCachedBytes: '/api/metrics/node_memory_cached_bytes',
  diskIOTime: '/api/metrics/node_disk_io_time',
  uptime: '/api/metrics/node_uptime',
  networkTransmit: '/api/metrics/node_network_transmit_bytes',
  networkReceive: '/api/metrics/node_network_receive_bytes',
  diskUsagePercent: '/api/metrics/node_disk_usage_percent',
  memoryUsagePercent: '/api/metrics/node_memory_usage_percent',
  processCount: '/api/metrics/node_process_count',
  tags: '/api/tags',
  adminPanel: '/api/admin',
  adminTags: '/api/admin/tags',
  adminUsers: '/api/admin/users',
  metricValues: (id) => `/api/metrics/${id}/values`,
  commentsByMetric: (metricId) => `/api/metrics/${metricId}/comments`,
  updateComment: (commentId) => `/api/comments/${commentId}`,
  adminMetricTags: (metricId, tagId) => `/api/admin/metrics/${metricId}/tags/${tagId}`,
  userSettings: '/api/auth/settings'
};