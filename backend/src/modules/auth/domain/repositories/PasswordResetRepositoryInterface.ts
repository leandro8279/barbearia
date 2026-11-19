export interface NewPasswordReset {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface PasswordReset {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
}

export interface IPasswordResetRepository {
  replaceForUser(reset: NewPasswordReset): Promise<void>;
  create(reset: PasswordReset): Promise<void>;
  consume(tokenHash: string, now: Date): Promise<{ userId: string } | null>;
  deleteByUserId(userId: string): Promise<void>;
}
