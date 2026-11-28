import { AvailableBarber, getAvailableBarbers } from '@/modules/booking/api/booking';

import { formatBRL, formatDateTime, formatDuration } from '@/shared/lib/format';
import { MobxQuery } from '@/shared/lib/query';
import { useBookingDraftStore } from '@/shared/stores/booking-draft-store';

import { makeAutoObservable, observableRef, reaction, runInAction } from 'mobx';

type BarberStepPageStoreExclude = 'barbersQuery' | 'navigate';

export interface BarberOptionView {
  id: number;
  name: string;
  photoUrl?: string;
  specialties?: string[];
  availabilityText: string;
  ratingText: string;
  durationLabel: string;
  priceLabel: string;
  unavailable: boolean;
  selected: boolean;
}

export class BarberStepPageStore {
  serviceIds: string[];
  selectedChoice: string;

  private readonly navigate: (path: string) => void;
  private readonly barbersQuery = new MobxQuery<AvailableBarber[]>();

  constructor(navigate: (path: string) => void) {
    const draft = useBookingDraftStore.getState();
    this.navigate = navigate;
    this.serviceIds = draft.serviceIds;
    this.selectedChoice = draft.barberId ?? 'any';

    makeAutoObservable<BarberStepPageStore, BarberStepPageStoreExclude>(this, { barbersQuery: false, navigate: false, serviceIds: observableRef }, { autoBind: true });
  }

  // ---------- Query ----------
  private get barbersResult() {
    const serviceIds = this.serviceIds;
    return this.barbersQuery.query({
      queryKey: ['availability-barbers', { serviceIds }],
      queryFn: () => getAvailableBarbers(serviceIds),
      enabled: serviceIds.length > 0 && serviceIds.length <= 4,
      staleTime: 30_000,
      retry: 1,
    });
  }

  // ---------- Dados derivados ----------
  get hasServices() {
    return this.serviceIds.length > 0;
  }

  get barbers() {
    return this.barbersResult.data ?? [];
  }

  get availableBarbers() {
    return this.barbers.filter((barber) => barber.nextSlot !== null);
  }

  get isEmpty() {
    return this.barbers.length === 0;
  }

  get isAnySelected() {
    return this.selectedChoice === 'any';
  }

  get anyAvailabilityText() {
    return this.availableBarbers.length > 0 ? 'Há horários disponíveis' : 'Sem horários próximos';
  }

  get canContinue() {
    return this.isAnySelected ? this.availableBarbers.length > 0 : this.availableBarbers.some((barber) => String(barber.id) === this.selectedChoice);
  }

  get options(): BarberOptionView[] {
    return this.barbers.map((barber) => ({
      id: barber.id,
      name: barber.name,
      photoUrl: barber.photo ?? undefined,
      specialties: barber.specialties,
      availabilityText: barber.nextSlot ? `Próximo horário: ${formatDateTime(barber.nextSlot.start)}` : 'Sem horários disponíveis nos próximos 30 dias',
      ratingText: typeof barber.rating === 'number' ? `${barber.rating.toFixed(1)} de 5` : 'Sem avaliações',
      durationLabel: formatDuration(barber.totalDurationMin),
      priceLabel: formatBRL(barber.subtotal),
      unavailable: !barber.nextSlot,
      selected: this.selectedChoice === String(barber.id),
    }));
  }

  // Barbeiro escolhido (ex.: vindo do draft) que deixou de ter horários.
  get isSelectedBarberUnavailable() {
    const data = this.barbersResult.data;
    if (this.isAnySelected || !data) return false;
    return !data.find((barber) => String(barber.id) === this.selectedChoice)?.nextSlot;
  }

  // ---------- Estados ----------
  get isPending() {
    return this.barbersResult.isPending;
  }

  get isError() {
    return this.barbersResult.isError;
  }

  get isSuccess() {
    return this.barbersResult.isSuccess;
  }

  // ---------- Regras reativas (ciclo de vida) ----------
  // Mantém serviceIds em sincronia com o draft e aplica as guardas da etapa.
  // Retorna o disposer para ser usado em cleanup.
  bindGuards() {
    const syncDraft = () =>
      runInAction(() => {
        this.serviceIds = useBookingDraftStore.getState().serviceIds;
      });
    syncDraft();
    const unsubscribeDraft = useBookingDraftStore.subscribe(syncDraft);

    const disposeRedirect = reaction(
      () => !this.hasServices,
      (empty) => {
        if (empty) this.navigate('/agendar');
      },
      { fireImmediately: true },
    );

    const disposeUnavailable = reaction(
      () => this.isSelectedBarberUnavailable,
      (unavailable) => {
        if (unavailable) this.chooseAny();
      },
      { fireImmediately: true },
    );

    return () => {
      unsubscribeDraft();
      disposeRedirect();
      disposeUnavailable();
    };
  }

  // ---------- Actions ----------
  refetch() {
    void this.barbersResult.refetch();
  }

  chooseAny() {
    this.selectedChoice = 'any';
    useBookingDraftStore.getState().setBarberId(null);
  }

  chooseBarber(id: number) {
    this.selectedChoice = String(id);
    useBookingDraftStore.getState().setBarberId(String(id));
  }

  goToServices() {
    this.navigate('/agendar');
  }

  continueBooking() {
    if (!this.canContinue) return;
    const draft = useBookingDraftStore.getState();
    if (this.isAnySelected) draft.setBarberId(null);
    draft.setStep('slot');
    this.navigate('/agendar/horario');
  }
}
