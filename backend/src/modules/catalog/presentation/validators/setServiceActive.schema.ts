import { z } from '@/shared/openapi/zod';

export const setServiceActiveBodySchema = z.object({
  active: z.boolean({ error: 'Informe um status válido para o serviço.' }).openapi({ example: false }),
});

export type SetServiceActiveBody = z.infer<typeof setServiceActiveBodySchema>;
