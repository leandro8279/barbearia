import type { NotificationChannel, NotificationType } from '@/modules/settings/domain/entities/Notification';

import { normalizePhone } from '@/shared/utils/phone';

export interface NotificationRecipient {
  name: string;
  email: string | null;
  phone: string | null;
  consent: { reminders: boolean; marketing: boolean } | null;
}

const REMINDER_TYPES: readonly NotificationType[] = ['reminder24', 'reminder2'];

export function canReceive({ type, channel }: { type: NotificationType; channel: NotificationChannel }, recipient: NotificationRecipient): boolean {
  if (channel === 'email' && !recipient.email) return false;
  if (channel === 'whatsapp' && !recipient.phone) return false;
  if (REMINDER_TYPES.includes(type) && recipient.consent?.reminders === false) return false;
  if (type === 'post' && recipient.consent?.marketing === false) return false;

  return true;
}

export function buildDeliveryUrl(channel: NotificationChannel, message: string, recipient: NotificationRecipient): string | null {
  if (channel === 'whatsapp') {
    const digits = (recipient.phone ?? '').replace(/\D/g, '');
    if (!digits) return null;

    return `https://wa.me/55${normalizePhone(digits) ?? digits}?text=${encodeURIComponent(message)}`;
  }

  if (!recipient.email) return null;

  return `mailto:${encodeURIComponent(recipient.email)}?subject=${encodeURIComponent('Mensagem da Barbearia')}&body=${encodeURIComponent(message)}`;
}
