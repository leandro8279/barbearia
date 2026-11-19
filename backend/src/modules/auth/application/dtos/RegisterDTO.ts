export interface RegisterDTO {
  name: string;
  email: string;
  phone: string;
  password: string;
  birthDate?: string;
  reminders: boolean;
}
