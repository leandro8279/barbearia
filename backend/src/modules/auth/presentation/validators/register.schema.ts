import { z } from '@/shared/openapi/zod';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Data real (sem rollover tipo 2026-02-31) e não futura. */
function isValidPastDate(value: string): boolean {
  if (!DATE_REGEX.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return false;

  return parsed.toISOString().slice(0, 10) === value && value <= new Date().toISOString().slice(0, 10);
}

export const registerBodySchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome').max(120).openapi({ example: 'João Silva' }),
  email: z.string().trim().toLowerCase().max(255).regex(EMAIL_REGEX, 'E-mail inválido').openapi({ example: 'joao@email.com' }),
  phone: z
    .string()
    .refine((value) => {
      const digits = value.replace(/\D/g, '').length;
      return digits >= 10 && digits <= 20;
    }, 'Telefone inválido')
    .openapi({ example: '(62) 99999-8888' }),
  password: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres').max(72).openapi({ example: 'senha-forte-123' }),
  birthDate: z
    .string()
    .trim()
    .refine((value) => value === '' || isValidPastDate(value), 'Informe uma data de nascimento válida.')
    .optional()
    .openapi({ example: '1995-04-20' }),
  termsAccepted: z.literal(true, { error: 'É necessário aceitar os termos para criar a conta.' }).openapi({ example: true }),
  reminders: z.boolean().default(false).openapi({ example: true }),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
