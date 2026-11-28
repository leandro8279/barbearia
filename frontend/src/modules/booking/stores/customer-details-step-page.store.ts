import { AvailableBarber, BookingEstimate, getAvailableBarbers, getBookingEstimate } from '@/modules/booking/api/booking';

import { formatBRL, formatDateTime, formatDuration } from '@/shared/lib/format';
import { MobxQuery } from '@/shared/lib/query';
import { useBookingDraftStore } from '@/shared/stores/booking-draft-store';

import { compareStructural, makeAutoObservable, observableRef, reaction } from 'mobx';

import type { CustomerDetailsValues } from '@/modules/booking/schemas/customer-details.schema';

import type { UseFormReturn } from 'react-hook-form';

type DraftState = ReturnType<typeof useBookingDraftStore.getState>;

interface CustomerDetailsStepPageStoreDeps {
  navigate: (path: string) => void;
  form: UseFormReturn<CustomerDetailsValues>;
}

type CustomerDetailsStepPageStoreExclude = 'navigate' | 'form' | 'barbersQuery' | 'estimateQuery';

function isExpired(expiresAt: string | null): boolean {
  return !expiresAt || !Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now();
}

function formatRange(min: number, max: number, format: (value: number) => string): string {
  return min === max ? format(min) : `${format(min)}–${format(max)}`;
}

export class CustomerDetailsStepPageStore {
  draft: DraftState = useBookingDraftStore.getState();
  reservationExpired = isExpired(useBookingDraftStore.getState().holdExpiresAt);

  readonly form: UseFormReturn<CustomerDetailsValues>;
  private readonly navigate: (path: string) => void;
  private readonly barbersQuery = new MobxQuery<AvailableBarber[]>();
  private readonly estimateQuery = new MobxQuery<BookingEstimate>();

  constructor({ navigate, form }: CustomerDetailsStepPageStoreDeps) {
    this.navigate = navigate;
    this.form = form;
    makeAutoObservable<CustomerDetailsStepPageStore, CustomerDetailsStepPageStoreExclude>(
      this,
      { draft: observableRef, form: false, navigate: false, barbersQuery: false, estimateQuery: false },
      { autoBind: true },
    );
  }

  // ---------- Ciclo de vida ----------
  // Sincroniza o Zustand com o MobX, controla o timer de expiração e os redirecionamentos.
  connect() {
    this.setDraft(useBookingDraftStore.getState());
    const unsubscribeDraft = useBookingDraftStore.subscribe((state) => this.setDraft(state));

    let timeout: number | undefined;
    const disposeExpiry = reaction(
      () => this.holdExpiresAt,
      (expiresAt) => {
        window.clearTimeout(timeout);
        const remaining = expiresAt ? Date.parse(expiresAt) - Date.now() : Number.NaN;
        if (!Number.isFinite(remaining) || remaining <= 0) {
          this.setReservationExpired(true);
          return;
        }
        this.setReservationExpired(false);
        timeout = window.setTimeout(() => this.setReservationExpired(true), remaining);
      },
      { fireImmediately: true },
    );

    const disposeGuard = reaction(
      () => ({ hasServices: this.hasServices, active: this.hasActiveReservation }),
      ({ hasServices, active }) => {
        if (!hasServices) {
          this.navigate('/agendar');
          return;
        }
        if (active) useBookingDraftStore.getState().setStep('details');
      },
      { fireImmediately: true, equals: compareStructural },
    );

    return () => {
      window.clearTimeout(timeout);
      unsubscribeDraft();
      disposeExpiry();
      disposeGuard();
    };
  }

  // ---------- Queries (computed) ----------
  private get barbersResult() {
    const serviceIds = this.serviceIds;
    return this.barbersQuery.query({
      queryKey: ['availability-barbers', { serviceIds }],
      queryFn: () => getAvailableBarbers(serviceIds),
      enabled: this.hasValidServiceCount,
      staleTime: 30_000,
      retry: 1,
    });
  }

  private get estimateResult() {
    const serviceIds = this.serviceIds;
    const barberId = this.barberId;
    return this.estimateQuery.query({
      queryKey: ['booking-estimate', { serviceIds, barberId }],
      queryFn: () => getBookingEstimate(serviceIds, barberId),
      enabled: this.hasValidServiceCount,
      staleTime: 30_000,
    });
  }

  // ---------- Rascunho ----------
  get serviceIds() {
    return this.draft.serviceIds;
  }

  get barberId() {
    return this.draft.barberId;
  }

  get date() {
    return this.draft.date;
  }

  get time() {
    return this.draft.time;
  }

  get holdKey() {
    return this.draft.holdKey;
  }

  get holdExpiresAt() {
    return this.draft.holdExpiresAt;
  }

  // ---------- Regras ----------
  get hasServices() {
    return this.serviceIds.length > 0;
  }

  get hasValidServiceCount() {
    return this.serviceIds.length > 0 && this.serviceIds.length <= 4;
  }

  get hasReservationDetails() {
    return Boolean(this.hasServices && this.barberId && this.date && this.time && this.holdKey && this.holdExpiresAt);
  }

  get hasActiveReservation() {
    return this.hasReservationDetails && !this.reservationExpired;
  }

  get isSubmitting() {
    return this.form.formState.isSubmitting;
  }

  get canContinue() {
    return this.hasActiveReservation && !this.isSubmitting;
  }

  // ---------- Textos derivados ----------
  get errorTitle() {
    return this.reservationExpired ? 'Sua reserva expirou' : 'Escolha um horário primeiro';
  }

  get errorDescription() {
    return this.reservationExpired ? 'O horário temporário não está mais reservado. Escolha outro para continuar.' : 'Para informar seus dados, primeiro selecione e reserve um horário.';
  }

  get reservationDateTimeLabel() {
    return this.date && this.time ? formatDateTime(`${this.date}T${this.time}:00-03:00`) : '—';
  }

  get selectedBarberName() {
    return this.barbersResult.data?.find((barber) => String(barber.id) === this.barberId)?.name ?? 'Profissional selecionado';
  }

  get durationLabel() {
    const estimate = this.estimateResult.data;
    return estimate ? formatRange(estimate.durationMin.min, estimate.durationMin.max, formatDuration) : '—';
  }

  get priceLabel() {
    const estimate = this.estimateResult.data;
    if (!estimate) return '—';
    return estimate.subtotal.min === estimate.subtotal.max ? formatBRL(estimate.subtotal.min) : `A partir de ${formatBRL(estimate.subtotal.min)}`;
  }

  // ---------- Estados ----------
  get isBarbersPending() {
    return this.barbersResult.isPending;
  }

  get isBarbersSuccess() {
    return this.barbersResult.isSuccess;
  }

  get isBarbersError() {
    return this.barbersResult.isError;
  }

  get isEstimatePending() {
    return this.estimateResult.isPending;
  }

  get isEstimateError() {
    return this.estimateResult.isError;
  }

  get isEstimateSuccess() {
    return this.estimateResult.isSuccess;
  }

  // ---------- Actions ----------
  private setDraft(state: DraftState) {
    this.draft = state;
  }

  private setReservationExpired(expired: boolean) {
    this.reservationExpired = expired;
  }

  expireReservation() {
    this.reservationExpired = true;
  }

  retryBarbers() {
    void this.barbersResult.refetch();
  }

  retryEstimate() {
    void this.estimateResult.refetch();
  }

  goToSlots() {
    this.navigate('/agendar/horario');
  }

  returnToSlotSelection() {
    const draft = useBookingDraftStore.getState();
    draft.setSlot(draft.date, null, null);
    draft.setStep('slot');
    this.navigate('/agendar/horario');
  }

  handleSubmit(event?: React.BaseSyntheticEvent) {
    return this.form.handleSubmit(this.saveCustomer)(event);
  }

  saveCustomer(values: CustomerDetailsValues) {
    if (!this.hasActiveReservation) return;
    const draft = useBookingDraftStore.getState();
    draft.setCustomer(values);
    draft.setStep('review');
    this.navigate('/agendar/revisao');
  }
}
