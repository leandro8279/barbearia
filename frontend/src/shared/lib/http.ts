import { useSessionStore } from '@/shared/stores/session-store';

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

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body) headers.set('Content-Type', 'application/json');
  const hasAppointmentAccessToken = headers.has('X-Appointment-Token');
  const token =
    ['/auth/login', '/auth/register', '/auth/guest', '/auth/forgot', '/auth/reset'].includes(path) ? null : useSessionStore.getState().token;
  if (token && !hasAppointmentAccessToken && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });

  const contentType = response.headers.get('content-type') ?? '';
  const payload: unknown = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null && 'message' in payload && typeof payload.message === 'string' ?
        payload.message
      : response.statusText || 'Não foi possível concluir a solicitação.';
    throw new HttpError(message, response.status, payload);
  }

  return payload as T;
}

export function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}
