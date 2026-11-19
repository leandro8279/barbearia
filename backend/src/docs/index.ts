import '@/docs/health.docs';

import '@/modules/auth/presentation/docs/me.docs';
import '@/modules/auth/presentation/docs/register.docs';

import { generateOpenApiDocument } from '@/shared/openapi/generate-openapi-document';

export const buildOpenApiDocument = (serverUrl: string) => generateOpenApiDocument({ serverUrl });
