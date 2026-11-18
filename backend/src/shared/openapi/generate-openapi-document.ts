import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';

import { registry } from './registry';

export function generateOpenApiDocument(options: { serverUrl: string }) {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'API Node modular',
      version: '1.0.0',
      description: 'Documentação gerada automaticamente a partir dos schemas zod.',
    },
    servers: [{ url: options.serverUrl }],
  });
}
