import { changePasswordBodySchema } from '@/modules/auth/presentation/validators/change-password.schema';

import { bearerAuth, errorContent, jsonContent, registry } from '@/shared/openapi/registry';
import { z } from '@/shared/openapi/zod';

registry.registerPath({
  method: 'post',
  path: '/api/auth/change-password',
  tags: ['Auth'],
  summary: 'Alterar senha',
  description: 'Exige a senha atual. Invalida todos os tokens JWT emitidos (incrementa tokenVersion), então o cliente precisa entrar novamente.',
  security: [{ [bearerAuth.name]: [] }],
  request: { body: { content: jsonContent(changePasswordBodySchema) } },
  responses: {
    200: {
      description: 'Senha alterada',
      content: jsonContent(z.object({ message: z.string().openapi({ example: 'Senha alterada. Entre novamente.' }) })),
    },
    400: { description: 'Senha atual incorreta', content: errorContent },
    401: { description: 'Token ausente, inválido ou expirado', content: errorContent },
    422: { description: 'Dados inválidos', content: errorContent },
    429: { description: 'Muitas tentativas', content: errorContent },
  },
});
