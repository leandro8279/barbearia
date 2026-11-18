import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import { z } from './zod';

export const registry = new OpenAPIRegistry();

export const bearerAuth = registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

/** Mesmo formato devolvido pelo error-handler. */
export const ErrorResponseSchema = registry.register(
  'ErrorResponse',
  z.object({
    error: z.object({
      code: z.string().optional().openapi({ example: 'NOT_FOUND' }),
      message: z.string().openapi({ example: 'Usuário não encontrado' }),
      details: z.unknown().optional(),
    }),
  }),
);

export const jsonContent = <T extends z.ZodType>(schema: T) => ({ 'application/json': { schema } });

export const errorContent = jsonContent(ErrorResponseSchema);
