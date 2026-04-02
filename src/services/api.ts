import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const baseApiUrl =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BASE_URL ||
  'http://localhost:5000/api';

export const PLATFORM_API_BASE_URL =
  import.meta.env.VITE_PLATFORM_API_BASE_URL ||
  `${baseApiUrl.replace(/\/$/, '')}/platform`;

export const TENANT_APP_URL =
  import.meta.env.VITE_TENANT_APP_URL || 'http://localhost:5173';

export const api = axios.create({
  baseURL: PLATFORM_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let interceptorsReady = false;

export const setupApiInterceptors = (): void => {
  if (interceptorsReady) {
    return;
  }

  interceptorsReady = true;

  api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (config.headers?.Authorization) {
      delete config.headers.Authorization;
    }

    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error?.response?.status === 401) {
        useAuthStore.getState().clearSession();
        if (window.location.pathname !== '/login') {
          window.location.assign('/login');
        }
      }

      return Promise.reject(error);
    }
  );
};

setupApiInterceptors();
