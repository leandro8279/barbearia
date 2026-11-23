import { UserSchema } from '@/modules/auth/presentation/docs/user.schema';
import { getAdminCustomerProfileParamsSchema } from '@/modules/customers/presentation/validators/getAdminCustomerProfile.schema';
import { updateAdminCustomerBodySchema } from '@/modules/customers/presentation/validators/updateAdminCustomer.schema';

import { bearerAuth, errorContent, jsonContent, registry } from '@/shared/openapi/registry';
import { z } from '@/shared/openapi/zod';

import type { UpdateAdminCustomerResponseDTO } from '@/modules/customers/application/dtos/UpdateAdminCustomerDTO';
export const UpdateAdminCustomerResponseSchema = registry.register('UpdateAdminCustomerResponse', UserSchema.omit({ tokenVersion: true }));

type AssertDocMatchesDTO = UpdateAdminCustomerResponseDTO extends z.infer<typeof UpdateAdminCustomerResponseSchema> ? true : never;
export const assertUpdateAdminCustomerDocMatchesDTO: AssertDocMatchesDTO = true;

registry.registerPath({
  method: 'patch',
  path: '/api/admin/customers/{id}',
  tags: ['Clientes'],
  summary: 'Atualizar cliente (admin)',
  description:
    'Substitui os dados cadastrais do cliente (nome e telefone são obrigatórios; e-mail, CPF, nascimento e origem vazios são removidos). O telefone é normalizado (sem máscara e sem DDI 55) e não pode pertencer a outro cliente. O consentimento é regravado com a data atual. Registra auditoria. Exige a permissão customers.write.',
  security: [{ [bearerAuth.name]: [] }],
  request: { params: getAdminCustomerProfileParamsSchema, body: { content: jsonContent(updateAdminCustomerBodySchema) } },
  responses: {
    200: { description: 'Cliente atualizado', content: jsonContent(UpdateAdminCustomerResponseSchema) },
    401: { description: 'Token ausente, inválido ou expirado', content: errorContent },
    403: { description: 'Sem permissão', content: errorContent },
    404: { description: 'Cliente não encontrado', content: errorContent },
    409: { description: 'Telefone, e-mail ou CPF já cadastrado para outro usuário', content: errorContent },
    422: { description: 'Dados inválidos', content: errorContent },
  },
});
