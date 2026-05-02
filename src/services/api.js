/**
 * api.js — Axios instance dengan JWT interceptor.
 *
 * - Otomatis menyisipkan "Authorization: Bearer <token>" di setiap request
 * - Jika API return 401, otomatis hapus auth & redirect ke /login
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3001';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request Interceptor: sisipkan JWT ────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor: tangani 401 (token expired/invalid) ────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Hapus auth data dan redirect ke login
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      // Paksa reload ke /login — sederhana dan andal
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
