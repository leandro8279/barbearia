import { AppointmentListParams, AppointmentListView, CustomerAppointment, getMyAppointments } from '@/modules/account/api/appointments';
import { getPublicBarbers } from '@/modules/site/api/barbers';

import { MobxQuery } from '@/shared/lib/query';
import { useBookingDraftStore } from '@/shared/stores/booking-draft-store';

import { makeAutoObservable } from 'mobx';

const PAGE_SIZE = 8;

type AppointmentsListResponse = Awaited<ReturnType<typeof getMyAppointments>>;
type Barber = Awaited<ReturnType<typeof getPublicBarbers>>[number];

type AccountAppointmentsPageStoreExclude = 'appointmentsQuery' | 'barbersQuery' | 'navigate';

export class AccountAppointmentsPageStore {
  private state = {
    view: 'upcoming' as AppointmentListView,
    from: '',
    to: '',
    page: 1,
  };

  private readonly appointmentsQuery = new MobxQuery<AppointmentsListResponse>();
  private readonly barbersQuery = new MobxQuery<Barber[]>();
  private readonly navigate: (path: string) => void;

  constructor(navigate: (path: string) => void) {
    this.navigate = navigate;
    makeAutoObservable<AccountAppointmentsPageStore, AccountAppointmentsPageStoreExclude>(this, { appointmentsQuery: false, barbersQuery: false, navigate: false }, { autoBind: true });
  }

  // ---------- Query params ----------
  private get queryParams(): AppointmentListParams {
    return {
      view: this.state.view,
      page: this.state.page,
      limit: PAGE_SIZE,
      from: this.state.from || undefined,
      to: this.state.to || undefined,
    };
  }

  // ---------- Query results (computed) ----------
  private get appointmentsResult() {
    const params = this.queryParams;
    return this.appointmentsQuery.query({
      queryKey: ['appointments', { scope: 'customer', ...params }],
      queryFn: () => getMyAppointments(params),
      enabled: !this.state.from || !this.state.to || this.state.from <= this.state.to,
      staleTime: 30_000,
    });
  }

  private get barbersResult() {
    return this.barbersQuery.query({ queryKey: ['barbers', { scope: 'public-site' }], queryFn: getPublicBarbers, staleTime: 5 * 60 * 1000 });
  }

  // ---------- Dados derivados ----------
  get invalidRange() {
    return Boolean(this.state.from && this.state.to && this.state.from > this.state.to);
  }

  get appointments() {
    return this.appointmentsResult.data?.items ?? [];
  }

  get from() {
    return this.state.from;
  }

  get to() {
    return this.state.to;
  }

  get view() {
    return this.state.view;
  }

  get page() {
    return this.state.page;
  }

  get barbers() {
    return this.barbersResult.data ?? [];
  }

  get total() {
    return this.appointmentsResult.data?.total ?? 0;
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.total / PAGE_SIZE));
  }

  get rangeStart() {
    return this.total === 0 ? 0 : (this.state.page - 1) * PAGE_SIZE + 1;
  }

  get rangeEnd() {
    return Math.min(this.state.page * PAGE_SIZE, this.total);
  }

  // ---------- Estados ----------
  get isPending() {
    return this.appointmentsResult.isPending || (this.barbersResult.isPending && !this.appointmentsResult.data);
  }

  get isError() {
    return this.appointmentsResult.isError;
  }

  get isFetching() {
    return this.appointmentsResult.isFetching;
  }

  get canGoPrevious() {
    return this.state.page > 1 && !this.isFetching;
  }

  get canGoNext() {
    return this.state.page < this.totalPages && !this.isFetching;
  }

  get emptyTitle() {
    if (this.state.view === 'upcoming') return 'Nenhum próximo agendamento';
    if (this.state.view === 'past') return 'Nenhum atendimento passado';
    return 'Nenhum agendamento cancelado';
  }

  get emptyDescription() {
    return this.state.view === 'upcoming' ? 'Quando você reservar um horário, ele aparecerá aqui.' : 'Não há agendamentos neste período.';
  }

  // ---------- Actions ----------
  setView(view: AppointmentListView) {
    this.state.view = view;
    this.state.page = 1;
  }

  setFrom(from: string) {
    this.state.from = from;
    this.state.page = 1;
  }

  setTo(to: string) {
    this.state.to = to;
    this.state.page = 1;
  }

  goToPreviousPage() {
    this.state.page = Math.max(1, this.state.page - 1);
  }

  goToNextPage() {
    this.state.page += 1;
  }

  refetch() {
    void this.appointmentsResult.refetch();
  }

  goToBooking() {
    this.navigate('/agendar');
  }

  repeatAppointment(appointment: CustomerAppointment) {
    const serviceIds = appointment.items.map((item) => String(item.serviceId)).filter(Boolean);
    if (!serviceIds.length) return;

    const draft = useBookingDraftStore.getState();
    draft.setServiceIds(serviceIds);
    draft.setBarberId(String(appointment.barberId));
    draft.setStep('services');
    this.navigate('/agendar');
  }
}
