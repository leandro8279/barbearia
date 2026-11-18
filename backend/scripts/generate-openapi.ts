import { writeFileSync } from 'node:fs';

import { buildOpenApiDocument } from '../src/docs';

const serverUrl = process.env.API_URL ?? 'http://localhost:3333';
writeFileSync('openapi.json', JSON.stringify(buildOpenApiDocument(serverUrl), null, 2));
console.log('openapi.json gerado');
