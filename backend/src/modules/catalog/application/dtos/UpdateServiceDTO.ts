import type { CreateServiceDTO } from '@/modules/catalog/application/dtos/CreateServiceDTO';

export interface UpdateServiceDTO extends CreateServiceDTO {
  id: string;
}
