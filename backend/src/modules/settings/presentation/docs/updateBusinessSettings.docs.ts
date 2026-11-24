import type { GetBusinessSettingsResponseDTO } from '@/modules/settings/application/dtos/GetBusinessSettingsDTO';
import { BusinessSettingsSchema } from '@/modules/settings/presentation/docs/businessSettings.docs';
import { updateBusinessSettingsBodySchema } from '@/modules/settings/presentation/validators/updateBusinessSettings.schema';

import { bearerAuth, errorContent, jsonContent, registry } from '@/shared/openapi/registry';
import { z } from '@/shared/openapi/zod';

// Erro de compilação aqui = a resposta do PATCH divergiu da documentação.
type AssertDocMatchesDTO = GetBusinessSettingsResponseDTO extends z.infer<typeof BusinessSettingsSchema> ? true : never;
export const assertUpdateBusinessSettingsDocMatchesDTO: AssertDocMatchesDTO = true;

registry.registerPath({
  method: 'patch',
  path: '/api/admin/settings/business',
  tags: ['Configurações'],
  summary: 'Atualizar dados do negócio (admin)',
  description:
    'Substitui nome, telefone, WhatsApp, e-mail, CNPJ, endereço, logo, fotos (até 8), comodidades (até 20) e redes sociais da unidade principal (corpo completo; campos opcionais vazios são removidos). Horários e feriados não são alterados aqui. O fuso é sempre America/Sao_Paulo. Unidade e dados do negócio são gravados de forma atômica e a alteração é auditada. Exige a permissão settings.write.',
  security: [{ [bearerAuth.name]: [] }],
  request: { body: { content: jsonContent(updateBusinessSettingsBodySchema) } },
  responses: {
    200: { description: 'Unidade e dados do negócio atualizados', content: jsonContent(BusinessSettingsSchema) },
    401: { description: 'Token ausente, inválido ou expirado', content: errorContent },
    403: { description: 'Sem permissão', content: errorContent },
    404: { description: 'Unidade não encontrada', content: errorContent },
    422: { description: 'Dados inválidos', content: errorContent },
  },
});
