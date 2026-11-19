import { resetBodySchema } from '@/modules/auth/presentation/validators/reset.schema';

import { errorContent, jsonContent, registry } from '@/shared/openapi/registry';
import { z } from '@/shared/openapi/zod';

registry.registerPath({
  method: 'post',
  path: '/api/auth/reset',
  tags: ['Auth'],
  summary: 'Redefinir senha',
  description: 'Troca a senha usando o token enviado por e-mail (uso único, expira em 30 min). Invalida os tokens JWT anteriores.',
  request: { body: { content: jsonContent(resetBodySchema) } },
  responses: {
    200: {
      description: 'Senha alterada',
      content: jsonContent(z.object({ message: z.string().openapi({ example: 'Senha alterada com sucesso' }) })),
    },
    400: { description: 'Token inválido ou expirado', content: errorContent },
    422: { description: 'Dados inválidos', content: errorContent },
    429: { description: 'Muitas tentativas', content: errorContent },
  },
});
