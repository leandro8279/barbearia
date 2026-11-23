import '@/docs/health.docs';

import '@/modules/auth/presentation/docs';
import '@/modules/catalog/presentation/docs';
import '@/modules/customers/presentation/docs';
import '@/modules/settings/presentation/docs';
import '@/modules/team/presentation/docs';

import { generateOpenApiDocument } from '@/shared/openapi/generate-openapi-document';

export const buildOpenApiDocument = (serverUrl: string) => generateOpenApiDocument({ serverUrl });
