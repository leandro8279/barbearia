import type { IncomingHttpHeaders } from 'node:http';
import type { UserRole } from '@/modules/users/domain/entities/User';

export interface ITokenPayload {
  id: string;
  tokenVersion?: number;
  role?: UserRole; 
  permissions?: string[]
}

export interface IRequest {
  ip?: string;
  body?: unknown;
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  files?: unknown;
  headers?: IncomingHttpHeaders;
  user?: ITokenPayload;
}

export interface IResponse<T = unknown> {
  statusCode: number;
  body: T;
}

export interface IController {
  handle(request: IRequest): Promise<IResponse>;
}
