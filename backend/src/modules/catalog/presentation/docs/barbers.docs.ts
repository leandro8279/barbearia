import type { ListAdminBarbersResponseDTO } from '@/modules/catalog/application/dtos/ListAdminBarbersDTO';

import { bearerAuth, errorContent, jsonContent, registry } from '@/shared/openapi/registry';
import { z } from '@/shared/openapi/zod';

const AdminBarberSchema = registry.register(
  'AdminBarber',
  z.object({
    id: z.string().uuid().openapi({ example: '3f6c2a1e-8b7d-4c9a-9e2f-1a2b3c4d5e6f' }),
    name: z.string().openapi({ example: 'Rafael Nogueira' }),
    photo: z.string().nullable(),
  }),
);

export const AdminBarberListSchema = z.array(AdminBarberSchema);

type AssertBarberListDocMatchesDTO = ListAdminBarbersResponseDTO extends z.infer<typeof AdminBarberListSchema> ? true : never;
export const assertAdminBarberListDocMatchesDTO: AssertBarberListDocMatchesDTO = true;

registry.registerPath({
  method: 'get',
  path: '/api/admin/catalog/barbers',
  tags: ['Catálogo'],
  summary: 'Listar profissionais ativos (admin)',
  description: 'Devolve os profissionais ativos ordenados por nome (pt-BR), para uso nos formulários de serviço. Exige a permissão catalog.write.',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: { description: 'Profissionais ativos', content: jsonContent(AdminBarberListSchema) },
    401: { description: 'Token ausente, inválido ou expirado', content: errorContent },
    403: { description: 'Sem permissão', content: errorContent },
  },
});
