import {
    ResendNotificationDTO, ResendNotificationResponseDTO, toNotificationListItem
} from '@/modules/settings/application/dtos/ResendNotificationDTO';
import {
    NotificationContactMissingError
} from '@/modules/settings/application/errors/NotificationContactMissingError';
import {
    NotificationNotDeliverableError
} from '@/modules/settings/application/errors/NotificationNotDeliverableError';
import {
    INotificationRepository, NotificationAppointmentContext
} from '@/modules/settings/domain/repositories/NotificationRepositoryInterface';
import {
    ISettingsRepository
} from '@/modules/settings/domain/repositories/SettingsRepositoryInterface';
import {
    buildDeliveryUrl, canReceive, NotificationRecipient
} from '@/modules/settings/domain/services/notificationDelivery';
import {
    DEFAULT_TEMPLATES, renderNotificationMessage
} from '@/modules/settings/domain/services/notificationMessage';
import { IUserRepository } from '@/modules/users';

import { Either, left, right } from '@/shared/core/Either';
import { NotFoundError } from '@/shared/errors/NotFoundError';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';
import { IAuditLogger } from '@/shared/providers/audit/AuditLoggerInterface';

import type { Notification } from '@/modules/settings/domain/entities/Notification';
export type ResendNotificationError = NotFoundError | NotificationNotDeliverableError | NotificationContactMissingError;
export type ResendNotificationOutput = Either<ResendNotificationError, ResendNotificationResponseDTO>;

export class ResendNotificationUseCase implements IUseCase<ResendNotificationDTO, ResendNotificationOutput> {
  constructor(
    private readonly notificationRepository: INotificationRepository,
    private readonly userRepository: Pick<IUserRepository, 'findById'>,
    private readonly settingsRepository: ISettingsRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute({ id, actorId }: ResendNotificationDTO): Promise<ResendNotificationOutput> {
    const original = await this.notificationRepository.findById(id);
    if (!original) return left(new NotFoundError('Notificação'));

    const customer = await this.userRepository.findById(original.userId);
    if (!customer || !canReceive(original, customer)) return left(new NotificationNotDeliverableError());

    const context = original.appointmentId ? await this.notificationRepository.findAppointmentContext(original.appointmentId) : null;
    const message = original.message || (await this.renderMessage(original, customer, context));

    const resend = original.prepareResend({ message, at: new Date() });

    const url = buildDeliveryUrl(resend.channel, resend.message, customer);
    if (!url) return left(new NotificationContactMissingError(resend.channel));

    await this.notificationRepository.create(resend);

    await this.auditLogger.log({
      actorId,
      action: 'notifications.resend.prepare',
      entity: 'notifications',
      entityId: resend.id,
      details: { resendOf: original.id, channel: original.channel },
    });

    return right({ notification: toNotificationListItem(resend, customer, context), url });
  }

  private async renderMessage(
    notification: Notification,
    customer: NotificationRecipient,
    context: NotificationAppointmentContext | null,
  ): Promise<string> {
    const template = (await this.settingsRepository.findTemplate(notification.type)) ?? DEFAULT_TEMPLATES[notification.type];

    return renderNotificationMessage(template, {
      customerName: customer.name,
      barberName: context?.barberName ?? '',
      appointmentStart: context?.start ?? null,
    });
  }
}
