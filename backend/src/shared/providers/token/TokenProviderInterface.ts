import { ITokenPayload } from '@/shared/interfaces/HttpInterface';

export interface ITokenProvider {
  sign(payload: ITokenPayload): string;
  /** Retorna o payload ou null se o token for inválido/expirado. */
  verify(token: string): ITokenPayload | null;
}
