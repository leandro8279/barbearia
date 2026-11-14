/* eslint-disable no-useless-assignment */

import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

const PUBLIC_PATHS = new Set(['/auth/login', '/auth/register', '/auth/guest', '/auth/forgot', '/auth/reset']);

const http = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: 'application/json' },
});

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const path = config.url ?? '';
  const hasCustomAuth = config.headers.has('Authorization') || config.headers.has('X-Appointment-Token');

  if (!PUBLIC_PATHS.has(path) && !hasCustomAuth) {
    // const token = useSessionStore.getState().token;
    // if (token) config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// Response: normaliza erros em HttpError
http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<unknown>) => {
    const status = error.response?.status ?? 0;
    const payload = error.response?.data;

    let message = 'Não foi possível concluir a solicitação.';

    if (typeof payload === 'object' && payload !== null && 'message' in payload && typeof payload.message === 'string') {
      message = payload.message;
    } else {
      message = error.response?.statusText || 'Não foi possível concluir a solicitação.';
    }

    return Promise.reject(new HttpError(message, status, payload));
  },
);

export async function apiRequest<T>(path: string, config: AxiosRequestConfig = {}): Promise<T> {
  const { data } = await http.request<T>({ url: path, ...config });

  return data;
}

export function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}
