import { AdminServiceDetailSchema } from '@/modules/catalog/presentation/docs/services.docs';
import { getAdminServiceParamsSchema } from '@/modules/catalog/presentation/validators/getAdminService.schema';
import { updateServiceBodySchema } from '@/modules/catalog/presentation/validators/updateService.schema';

import { bearerAuth, errorContent, jsonContent, registry } from '@/shared/openapi/registry';

// O contrato de resposta (AdminServiceDetailSchema) já é verificado contra GetAdminServiceResponseDTO em services.docs.ts.
registry.registerPath({
  method: 'patch',
  path: '/api/admin/catalog/services/{id}',
  tags: ['Catálogo'],
  summary: 'Atualizar serviço (admin)',
  description:
    'Substitui os dados do serviço (corpo completo, como na criação) e regrava os vínculos com os profissionais com assigned = true (ao menos um). Sem slug, ele é gerado do nome. Comissão do vínculo ausente usa a do serviço. Registra auditoria. Exige a permissão catalog.write.',
  security: [{ [bearerAuth.name]: [] }],
  request: { params: getAdminServiceParamsSchema, body: { content: jsonContent(updateServiceBodySchema) } },
  responses: {
    200: { description: 'Serviço atualizado', content: jsonContent(AdminServiceDetailSchema) },
    401: { description: 'Token ausente, inválido ou expirado', content: errorContent },
    403: { description: 'Sem permissão', content: errorContent },
    404: { description: 'Serviço não encontrado', content: errorContent },
    409: { description: 'Slug já cadastrado', content: errorContent },
    422: { description: 'Dados inválidos, categoria inexistente ou profissional indisponível', content: errorContent },
  },
});
