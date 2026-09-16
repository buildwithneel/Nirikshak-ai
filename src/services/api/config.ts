/**
 * NIRIKSHAK AI — Production API Configuration & Routing Helper
 * Centralizes endpoint resolution between local Vite proxy and deployed Render API.
 */

// Production API base URL provided by Render Web Service
export const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

/**
 * Returns full API URL for a given path.
 * If VITE_API_BASE_URL is not set (development), returns the relative path for Vite proxy.
 * If VITE_API_BASE_URL is set (production), prefixes with the deployed Render backend URL.
 */
export const getApiUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE_URL) {
    return cleanPath;
  }
  return `${API_BASE_URL}${cleanPath}`;
};

/**
 * Convenience helper to attach Bearer token from local storage to request headers.
 */
export const getAuthHeaders = (extraHeaders: Record<string, string> = {}): Record<string, string> => {
  const token = localStorage.getItem('nirikshak_auth_token') || sessionStorage.getItem('nirikshak_auth_token');
  const headers: Record<string, string> = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};
