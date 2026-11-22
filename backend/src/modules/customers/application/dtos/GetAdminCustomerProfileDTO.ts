import type { CustomerNoteRecord } from '@/modules/customers/domain/repositories/CustomerNoteRepositoryInterface';
import type { CustomerAppointmentRecord, CustomerTabRecord } from '@/modules/customers/domain/repositories/CustomerHistoryRepositoryInterface';
import type { CustomerMetrics } from '@/modules/customers/domain/services/customerMetrics';
import type { User } from '@/modules/users';

import type { ITokenPayload } from '@/shared/interfaces/HttpInterface';
import { maskPhone } from '@/shared/utils/phone';

export interface GetAdminCustomerProfileDTO {
  id: string;
  viewer: ITokenPayload;
}

export interface CustomerProfileAccess {
  history: boolean;
  financial: boolean;
  edit: boolean;
  schedule: boolean;
}

export interface GetAdminCustomerProfileResponseDTO {
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string;
    phoneMasked: boolean;
    avatar: string | null;
    birthDate: string | null;
    cpf: string | null;
    tags: string[];
    referralSource: string | null;
    guest: boolean;
    consent: { reminders: boolean; marketing: boolean; at: string | null } | null;
  };
  metrics: {
    visitsCount: number;
    averageTicketCents: number;
    medianIntervalDays: number | null;
    lastVisit: string | null;
    totalSpentCents: number;
  };
  permissions: { history: boolean; financial: boolean; notes: boolean; edit: boolean; schedule: boolean };
  appointments: Array<{
    id: string;
    code: string;
    start: string;
    end: string;
    status: string;
    items: Array<{ name: string; priceCents: number; durationMin: number }>;
  }>;
  financial: Array<{
    id: string;
    appointmentId: string | null;
    date: string;
    totalCents: number;
    items: Array<{ name: string; qty: number }>;
    payments: Array<{ method: string; amountCents: number }>;
  }>;
  notes: Array<{ id: string; type: string; text: string; pinned: boolean; createdAt: string }>;
}

interface ToResponseInput {
  customer: User;
  access: CustomerProfileAccess;
  metrics: CustomerMetrics;
  appointments: CustomerAppointmentRecord[];
  financial: CustomerTabRecord[];
  notes: CustomerNoteRecord[];
}

export function toGetAdminCustomerProfileResponse({
  customer,
  access,
  metrics,
  appointments,
  financial,
  notes,
}: ToResponseInput): GetAdminCustomerProfileResponseDTO {
  const consent = customer.consent;

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: access.edit ? (customer.phone ?? '') : maskPhone(customer.phone),
      phoneMasked: !access.edit,
      avatar: customer.avatar,
      birthDate: customer.birthDate?.toISOString().slice(0, 10) ?? null,
      cpf: access.edit ? customer.cpf : null,
      tags: customer.tags,
      referralSource: customer.referralSource,
      guest: customer.guest,
      consent: access.edit
        ? consent
          ? { reminders: consent.reminders, marketing: consent.marketing, at: consent.at.toISOString() }
          : { reminders: false, marketing: false, at: null }
        : null,
    },
    metrics: {
      visitsCount: metrics.visitsCount,
      averageTicketCents: metrics.averageTicketCents,
      medianIntervalDays: metrics.medianIntervalDays,
      lastVisit: metrics.lastVisit?.toISOString() ?? null,
      totalSpentCents: metrics.totalSpentCents,
    },
    permissions: { history: access.history, financial: access.financial, notes: access.edit, edit: access.edit, schedule: access.schedule },
    appointments: appointments.map((appointment) => ({
      id: appointment.id,
      code: appointment.code,
      start: appointment.start.toISOString(),
      end: appointment.end.toISOString(),
      status: appointment.status,
      items: appointment.items.map((item) => ({ name: item.name, priceCents: item.price, durationMin: item.durationMin })),
    })),
    financial: financial.map((tab) => ({
      id: tab.id,
      appointmentId: tab.appointmentId,
      date: tab.date.toISOString(),
      totalCents: tab.totalCents,
      items: tab.items,
      payments: tab.payments,
    })),
    notes: notes.map((note) => ({ id: note.id, type: note.type, text: note.text, pinned: note.pinned, createdAt: note.createdAt.toISOString() })),
  };
}
