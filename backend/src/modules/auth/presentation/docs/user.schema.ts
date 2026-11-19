import { z } from '@/shared/openapi/zod';

export const UserSchema = z.object({
  id: z.string().uuid().openapi({ example: '3f6c2a1e-8b7d-4c9a-9e2f-1a2b3c4d5e6f' }),
  name: z.string().openapi({ example: 'João Silva' }),
  email: z.string().openapi({ example: 'joao@email.com' }),
  phone: z.string().nullable().openapi({ example: '62999998888' }),
  role: z.string().openapi({ example: 'customer' }),
  cpf: z.string().nullable().openapi({ example: null }),
  birthDate: z.string().nullable().openapi({ example: '1995-04-20' }),
  addresses: z.array(z.record(z.string(), z.unknown())),
  tags: z.array(z.string()),
  referralSource: z.string().nullable(),
  avatar: z.string().nullable(),
  permissions: z.array(z.string()),
  active: z.boolean(),
  guest: z.boolean(),
  tokenVersion: z.number().int(),
  lastAccessAt: z.string().datetime().nullable(),
  consent: z.object({ reminders: z.boolean(), marketing: z.boolean(), at: z.string().datetime() }).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
