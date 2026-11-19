export interface NewPasswordReset {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface IPasswordResetRepository {
  replaceForUser(reset: NewPasswordReset): Promise<void>;
}
