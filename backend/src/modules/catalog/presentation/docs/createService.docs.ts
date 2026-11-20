import { AdminServiceDetailSchema } from '@/modules/catalog/presentation/docs/services.docs';
import { createServiceBodySchema } from '@/modules/catalog/presentation/validators/createService.schema';

import { bearerAuth, errorContent, jsonContent, registry } from '@/shared/openapi/registry';

// O contrato de resposta (AdminServiceDetailSchema) já é verificado contra GetAdminServiceResponseDTO em services.docs.ts.
registry.registerPath({
  method: 'post',
  path: '/api/admin/catalog/services',
  tags: ['Catálogo'],
  summary: 'Criar serviço (admin)',
  description:
    'Cria o serviço e vincula os profissionais com assigned = true (ao menos um). Sem slug, ele é gerado do nome. Comissão do vínculo ausente usa a do serviço. Registra auditoria. Exige a permissão catalog.write.',
  security: [{ [bearerAuth.name]: [] }],
  request: { body: { content: jsonContent(createServiceBodySchema) } },
  responses: {
    201: { description: 'Serviço criado', content: jsonContent(AdminServiceDetailSchema) },
    401: { description: 'Token ausente, inválido ou expirado', content: errorContent },
    403: { description: 'Sem permissão', content: errorContent },
    409: { description: 'Slug já cadastrado', content: errorContent },
    422: { description: 'Dados inválidos, categoria inexistente ou profissional indisponível', content: errorContent },
  },
});
