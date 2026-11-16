import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

import { makeAutoObservable, reaction, type IReactionDisposer } from 'mobx';

export type BookingStep = 'services' | 'barber' | 'slot' | 'details' | 'review';

export interface BookingDraftPersisted {
  serviceIds: string[];
  barberId: string | null;
  date: string | null;
  time: string | null;
  holdKey: string | null;
  holdExpiresAt: string | null;
}

interface BookingDraftState extends BookingDraftPersisted {
  step: BookingStep;
  customerName: string;
  customerPhone: string;
}

const STORAGE_KEY = 'barbearia-booking-draft';
const STORAGE_VERSION = 1;

const createInitialState = (): BookingDraftState => ({
  step: 'services',
  serviceIds: [],
  barberId: null,
  date: null,
  time: null,
  holdKey: null,
  holdExpiresAt: null,
  customerName: '',
  customerPhone: '',
});

const emptySlot = () =>
  ({ date: null, time: null, holdKey: null, holdExpiresAt: null }) as const;

export class BookingDraftStore {
  state: BookingDraftState = createInitialState();
  private disposePersist: IReactionDisposer | null = null;

  constructor() {
    makeAutoObservable<BookingDraftStore, 'disposePersist'>(
      this,
      { },
      { autoBind: true },
    );
    this.hydrate();
  }

  get persistedSnapshot(): BookingDraftPersisted {
    const { serviceIds, barberId, date, time, holdKey, holdExpiresAt } = this.state;
    return { serviceIds: serviceIds.slice(), barberId, date, time, holdKey, holdExpiresAt };
  }

  get isHoldExpired(): boolean {
    const { holdExpiresAt } = this.state;
    return !!holdExpiresAt && new Date(holdExpiresAt).getTime() <= Date.now();
  }

  setStep(value: BookingStep) {
    this.state.step = value;
  }

  setServiceIds(value: string[]) {
    const unchanged =
      value.length === this.state.serviceIds.length &&
      value.every((id, i) => id === this.state.serviceIds[i]);
    if (unchanged) return;

    this.state.serviceIds = value.slice();
    this.state.barberId = null;
    Object.assign(this.state, emptySlot());
  }

  setBarberId(value: string | null) {
    if (this.state.barberId === value) return;
    this.state.barberId = value;
    Object.assign(this.state, emptySlot());
  }

  setSlot(
    date: string | null,
    time: string | null,
    hold: { key: string; expiresAt: string } | null = null,
  ) {
    this.state.date = date;
    this.state.time = time;
    this.state.holdKey = hold?.key ?? null;
    this.state.holdExpiresAt = hold?.expiresAt ?? null;
  }

  setCustomer({ name, phone }: { name: string; phone: string }) {
    this.state.customerName = name;
    this.state.customerPhone = phone;
  }
  start(): () => void {
    return reaction(
      () => this.persistedSnapshot,
      (snapshot) => this.persist(snapshot),
    );
  }
  
  reset() {
    this.state = createInitialState();
  }

  clearAfterBooking() {
    this.state = { ...createInitialState(), step: 'review' };
  }

  dispose() {
    this.disposePersist?.();
    this.disposePersist = null;
  }

  private hydrate() {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as {
        state?: Partial<BookingDraftPersisted>;
        version?: number;
      };
      if (parsed.version !== STORAGE_VERSION || !parsed.state) return;

      this.state = { ...createInitialState(), ...parsed.state };

      // Descarta o hold se já expirou
      if (this.isHoldExpired) {
        Object.assign(this.state, emptySlot());
      }
    } catch {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* storage indisponível */
      }
    }
  }

  private persist(snapshot: BookingDraftPersisted) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ state: snapshot, version: STORAGE_VERSION }),
      );
    } catch {
      /* quota cheia ou storage bloqueado: ignora */
    }
  }
}

const BookingDraftContext = createContext<BookingDraftStore | null>(null);

export function BookingDraftProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => new BookingDraftStore());

  useEffect(() => store.start(), [store]);

  return (
    <BookingDraftContext.Provider value={store}>
      {children}
    </BookingDraftContext.Provider>
  );
}

export const useBookingDraftStore = (): BookingDraftStore => {
  const store = useContext(BookingDraftContext);
  if (!store) {
    throw new Error('useBookingDraftStore deve ser usado dentro de <BookingDraftProvider>');
  }
  return store;
};
