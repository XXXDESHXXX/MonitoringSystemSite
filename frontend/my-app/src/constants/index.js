export const BASE_API_URL = '';  // CRA-proxy

export const API_ENDPOINTS = {
  me: '/auth/me',
  logout: '/auth/logout',
  listMetrics: '/metrics',
  loadAverage: '/metrics/load_average',
  cpuSeconds: '/metrics/node_cpu_seconds_total',
  memFreeBytes: '/metrics/node_memory_memfree_bytes',
  login: '/auth/login',
  register: '/auth/register',
};
