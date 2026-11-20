export interface LoginDTO {
  ip?: string;
  identifier: string; // e-mail ou telefone
  password: string;
  staffOnly?: boolean;
}
