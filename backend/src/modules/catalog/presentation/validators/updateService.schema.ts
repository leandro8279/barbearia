import { createServiceBodySchema } from '@/modules/catalog/presentation/validators/createService.schema';

export const updateServiceBodySchema = createServiceBodySchema;

export type UpdateServiceBody = import('zod').infer<typeof updateServiceBodySchema>;
