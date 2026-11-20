import type { SetServiceActiveResponseDTO } from '@/modules/catalog/application/dtos/SetServiceActiveDTO';
import { getAdminServiceParamsSchema } from '@/modules/catalog/presentation/validators/getAdminService.schema';
import { setServiceActiveBodySchema } from '@/modules/catalog/presentation/validators/setServiceActive.schema';

import { bearerAuth, errorContent, jsonContent, registry } from '@/shared/openapi/registry';
import { z } from '@/shared/openapi/zod';

export const ServiceActiveSchema = registry.register(
  'ServiceActive',
  z.object({
    id: z.string().uuid(),
    active: z.boolean(),
  }),
);

type AssertActiveDocMatchesDTO = SetServiceActiveResponseDTO extends z.infer<typeof ServiceActiveSchema> ? true : never;
export const assertServiceActiveDocMatchesDTO: AssertActiveDocMatchesDTO = true;

registry.registerPath({
  method: 'patch',
  path: '/api/admin/catalog/services/{id}/active',
  tags: ['Catálogo'],
  summary: 'Ativar/desativar serviço (admin)',
  description: 'Altera o status do serviço e registra auditoria. Exige a permissão catalog.write.',
  security: [{ [bearerAuth.name]: [] }],
  request: { params: getAdminServiceParamsSchema, body: { content: jsonContent(setServiceActiveBodySchema) } },
  responses: {
    200: { description: 'Status atualizado', content: jsonContent(ServiceActiveSchema) },
    401: { description: 'Token ausente, inválido ou expirado', content: errorContent },
    403: { description: 'Sem permissão', content: errorContent },
    404: { description: 'Serviço não encontrado', content: errorContent },
    422: { description: 'Dados inválidos', content: errorContent },
  },
});
