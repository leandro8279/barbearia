import { z } from '@/shared/openapi/zod';

export const adjustProductStockBodySchema = z.object({
  delta: z
    .number({ error: 'Informe uma quantidade inteira diferente de zero.' })
    .int('Informe uma quantidade inteira diferente de zero.')
    .refine((n) => n !== 0, 'Informe uma quantidade inteira diferente de zero.')
    .openapi({ example: -2, description: 'Positivo = entrada, negativo = saída' }),
  reason: z
    .string()
    .trim()
    .min(3, 'Informe o motivo do ajuste (3 a 200 caracteres).')
    .max(200, 'Informe o motivo do ajuste (3 a 200 caracteres).')
    .openapi({ example: 'Contagem de inventário' }),
});

export type AdjustProductStockBody = z.infer<typeof adjustProductStockBodySchema>;
