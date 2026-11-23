import type { CreateAdminCustomerResponseDTO } from '@/modules/customers/application/dtos/CreateAdminCustomerDTO';
import { UserSchema } from '@/modules/auth/presentation/docs/user.schema';
import { createAdminCustomerBodySchema } from '@/modules/customers/presentation/validators/createAdminCustomer.schema';

import { bearerAuth, errorContent, jsonContent, registry } from '@/shared/openapi/registry';
import { z } from '@/shared/openapi/zod';

export const CreateAdminCustomerResponseSchema = registry.register('CreateAdminCustomerResponse', UserSchema.omit({ tokenVersion: true }));

type AssertDocMatchesDTO = CreateAdminCustomerResponseDTO extends z.infer<typeof CreateAdminCustomerResponseSchema> ? true : never;
export const assertCreateAdminCustomerDocMatchesDTO: AssertDocMatchesDTO = true;

registry.registerPath({
  method: 'post',
  path: '/api/admin/customers',
  tags: ['Clientes'],
  summary: 'Criar cliente (admin)',
  description:
    'Cadastra o cliente sem senha. Telefone brasileiro com DDD é obrigatório e deve ser único entre clientes (convidados incluídos); e-mail e CPF, quando informados, também. Tags são aparadas, sem duplicatas, no máximo 12. Registra auditoria. Exige a permissão customers.write.',
  security: [{ [bearerAuth.name]: [] }],
  request: { body: { content: jsonContent(createAdminCustomerBodySchema) } },
  responses: {
    201: { description: 'Cliente criado', content: jsonContent(CreateAdminCustomerResponseSchema) },
    401: { description: 'Token ausente, inválido ou expirado', content: errorContent },
    403: { description: 'Sem permissão', content: errorContent },
    409: { description: 'Telefone (com `details.duplicate`), e-mail ou CPF já cadastrado', content: errorContent },
    422: { description: 'Dados inválidos', content: errorContent },
  },
});
