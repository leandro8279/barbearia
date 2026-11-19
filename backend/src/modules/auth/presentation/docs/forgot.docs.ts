import { forgotPasswordBodySchema } from '@/modules/auth/presentation/validators/forgot.schema';

import { errorContent, jsonContent, registry } from '@/shared/openapi/registry';
import { z } from '@/shared/openapi/zod';

registry.registerPath({
  method: 'post',
  path: '/api/auth/forgot',
  tags: ['Auth'],
  summary: 'Solicitar recuperação de senha',
  description: 'Resposta sempre genérica, exista o e-mail ou não. Se existir e a conta estiver ativa, envia um link válido por 30 minutos.',
  request: { body: { content: jsonContent(forgotPasswordBodySchema) } },
  responses: {
    200: {
      description: 'Solicitação recebida',
      content: jsonContent(
        z.object({
          message: z.string().openapi({ example: 'Se o e-mail estiver cadastrado, enviaremos as instruções de recuperação.' }),
        }),
      ),
    },
    422: { description: 'Dados inválidos', content: errorContent },
    429: { description: 'Muitas tentativas', content: errorContent },
  },
});
