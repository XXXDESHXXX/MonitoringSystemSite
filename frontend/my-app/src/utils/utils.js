import { BASE_API_URL } from '../constants';

export function getAbsoluteURL(endpoint) {
  return `${BASE_API_URL}${endpoint}`;  // endpoint должен начинаться с '/'
}