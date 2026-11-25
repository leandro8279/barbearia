import { z } from 'zod';
import { validators } from '@/shared/lib/validators';

function isValidBirthDate(value: string) {
  if (!value) return true;
  const birthDate = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(birthDate.getTime()) && birthDate.toISOString().slice(0, 10) === value && birthDate <= today;
}

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Informe seu nome completo.').max(100, 'O nome deve ter até 100 caracteres.'),
    email: z.string().trim().email('Informe um e-mail válido.'),
    phone: z.string().refine(validators.phone, 'Informe um telefone válido com DDD.'),
    birthDate: z.string().refine(isValidBirthDate, 'Informe uma data de nascimento válida.'),
    password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.').max(128, 'A senha deve ter até 128 caracteres.'),
    confirmPassword: z.string().min(1, 'Confirme sua senha.'),
    termsAccepted: z.boolean().refine((value) => value, 'Você precisa aceitar os termos para criar sua conta.'),
    reminders: z.boolean(),
  })
  .superRefine((values, context) => {
    if (values.password !== values.confirmPassword) {
      context.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'As senhas não coincidem.' });
    }
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
