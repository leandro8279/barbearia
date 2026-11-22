import {
    GetAdminCustomerProfileUseCase
} from '@/modules/customers/application/use-cases/GetAdminCustomerProfileUseCase';
import { User } from '@/modules/users';

import { describe, expect, it } from 'vitest';

import { InMemoryCustomerHistoryRepository } from '../fakes/InMemoryCustomerHistoryRepository';
import { InMemoryCustomerNoteRepository } from '../fakes/InMemoryCustomerNoteRepository';
import { InMemoryUserRepository } from '../fakes/InMemoryUserRepository';

const DAY = 24 * 60 * 60 * 1000;
const base = new Date('2026-01-01T12:00:00.000Z');
const at = (days: number) => new Date(base.getTime() + days * DAY);

const admin = { id: 'admin-1', role: 'admin' as const };
const barber = { id: 'barber-user-1', role: 'barber' as const };
const reception = { id: 'rec-1', role: 'reception' as const };

async function makeSut() {
  const users = new InMemoryUserRepository();
  const history = new InMemoryCustomerHistoryRepository();
  const notes = new InMemoryCustomerNoteRepository();
  const sut = new GetAdminCustomerProfileUseCase(users, history, notes);

  const customer = await users.create(
    User.create({
      name: 'João',
      email: 'joao@email.com',
      phone: '62999998888',
      cpf: '12345678909',
      tags: ['VIP'],
      consent: { reminders: true, marketing: false, at: at(0) },
    }),
  );

  const addAppointment = (days: number, barberUserId: string, status = 'done') =>
    history.appointments.push({
      id: `apt-${history.appointments.length + 1}`,
      customerId: customer.id,
      barberUserId,
      code: `AG-${history.appointments.length + 1}`,
      start: at(days),
      end: new Date(at(days).getTime() + 40 * 60_000),
      status,
      items: [{ name: 'Corte masculino', price: 5000, durationMin: 40 }],
    });

  const addTab = (days: number, totalCents: number) =>
    history.tabs.push({
      id: `tab-${history.tabs.length + 1}`,
      customerId: customer.id,
      appointmentId: null,
      date: at(days),
      totalCents,
      items: [{ name: 'Corte masculino', qty: 1 }],
      payments: [{ method: 'pix', amountCents: totalCents }],
    });

  return { users, history, notes, sut, customer, addAppointment, addTab };
}

describe('GetAdminCustomerProfileUseCase', () => {
  it('devolve Left(404) quando o cliente não existe', async () => {
    const { sut } = await makeSut();

    const result = await sut.execute({ id: 'inexistente', viewer: admin });

    expect(result.value).toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('devolve Left(404) quando o usuário não é cliente', async () => {
    const { users, sut } = await makeSut();
    const staff = await users.create(User.create({ name: 'Rafael', email: 'rafael@barbearia.local', role: 'barber' }));

    const result = await sut.execute({ id: staff.id, viewer: admin });

    expect(result.isLeft()).toBe(true);
  });

  it('admin vê telefone, CPF, consentimento, histórico, financeiro e notas', async () => {
    const { notes, customer, addAppointment, addTab, sut } = await makeSut();
    addAppointment(0, 'barber-user-1');
    addTab(0, 5000);
    notes.items.push({ id: 'n1', customerId: customer.id, type: 'general', text: 'Prefere degradê', pinned: false, createdAt: at(1) });

    const result = await sut.execute({ id: customer.id, viewer: admin });

    if (result.isLeft()) throw result.value;
    expect(result.value.customer).toMatchObject({
      phone: '62999998888',
      phoneMasked: false,
      cpf: '12345678909',
      consent: { reminders: true, marketing: false },
    });
    expect(result.value.permissions).toEqual({ history: true, financial: true, notes: true, edit: true, schedule: true });
    expect(result.value.appointments).toHaveLength(1);
    expect(result.value.financial).toHaveLength(1);
    expect(result.value.notes).toHaveLength(1);
  });

  it('barbeiro vê telefone mascarado, sem CPF, consentimento, financeiro e notas, e só os próprios atendimentos', async () => {
    const { customer, addAppointment, addTab, sut } = await makeSut();
    addAppointment(0, 'barber-user-1');
    addAppointment(10, 'outro-barbeiro');
    addAppointment(30, 'outro-barbeiro');
    addTab(0, 5000);

    const result = await sut.execute({ id: customer.id, viewer: barber });

    if (result.isLeft()) throw result.value;
    expect(result.value.customer).toMatchObject({ phone: '(**) *****-**88', phoneMasked: true, cpf: null, consent: null });
    expect(result.value.permissions).toMatchObject({ history: true, financial: false, notes: false, edit: false });
    expect(result.value.appointments).toHaveLength(1);
    expect(result.value.financial).toEqual([]);
    expect(result.value.notes).toEqual([]);
    expect(result.value.metrics.visitsCount).toBe(3); // métricas usam todos os atendimentos
  });

  it('recepção tem customers.write e cash.*, mas vê todo o histórico da agenda', async () => {
    const { customer, addAppointment, addTab, sut } = await makeSut();
    addAppointment(0, 'barber-user-1');
    addAppointment(10, 'outro-barbeiro');
    addTab(0, 5000);

    const result = await sut.execute({ id: customer.id, viewer: reception });

    if (result.isLeft()) throw result.value;
    expect(result.value.customer.phoneMasked).toBe(false);
    expect(result.value.appointments).toHaveLength(2);
    expect(result.value.financial).toHaveLength(1);
  });

  it('calcula visitas, última visita, mediana dos intervalos, ticket médio e total gasto', async () => {
    const { customer, addAppointment, addTab, sut } = await makeSut();
    addAppointment(0, 'barber-user-1');
    addAppointment(10, 'barber-user-1');
    addAppointment(30, 'barber-user-1');
    addAppointment(40, 'barber-user-1', 'canceled'); // não conta
    addTab(0, 5000);
    addTab(10, 3000);

    const result = await sut.execute({ id: customer.id, viewer: admin });

    if (result.isLeft()) throw result.value;
    expect(result.value.metrics).toEqual({
      visitsCount: 3,
      medianIntervalDays: 15,
      lastVisit: at(30).toISOString(),
      averageTicketCents: 4000,
      totalSpentCents: 8000,
    });
  });

  it('sem histórico: métricas zeradas e consentimento padrão', async () => {
    const { users, sut } = await makeSut();
    const bare = await users.create(User.create({ name: 'Maria', phone: '62988887777', guest: true }));

    const result = await sut.execute({ id: bare.id, viewer: admin });

    if (result.isLeft()) throw result.value;
    expect(result.value.metrics).toEqual({ visitsCount: 0, medianIntervalDays: null, lastVisit: null, averageTicketCents: 0, totalSpentCents: 0 });
    expect(result.value.customer).toMatchObject({ guest: true, consent: { reminders: false, marketing: false, at: null } });
  });

  it('notas fixadas vêm primeiro, depois as mais recentes', async () => {
    const { notes, customer, sut } = await makeSut();
    notes.items.push(
      { id: 'n1', customerId: customer.id, type: 'general', text: 'antiga', pinned: false, createdAt: at(1) },
      { id: 'n2', customerId: customer.id, type: 'general', text: 'nova', pinned: false, createdAt: at(5) },
      { id: 'n3', customerId: customer.id, type: 'alert', text: 'fixada', pinned: true, createdAt: at(0) },
    );

    const result = await sut.execute({ id: customer.id, viewer: admin });

    if (result.isLeft()) throw result.value;
    expect(result.value.notes.map((n) => n.id)).toEqual(['n3', 'n2', 'n1']);
  });
});
