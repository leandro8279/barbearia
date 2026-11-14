import { useState } from 'react';

import { makeAutoObservable, reaction } from 'mobx';

export type BookingStep = 'services' | 'barber' | 'slot' | 'details' | 'review';

export interface BookingDraftPersisted {
  serviceIds: string[];
  barberId: string | null;
  date: string | null;
  time: string | null;
  holdKey: string | null;
  holdExpiresAt: string | null;
  customerName: string;
  customerPhone: string;
}

const STORAGE_KEY = 'barbearia-booking-draft';
const STORAGE_VERSION = 1;

const createInitialDraft = (): BookingDraftPersisted => ({
  serviceIds: [],
  barberId: null,
  date: null,
  time: null,
  holdKey: null,
  holdExpiresAt: null,
  customerName: '',
  customerPhone: '',
});

const clearSlotState = { date: null, time: null, holdKey: null, holdExpiresAt: null } as const;

export class BookingDraftStore {
  private state = {
    step: 'services',
    customerName: '',
    customerPhone: '',
    serviceIds: [] as string[],
    date: null as string | null,
    time: null as string | null,
    holdKey: null as string | null,
    barberId: null as string | null,
    holdExpiresAt: null as string | null,
  };

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
    this.hydrate();
    reaction(
      () => this.persistedSnapshot,
      (snapshot) => this.persist(snapshot),
    );
  }

  get persistedSnapshot(): BookingDraftPersisted {
    return {
      customerName: '',
      customerPhone: '',
      date: this.state.date,
      time: this.state.time,
      holdKey: this.state.holdKey,
      barberId: this.state.barberId,
      holdExpiresAt: this.state.holdExpiresAt,
      serviceIds: this.state.serviceIds.slice(),
    };
  }

  setStep(value: BookingStep) {
    this.state.step = value;
  }

  setServiceIds(value: string[]) {
    this.state.serviceIds = value;
    this.state.barberId = null;
    Object.assign(this, clearSlotState);
  }

  setBarberId(value: string | null) {
    if (this.state.barberId === value) return;
    this.state.barberId = value;
    Object.assign(this, clearSlotState);
  }

  setSlot(date: string | null, time: string | null, hold: { key: string; expiresAt: string } | null = null) {
    this.state.date = date;
    this.state.time = time;
    this.state.holdKey = hold?.key ?? null;
    this.state.holdExpiresAt = hold?.expiresAt ?? null;
  }

  setCustomer({ name, phone }: { name: string; phone: string }) {
    this.state.customerName = name;
    this.state.customerPhone = phone;
  }

  reset() {
    Object.assign(this.state, createInitialDraft(), { step: 'services' satisfies BookingStep });
  }

  clearAfterBooking() {
    Object.assign(this.state, createInitialDraft(), { step: 'review' satisfies BookingStep });
  }

  private hydrate() {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { state?: Partial<BookingDraftPersisted>; version?: number };
      if (parsed.version !== STORAGE_VERSION || !parsed.state) return;
      Object.assign(this, { ...createInitialDraft(), ...parsed.state });
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  private persist(state: BookingDraftPersisted) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, version: STORAGE_VERSION }));
  }
}

export const useBookingDraftStore = () => {
  const [store] = useState(() => new BookingDraftStore());

  return store;
};
