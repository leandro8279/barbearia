import { MarkNotificationSentDTO, MarkNotificationSentResponseDTO } from '@/modules/settings/application/dtos/MarkNotificationSentDTO';
import { toNotificationListItem } from '@/modules/settings/application/dtos/ResendNotificationDTO';
import { NotificationNotReadyError } from '@/modules/settings/application/errors/NotificationNotReadyError';
import { INotificationRepository } from '@/modules/settings/domain/repositories/NotificationRepositoryInterface';
import { NotificationRecipient } from '@/modules/settings/domain/services/notificationDelivery';
import { IUserRepository } from '@/modules/users';

import { Either, left, right } from '@/shared/core/Either';
import { NotFoundError } from '@/shared/errors/NotFoundError';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';
import { IAuditLogger } from '@/shared/providers/audit/AuditLoggerInterface';

export type MarkNotificationSentError = NotFoundError | NotificationNotReadyError;
export type MarkNotificationSentOutput = Either<MarkNotificationSentError, MarkNotificationSentResponseDTO>;

const UNKNOWN_RECIPIENT: NotificationRecipient = { name: '', email: null, phone: null, consent: null };

export class MarkNotificationSentUseCase implements IUseCase<MarkNotificationSentDTO, MarkNotificationSentOutput> {
  constructor(
    private readonly notificationRepository: INotificationRepository,
    private readonly userRepository: Pick<IUserRepository, 'findById'>,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute({ id, actorId }: MarkNotificationSentDTO): Promise<MarkNotificationSentOutput> {
    const original = await this.notificationRepository.findById(id);
    if (!original) return left(new NotFoundError('Notificação'));
    if (original.status !== 'ready') return left(new NotificationNotReadyError());

    const sent = original.markAsSent(new Date());
    await this.notificationRepository.create(sent);

    await this.auditLogger.log({
      actorId,
      action: 'notifications.sent.register',
      entity: 'notifications',
      entityId: sent.id,
      details: { sentFrom: original.id, channel: original.channel },
    });

    const [customer, context] = await Promise.all([
      this.userRepository.findById(original.userId),
      original.appointmentId ? this.notificationRepository.findAppointmentContext(original.appointmentId) : null,
    ]);

    return right(toNotificationListItem(sent, customer ?? UNKNOWN_RECIPIENT, context));
  }
}
