import { AppointmentListParams, getMyAppointments } from '@/modules/account/api/appointments';
import { getAccountProfile } from '@/modules/account/api/profile';
import { getPublicBarbers } from '@/modules/site/api/barbers';
import { getPublicUnit } from '@/modules/site/api/unit';

import { MobxQuery } from '@/shared/lib/query';
import { useBookingDraftStore } from '@/shared/stores/booking-draft-store';

import { makeAutoObservable } from 'mobx';

import type { AppointmentStatus } from '@/shared/components/status-badge';
type ProfileResponse = Awaited<ReturnType<typeof getAccountProfile>>;
type AppointmentsListResponse = Awaited<ReturnType<typeof getMyAppointments>>;
type Barber = Awaited<ReturnType<typeof getPublicBarbers>>[number];
type Unit = Awaited<ReturnType<typeof getPublicUnit>>;

type AccountOverviewPageStoreExclude = 'userQuery' | 'upcomingQuery' | 'lastCutQuery' | 'barbersQuery' | 'unitQuery' | 'navigate';

const UPCOMING_PARAMS: AppointmentListParams = { view: 'upcoming', page: 1, limit: 1 };
const LAST_CUT_PARAMS: AppointmentListParams = { view: 'past', page: 1, limit: 1, status: 'done' };

const apiStatusLabels: Record<string, AppointmentStatus> = {
  pending: 'agendado',
  confirmed: 'confirmado',
  checked_in: 'aguardando',
  in_service: 'em_atendimento',
  done: 'concluido',
  canceled: 'cancelado',
  no_show: 'no_show',
};

export class AccountOverviewPageStore {
  private readonly userQuery = new MobxQuery<ProfileResponse>();
  private readonly upcomingQuery = new MobxQuery<AppointmentsListResponse>();
  private readonly lastCutQuery = new MobxQuery<AppointmentsListResponse>();
  private readonly barbersQuery = new MobxQuery<Barber[]>();
  private readonly unitQuery = new MobxQuery<Unit>();
  private readonly navigate: (path: string) => void;

  constructor(navigate: (path: string) => void) {
    this.navigate = navigate;
    makeAutoObservable<AccountOverviewPageStore, AccountOverviewPageStoreExclude>(
      this,
      { userQuery: false, upcomingQuery: false, lastCutQuery: false, barbersQuery: false, unitQuery: false, navigate: false },
      { autoBind: true },
    );
  }

  // ---------- Query results (computed) ----------
  private get userResult() {
    return this.userQuery.query({ queryKey: ['users', 'me'], queryFn: getAccountProfile, staleTime: 60_000 });
  }

  private get upcomingResult() {
    return this.upcomingQuery.query({
      queryKey: ['appointments', { scope: 'customer', ...UPCOMING_PARAMS }],
      queryFn: () => getMyAppointments(UPCOMING_PARAMS),
      staleTime: 30_000,
    });
  }

  private get lastCutResult() {
    return this.lastCutQuery.query({
      queryKey: ['appointments', { scope: 'customer', ...LAST_CUT_PARAMS }],
      queryFn: () => getMyAppointments(LAST_CUT_PARAMS),
      staleTime: 30_000,
    });
  }

  private get barbersResult() {
    return this.barbersQuery.query({ queryKey: ['barbers', { scope: 'public-site' }], queryFn: getPublicBarbers, staleTime: 5 * 60 * 1000 });
  }

  private get unitResult() {
    return this.unitQuery.query({ queryKey: ['units', { id: 1 }], queryFn: getPublicUnit, staleTime: 5 * 60 * 1000 });
  }

  // ---------- Estados ----------
  get isPending() {
    return this.userResult.isPending || this.upcomingResult.isPending || this.lastCutResult.isPending;
  }

  get isError() {
    return this.userResult.isError || this.upcomingResult.isError || this.lastCutResult.isError;
  }

  get isSuccess() {
    return this.userResult.isSuccess || this.upcomingResult.isSuccess || this.lastCutResult.isSuccess;
  }

  // ---------- Cabeçalho ----------
  get headerTitle() {
    const name = this.userResult.data?.name;
    return name ? `Olá, ${name.split(' ')[0]}` : 'Visão geral';
  }

  // ---------- Próximo agendamento ----------
  get upcoming() {
    return this.upcomingResult.data?.items[0];
  }

  get hasUpcoming() {
    return Boolean(this.upcoming);
  }

  get barberName() {
    const upcoming = this.upcoming;
    if (!upcoming) return '';
    return (this.barbersResult.data ?? []).find((barber) => barber.id === upcoming.barberId)?.name ?? 'Profissional';
  }

  get serviceNames() {
    return this.upcoming?.items.map((item) => item.name).filter(Boolean) ?? [];
  }

  get servicesLabel() {
    return this.serviceNames.length ? this.serviceNames.join(' · ') : 'Serviços não informados';
  }

  get statusLabel(): string {
    const status = this.upcoming?.status ?? '';
    return apiStatusLabels[status] ?? status.replaceAll('_', ' ');
  }

  get rescheduleHref() {
    return `/conta/agendamentos?reagendar=1&appointmentId=${this.upcoming?.id ?? ''}`;
  }

  get cancelHref() {
    return `/conta/agendamentos?cancelar=1&appointmentId=${this.upcoming?.id ?? ''}`;
  }

  get directionsUrl() {
    const unit = this.unitResult.data;
    const destination = unit?.address?.trim() || unit?.name?.trim() || 'barbearia';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
  }

  // ---------- Último corte ----------
  get lastCut() {
    return this.lastCutResult.data?.items[0];
  }

  get canRepeatLastCut() {
    return Boolean(this.lastCut?.items.length);
  }

  get repeatLabel() {
    return this.lastCut ? 'Repetir serviços e barbeiro' : 'Nenhum corte anterior';
  }

  get showLastCutNotice() {
    return !this.upcoming && Boolean(this.lastCut);
  }

  // ---------- Actions ----------
  refetch() {
    void this.userResult.refetch();
    void this.upcomingResult.refetch();
    void this.lastCutResult.refetch();
  }

  goToBooking() {
    this.navigate('/agendar');
  }

  repeatLastCut() {
    const lastCut = this.lastCut;
    if (!lastCut) return;
    const serviceIds = lastCut.items.map((item) => String(item.serviceId)).filter(Boolean);
    if (!serviceIds.length) return;

    const draft = useBookingDraftStore.getState();
    draft.setServiceIds(serviceIds);
    draft.setBarberId(String(lastCut.barberId));
    draft.setStep('services');
    this.navigate('/agendar');
  }
}
