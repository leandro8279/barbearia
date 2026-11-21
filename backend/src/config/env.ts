import 'dotenv/config';
import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(3333),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    DATABASE_PATH: z.string().default('./data/app.sqlite'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET precisa ter no mínimo 32 caracteres'),
    JWT_EXPIRES_IN: z.string().default('1d'),
    WEB_URL: z.string().url().default('http://localhost:5173'),
    RESEND_API_KEY: z.string().optional(),
    RESEND_FROM_EMAIL: z.string().optional(),
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    CORS_ORIGINS: z
  .string()
  .default('')
  .transform((v) => v.split(',').map((o) => o.trim()).filter(Boolean)),
    BODY_LIMIT: z.string().default('2mb'),
    RATE_LIMIT_GLOBAL_MAX: z.coerce.number().int().positive().default(300),
  })
  .refine((v) => v.NODE_ENV !== 'production' || (v.RESEND_API_KEY && v.RESEND_FROM_EMAIL), {
    message: 'RESEND_API_KEY e RESEND_FROM_EMAIL são obrigatórias em produção',
    path: ['RESEND_API_KEY'],
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
