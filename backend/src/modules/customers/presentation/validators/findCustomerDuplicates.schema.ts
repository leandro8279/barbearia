import { z } from '@/shared/openapi/zod';

export const findCustomerDuplicatesQuerySchema = z.object({
  phone: z.string().catch(''),
  name: z.string().catch(''),
  excludeId: z.string().uuid().optional().catch(undefined),
});

export type FindCustomerDuplicatesQuery = z.infer<typeof findCustomerDuplicatesQuerySchema>;
