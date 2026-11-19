import { RegisterResponseSchema } from '@/modules/auth/presentation/docs/register.docs';
import { guestBodySchema } from '@/modules/auth/presentation/validators/guest.schema';

import { errorContent, jsonContent, registry } from '@/shared/openapi/registry';

registry.registerPath({
  method: 'post',
  path: '/api/auth/guest',
  tags: ['Auth'],
  summary: 'Acesso como convidado',
  description: 'Cria um convidado pelo telefone. Se já existir um convidado com o mesmo telefone, ele é reaproveitado e a resposta é 200.',
  request: { body: { content: jsonContent(guestBodySchema) } },
  responses: {
    201: { description: 'Convidado criado', content: jsonContent(RegisterResponseSchema) },
    200: { description: 'Convidado existente reaproveitado', content: jsonContent(RegisterResponseSchema) },
    409: { description: 'Telefone pertence a uma conta, ou e-mail já cadastrado', content: errorContent },
    422: { description: 'Dados inválidos', content: errorContent },
    429: { description: 'Muitas tentativas', content: errorContent },
  },
});
