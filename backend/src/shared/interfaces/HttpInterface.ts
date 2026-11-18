import type { IncomingHttpHeaders } from 'node:http';

export interface ITokenPayload {
  id: string;
}

export interface IRequest {
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
