import { z } from '@/shared/openapi/zod';

export const markNotificationSentParamsSchema = z.object({
  id: z.string().uuid('Id inválido').openapi({ example: '3f6c2a1e-8b7d-4c9a-9e2f-1a2b3c4d5e6f' }),
});
