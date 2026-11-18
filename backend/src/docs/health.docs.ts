import { jsonContent, registry } from '@/shared/openapi/registry';
import { z } from '@/shared/openapi/zod';

registry.registerPath({
  method: 'get',
  path: '/health',
  tags: ['Health'],
  summary: 'Healthcheck',
  responses: {
    200: {
      description: 'API no ar',
      content: jsonContent(
        z.object({
          status: z.string().openapi({ example: 'ok' }),
          uptime: z.number().openapi({ example: 123.45 }),
        }),
      ),
    },
  },
});
