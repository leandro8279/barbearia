import type { ListAdminServicesResponseDTO } from '@/modules/catalog/application/dtos/ListAdminServicesDTO';
import { SERVICE_SORT_FIELDS } from '@/modules/catalog/domain/repositories/ServiceRepositoryInterface';

import { bearerAuth, errorContent, jsonContent, registry } from '@/shared/openapi/registry';
import { z } from '@/shared/openapi/zod';

const AdminServiceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().openapi({ example: 'Corte infantil' }),
  slug: z.string().openapi({ example: 'corte-infantil' }),
  categoryId: z.string().openapi({ example: 1 }),
  description: z.string(),
  durationMin: z.number().int().openapi({ example: 40 }),
  bufferMin: z.number().int(),
  price: z.number().int().openapi({ example: 6000, description: 'Em centavos' }),
  commissionPct: z.number().openapi({ example: 45 }),
  active: z.boolean(),
  featured: z.boolean(),
});

export const AdminServicePageSchema = registry.register(
  'AdminServicePage',
  z.object({
    items: z.array(AdminServiceSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  }),
);

type AssertDocMatchesDTO = ListAdminServicesResponseDTO extends z.infer<typeof AdminServicePageSchema> ? true : never;
export const assertAdminServicePageDocMatchesDTO: AssertDocMatchesDTO = true;

registry.registerPath({
  method: 'get',
  path: '/api/admin/catalog/services',
  tags: ['Catálogo'],
  summary: 'Listar serviços (admin)',
  description: 'Lista paginada. Valores inválidos de paginação/ordenação voltam ao padrão. Exige a permissão catalog.read.',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    query: z.object({
      page: z.number().int().min(1).optional().openapi({ example: 1 }),
      limit: z.number().int().min(1).max(100).optional().openapi({ example: 20 }),
      q: z.string().optional().openapi({ description: 'Busca pelo nome' }),
      categoryId: z.number().int().optional(),
      active: z.enum(['true', 'false']).optional(),
      sort: z.enum(SERVICE_SORT_FIELDS).optional(),
      order: z.enum(['asc', 'desc']).optional(),
    }),
  },
  responses: {
    200: { description: 'Página de serviços', content: jsonContent(AdminServicePageSchema) },
    401: { description: 'Token ausente, inválido ou expirado', content: errorContent },
    403: { description: 'Sem permissão', content: errorContent },
  },
});
