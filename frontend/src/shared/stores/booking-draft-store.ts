import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type BookingStep = 'services' | 'barber' | 'slot' | 'details' | 'review'

export interface BookingDraftPersisted {
  serviceIds: string[]
  barberId: string | null
  date: string | null
  time: string | null
  holdKey: string | null
  holdExpiresAt: string | null
  customerName: string
  customerPhone: string
}

export interface BookingDraftState extends BookingDraftPersisted {
  step: BookingStep
  setStep: (step: BookingStep) => void
  setServiceIds: (serviceIds: string[]) => void
  setBarberId: (barberId: string | null) => void
  setSlot: (date: string | null, time: string | null, hold?: { key: string; expiresAt: string } | null) => void
  setCustomer: (customer: { name: string; phone: string }) => void
  reset: () => void
  clearAfterBooking: () => void
}

const initialDraft: BookingDraftPersisted = { serviceIds: [], barberId: null, date: null, time: null, holdKey: null, holdExpiresAt: null, customerName: '', customerPhone: '' }

export const useBookingDraftStore = create<BookingDraftState>()(
  persist<BookingDraftState, [], [], BookingDraftPersisted>(
    set => ({
      ...initialDraft,
      step: 'services',
      setStep: step => set({ step }),
      setServiceIds: serviceIds => set({ serviceIds, barberId: null, date: null, time: null, holdKey: null, holdExpiresAt: null }),
      setBarberId: barberId => set(state => (state.barberId === barberId ? {} : { barberId, date: null, time: null, holdKey: null, holdExpiresAt: null })),
      setSlot: (date, time, hold = null) => set({ date, time, holdKey: hold?.key ?? null, holdExpiresAt: hold?.expiresAt ?? null }),
      setCustomer: ({ name, phone }) => set({ customerName: name, customerPhone: phone }),
      reset: () => set({ ...initialDraft, step: 'services' }),
      clearAfterBooking: () => set({ ...initialDraft, step: 'review' })
    }),
    {
      name: 'barbearia-booking-draft',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        serviceIds: state.serviceIds,
        barberId: state.barberId,
        date: state.date,
        time: state.time,
        holdKey: state.holdKey,
        holdExpiresAt: state.holdExpiresAt,
        customerName: '',
        customerPhone: ''
      }),
      version: 1
    }
  )
)
