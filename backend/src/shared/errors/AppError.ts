import { HttpStatus } from '@/shared/constants/HttpStatus';

export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = HttpStatus.BAD_REQUEST,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
