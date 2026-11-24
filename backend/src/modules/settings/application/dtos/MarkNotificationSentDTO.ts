import type { NotificationListItemDTO } from '@/modules/settings/application/dtos/ResendNotificationDTO';

export interface MarkNotificationSentDTO {
  id: string;
  actorId: string;
}

export type MarkNotificationSentResponseDTO = NotificationListItemDTO;
