import { bearerAuth, errorContent, registry } from '@/shared/openapi/registry';

registry.registerPath({
  method: 'post',
  path: '/api/auth/logout',
  tags: ['Auth'],
  summary: 'Encerrar sessão',
  description: 'Invalida todos os tokens emitidos para o usuário (incrementa tokenVersion).',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    204: { description: 'Sessão encerrada' },
    401: { description: 'Token ausente, inválido ou expirado', content: errorContent },
  },
});
