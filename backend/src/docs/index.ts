// Importar cada arquivo de docs registra suas rotas no registry (efeito colateral).
// import '@/modules/auth/presentation/docs/auth.docs';
// import '@/modules/users/presentation/docs/user.docs';

import { generateOpenApiDocument } from '@/shared/openapi/generate-openapi-document';

// plop:docs
import './health.docs';

export const buildOpenApiDocument = (serverUrl: string) => generateOpenApiDocument({ serverUrl });
