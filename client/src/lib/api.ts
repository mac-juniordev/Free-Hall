import axios, { AxiosError } from 'axios';
import type { ApiError } from '../types/api';

/**
 * Axios instance. Base URL is empty in dev — Vite proxies /api to the backend.
 * The JWT interceptor attaches the stored token to every request.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// Request interceptor — attach Bearer token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('freehall_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — on 401, clear the token and let the router handle redirect
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<ApiError>) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('freehall_token');
      localStorage.removeItem('freehall_user');
      // If we're not already on /login, force a hard redirect
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

/**
 * Extract a friendly message from an API error (Axios or network).
 */
export function extractError(err: unknown): string {
  if (axios.isAxiosError<ApiError>(err)) {
    const apiErr = err.response?.data;
    if (apiErr?.error) return apiErr.error;
    if (err.code === 'ECONNABORTED') return 'Request timed out. Check your network.';
    if (!err.response) return 'Cannot reach server. Check your connection.';
    return `Request failed (${err.response.status})`;
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}