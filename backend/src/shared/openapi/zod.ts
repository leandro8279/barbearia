import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

import { z } from 'zod';

// Precisa rodar uma única vez e ANTES de qualquer schema usar `.openapi()`.
// Por isso todos os schemas importam `z` daqui, e não direto de 'zod'.
extendZodWithOpenApi(z);

export { z };
