import { AgendaAppointment, AgendaTimeBlock } from '@/modules/admin/agenda/api/agenda';
import { AppointmentDetailDrawer } from '@/modules/admin/agenda/components/appointment-detail-drawer';
import { CancelAppointmentDialog } from '@/modules/admin/agenda/components/cancel-appointment-dialog';
import { CreateAppointmentDrawer } from '@/modules/admin/agenda/components/create-appointment-drawer';
import { CreateTimeBlockDialog } from '@/modules/admin/agenda/components/create-time-block-dialog';
import { RescheduleAppointmentDialog } from '@/modules/admin/agenda/components/reschedule-appointment-dialog';
import {
  useAgendaAppointments,
  useAgendaBarbers,
  useAgendaTimeBlocks,
  useAgendaUnit,
  useRescheduleAgendaAppointment,
} from '@/modules/admin/agenda/hooks/use-agenda';
import { buildUnitHours, dateAtNoon, dateRange, shiftDate, todayInBusinessTimeZone, visibleDays } from '@/modules/admin/agenda/lib/format';

import { CalendarDropTarget, CalendarGrid } from '@/shared/components/calendar-grid';
import { CalendarPicker } from '@/shared/components/calendar-picker';
import { ConfirmDialog } from '@/shared/components/confirm-dialog';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { RenderComponent } from '@/shared/components/render-component';
import { useOverlay } from '@/shared/hooks/use-overlay';
import { formatDate, formatDateTime } from '@/shared/lib/format';
import { FIXED_OFFSET } from '@/shared/lib/time';
import { sessionStore } from '@/shared/stores/session-store';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';

import { ArrowLeft, ArrowRight, CalendarDays, CalendarOff, Clock3, Grip } from 'lucide-react';
import { Observer, useLocalObservable } from 'mobx-react-lite';
import { useLocation, useSearch } from 'wouter';

type AgendaView = 'day' | 'week';

interface PendingMove {
  target: CalendarDropTarget;
  appointment: AgendaAppointment;
}

export default function AdminAgendaPage() {
  const search = useSearch();
  const unitQuery = useAgendaUnit();
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(search);
  const appointmentId = searchParams.get('ag');
  const timeBlocksQuery = useAgendaTimeBlocks();
  const cancelOverlay = useOverlay('cancelar');
  const timeBlockOverlay = useOverlay('bloqueio');
  const newAppointmentOverlay = useOverlay('novo');
  const rescheduleOverlay = useOverlay('remarcar');
  const appointmentDetailOverlay = useOverlay('ag', '');
  const rescheduleMutation = useRescheduleAgendaAppointment();
  const barbersQuery = useAgendaBarbers(sessionStore.user?.id);
  const actionAppointmentId = searchParams.get('appointmentId');
  const cancelInitialType = searchParams.get('type') === 'no_show' ? 'no_show' : 'barbershop';

  const store = useLocalObservable(() => ({
    date: todayInBusinessTimeZone(),
    statusFilter: 'all',
    selectedBarberId: 'all',
    view: 'day' as AgendaView,
    pendingMove: null as null | PendingMove,
    get days() {
      return visibleDays(this.range.from, this.range.to);
    },
    get hours() {
      return buildUnitHours(unitQuery.unit, this.days);
    },
    get pickerDate() {
      return dateAtNoon(this.date);
    },
    get range() {
      return dateRange(this.view, this.date);
    },
    get weekBarberId() {
      return this.selectedBarberId === 'all' ? barbersQuery.barbers[0]?.id : Number(this.selectedBarberId);
    },
    get barberFilter() {
      return (
        sessionStore.isBarber ? 'me'
        : this.view === 'week' ? this.weekBarberId
        : this.selectedBarberId === 'all' ? undefined
        : Number(this.selectedBarberId)
      );
    },
    get visibleBarbers() {
      if (sessionStore.isBarber) return barbersQuery.barbers;
      if (this.view === 'week') {
        return barbersQuery.barbers.filter((barber) => barber.id === Number(this.weekBarberId));
      }

      if (this.selectedBarberId === 'all') {
        return barbersQuery.barbers;
      }

      return barbersQuery.barbers.filter((barber) => barber.id === Number(this.selectedBarberId));
    },
    get actualBlocks() {
      const data = timeBlocksQuery.timeBlocks.filter(
        (block) => new Date(block.start).getTime() < store.periodEnd && new Date(block.end).getTime() > store.periodStart,
      );
      return data.map((block: AgendaTimeBlock) => ({
        endsAt: block.end,
        startsAt: block.start,
        id: String(block.id),
        barberId: block.barberId === null ? null : String(block.barberId),
        reason: block.reason || (block.type === 'timeoff' ? 'Folga' : 'Bloqueio'),
      }));
    },
    get periodStart() {
      return new Date(`${this.range.from}T00:00:00${FIXED_OFFSET}`).getTime();
    },
    get periodEnd() {
      return new Date(`${shiftDate(this.range.to, 1)}T00:00:00${FIXED_OFFSET}`).getTime();
    },
    get calendarBlocks() {
      return [...this.actualBlocks, ...this.hours.closedBlocks];
    },
    get calendarAppointments() {
      const filteredAppointments =
        this.statusFilter === 'all' ?
          appointmentsQuery.appointments
        : appointmentsQuery.appointments.filter((appointment) => appointment.status === this.statusFilter);
      return filteredAppointments.map((appointment) => ({
        id: String(appointment.id),
        barberId: String(appointment.barberId),
        startsAt: appointment.start,
        durationMinutes: appointment.durationMin,
        customerName: appointment.customerName,
        serviceName: appointment.items.map((item) => item.name).join(' · ') || 'Serviços não informados',
        status: appointment.status,
        canMove: sessionStore.canWrite && ['pending', 'confirmed'].includes(appointment.status),
      }));
    },
    get allCalendarAppointments() {
      return appointmentsQuery.appointments.map((appointment) => ({
        id: String(appointment.id),
        barberId: String(appointment.barberId),
        startsAt: appointment.start,
        durationMinutes: appointment.durationMin,
        customerName: appointment.customerName,
        serviceName: appointment.items.map((item) => item.name).join(' · ') || 'Serviços não informados',
        status: appointment.status,
      }));
    },
    get pendingTargetBarber() {
      if (!this.pendingMove) return null;
      return barbersQuery.barbers?.find((barber) => barber.id === Number(this.pendingMove!.target.barberId));
    },
    setDate(value: string) {
      this.date = value;
    },
    setView(value: AgendaView) {
      this.view = value;
    },
    setStatusFilter(value: string) {
      this.statusFilter = value;
    },
    setSelectedBarberId(value: string) {
      this.selectedBarberId = value;
    },
    setPendingMove(value: PendingMove | null) {
      this.pendingMove = value;
    },
  }));

  const appointmentsQuery = useAgendaAppointments(() => ({
    to: store.range.to,
    from: store.range.from,
    barberId: store.barberFilter,
  }));

  function selectDate(value: Date | null) {
    if (value) store.setDate(formatDate(value, 'yyyy-MM-dd'));
  }

  function shiftPeriod(direction: -1 | 1) {
    store.setDate(shiftDate(store.date, direction * (store.view === 'week' ? 7 : 1)));
  }

  function selectSlot(target: CalendarDropTarget) {
    const start = `${target.date}T${target.time}:00${FIXED_OFFSET}`;
    setLocation(`/admin/agenda?novo=1&barberId=${encodeURIComponent(target.barberId)}&start=${encodeURIComponent(start)}`);
  }

  function moveAppointment(appointmentId: string, target: CalendarDropTarget) {
    const appointment = appointmentsQuery.appointments.find((item) => String(item.id) === appointmentId);
    if (!appointment || !sessionStore.canWrite || !['pending', 'confirmed'].includes(appointment.status)) return;
    const targetStart = `${target.date}T${target.time}:00${FIXED_OFFSET}`;
    if (appointment.barberId === Number(target.barberId) && new Date(appointment.start).getTime() === new Date(targetStart).getTime()) return;
    store.setPendingMove({ appointment, target });
  }

  function confirmMove() {
    if (!store.pendingMove) return;
    rescheduleMutation.mutate(
      {
        id: store.pendingMove.appointment.id,
        start: `${store.pendingMove.target.date}T${store.pendingMove.target.time}:00${FIXED_OFFSET}`,
        barberId: Number(store.pendingMove.target.barberId),
        reason: 'Remarcado pela equipe na grade da agenda',
        notifyCustomer: false,
      },
      {
        onSettled: () => store.setPendingMove(null),
      },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Painel administrativo"
        title="Agenda"
        description="Organize os atendimentos da equipe e acompanhe os horários disponíveis."
        actions={
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Observer>
              {() => (
                <RenderComponent condition={sessionStore.canWrite}>
                  <Button type="button" variant="outline" className="min-h-11 flex-1 sm:flex-none" onClick={() => timeBlockOverlay.open()}>
                    <CalendarOff className="size-4" aria-hidden="true" /> Bloquear horário
                  </Button>
                </RenderComponent>
              )}
            </Observer>
            <Observer>
              {() => (
                <Button
                  type="button"
                  variant={store.view === 'day' ? 'default' : 'outline'}
                  className="min-h-11 flex-1 sm:flex-none"
                  aria-pressed={store.view === 'day'}
                  onClick={() => store.setView('day')}
                >
                  Dia
                </Button>
              )}
            </Observer>
            <Observer>
              {() => (
                <Button
                  type="button"
                  variant={store.view === 'week' ? 'default' : 'outline'}
                  className="min-h-11 flex-1 sm:flex-none"
                  aria-pressed={store.view === 'week'}
                  onClick={() => store.setView('week')}
                >
                  Semana
                </Button>
              )}
            </Observer>
          </div>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="size-5 text-primary" aria-hidden="true" />
            Período e filtros
          </CardTitle>
          <CardDescription>Escolha a data, a equipe e os status que deseja acompanhar.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(13rem,1fr)_minmax(12rem,0.8fr)_minmax(12rem,0.8fr)_auto] xl:items-end">
          <Observer>{() => <CalendarPicker value={store.pickerDate} onValueChange={selectDate} label="Data" />}</Observer>
          <div className="space-y-2">
            <label htmlFor="agenda-barber" className="text-sm font-medium">
              Barbeiro
            </label>
            <Observer>
              {() => (
                <Select
                  onValueChange={(value) => store.setSelectedBarberId(value)}
                  disabled={sessionStore.isBarber || !barbersQuery.barbers.length}
                  value={sessionStore.isBarber ? String(barbersQuery.barbers[0]?.id ?? '') : store.selectedBarberId}
                >
                  <SelectTrigger id="agenda-barber" className="min-h-11 w-full">
                    <SelectValue placeholder="Selecione o barbeiro" />
                  </SelectTrigger>
                  <SelectContent>
                    <RenderComponent condition={store.view === 'day' && !sessionStore.isBarber}>
                      <SelectItem value="all">Todos os barbeiros</SelectItem>
                    </RenderComponent>
                    {barbersQuery.barbers.map((barber) => (
                      <SelectItem key={barber.id} value={String(barber.id)}>
                        {barber.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Observer>
          </div>
          <div className="space-y-2">
            <label htmlFor="agenda-status" className="text-sm font-medium">
              Status
            </label>
            <Observer>
              {() => (
                <Select value={store.statusFilter} onValueChange={store.setStatusFilter}>
                  <SelectTrigger id="agenda-status" className="min-h-11 w-full">
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="pending">Agendado</SelectItem>
                    <SelectItem value="confirmed">Confirmado</SelectItem>
                    <SelectItem value="checked_in">Aguardando</SelectItem>
                    <SelectItem value="in_service">Em atendimento</SelectItem>
                    <SelectItem value="done">Concluído</SelectItem>
                    <SelectItem value="canceled">Cancelado</SelectItem>
                    <SelectItem value="no_show">Não compareceu</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </Observer>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Observer>
              {() => (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  aria-label={store.view === 'week' ? 'Semana anterior' : 'Dia anterior'}
                  onClick={() => shiftPeriod(-1)}
                >
                  <ArrowLeft className="size-4" aria-hidden="true" />
                </Button>
              )}
            </Observer>
            <Observer>
              {() => (
                <Button type="button" variant="outline" className="min-h-11" onClick={() => store.setDate(todayInBusinessTimeZone())}>
                  Hoje
                </Button>
              )}
            </Observer>
            <Observer>
              {() => (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  aria-label={store.view === 'week' ? 'Próxima semana' : 'Próximo dia'}
                  onClick={() => shiftPeriod(1)}
                >
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              )}
            </Observer>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Observer>{() => <h2 className="text-xl font-semibold">{store.view === 'week' ? 'Visão semanal' : 'Visão do dia'}</h2>}</Observer>
          <Observer>
            {() => (
              <p className="text-sm text-muted-foreground">
                <RenderComponent condition={store.range.from === store.range.to}>{formatDate(store.range.from)}</RenderComponent>

                <RenderComponent condition={!(store.range.from === store.range.to)}>
                  `${formatDate(store.range.from, 'dd/MM')} a ${formatDate(store.range.to, 'dd/MM/yyyy')}`
                </RenderComponent>
              </p>
            )}
          </Observer>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground" aria-label="Legenda da agenda">
          <span className="inline-flex items-center gap-1">
            <Clock3 className="size-4 text-destructive" aria-hidden="true" /> Agora
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              className="size-4 rounded border border-border bg-[repeating-linear-gradient(135deg,var(--border)_0,var(--border)_1px,transparent_1px,transparent_7px)]"
              aria-hidden="true"
            />{' '}
            Bloqueio ou folga
          </span>
          <Observer>
            {() => (
              <RenderComponent condition={sessionStorage.canWrite}>
                <span className="inline-flex items-center gap-1">
                  <Grip className="size-4" aria-hidden="true" /> Arraste para remarcar
                </span>
              </RenderComponent>
            )}
          </Observer>
        </div>
      </div>

      <Observer>
        {() => {
          const hasError = barbersQuery.isError || unitQuery.isError || appointmentsQuery.isError || timeBlocksQuery.isError;
          return (
            <RenderComponent condition={hasError}>
              <ErrorState
                title="Não foi possível carregar a agenda"
                description="Confira sua conexão e tente carregar os dados novamente."
                onRetry={() => {
                  Promise.all([
                    barbersQuery.queryResult.refetch(),
                    unitQuery.queryResult.refetch(),
                    timeBlocksQuery.queryResult.refetch(),
                    appointmentsQuery.queryResult.refetch(),
                  ]);
                }}
              />
            </RenderComponent>
          );
        }}
      </Observer>

      <Observer>
        {() => {
          const isPending = barbersQuery.isPending || unitQuery.isPending || appointmentsQuery.isPending || timeBlocksQuery.isPending;

          return (
            <RenderComponent condition={isPending}>
              <Skeleton className="h-152 rounded-xl" aria-label="Carregando agenda" />
            </RenderComponent>
          );
        }}
      </Observer>

      <Observer>
        {() => (
          <RenderComponent condition={!store.visibleBarbers.length}>
            <EmptyState
              title="Nenhum barbeiro disponível"
              description={
                sessionStore.isBarber ? 'Não foi possível localizar sua agenda.' : 'Cadastre ou ative um barbeiro para visualizar a agenda.'
              }
            />
          </RenderComponent>
        )}
      </Observer>

      <Observer>
        {() => {
          const filteredAppointments = appointmentsQuery.filteredAppointments(store.statusFilter);

          return (
            <RenderComponent condition={store.visibleBarbers.length > 0}>
              <RenderComponent
                condition={filteredAppointments.length === 0 && appointmentsQuery.appointments.length === 0 && store.calendarBlocks.length === 0}
              >
                <EmptyState
                  title="Agenda livre neste período"
                  description="Não há atendimentos nem bloqueios. Selecione um horário livre na grade para iniciar um agendamento."
                />
              </RenderComponent>

              <RenderComponent
                condition={!(filteredAppointments.length === 0 && appointmentsQuery.appointments.length === 0 && store.calendarBlocks.length === 0)}
              >
                <CalendarGrid
                  view={store.view}
                  intervalMinutes={15}
                  endHour={store.hours.endHour}
                  blocks={store.calendarBlocks}
                  startHour={store.hours.startHour}
                  date={dateAtNoon(store.range.from)}
                  appointments={store.calendarAppointments}
                  allAppointments={store.allCalendarAppointments}
                  onSelectSlot={sessionStore.canWrite ? selectSlot : undefined}
                  onMoveAppointment={sessionStore.canWrite ? moveAppointment : undefined}
                  barbers={store.visibleBarbers.map((barber) => ({ id: String(barber.id), name: barber.name }))}
                  onSelectAppointment={(appointment) => setLocation(`/admin/agenda?ag=${encodeURIComponent(appointment.id)}`)}
                />
              </RenderComponent>
            </RenderComponent>
          );
        }}
      </Observer>

      <Observer>
        {() => (
          <ConfirmDialog
            open={store.pendingMove !== null}
            onOpenChange={(open) => !open && !rescheduleMutation.isLoading && store.setPendingMove(null)}
            title="Confirmar remarcação"
            description={
              store.pendingMove ?
                `Mover ${store.pendingMove.appointment.customerName} de ${formatDateTime(store.pendingMove.appointment.start)} para ${formatDateTime(`${store.pendingMove.target.date}T${store.pendingMove.target.time}:00${FIXED_OFFSET}`)}${store.pendingTargetBarber ? ` com ${store.pendingTargetBarber.name}` : ''}?`
              : 'Confirme a alteração do horário.'
            }
            confirmLabel="Remarcar atendimento"
            pending={rescheduleMutation.isLoading}
            onConfirm={confirmMove}
          />
        )}
      </Observer>

      <Observer>
        {() => (
          <CreateAppointmentDrawer
            open={sessionStore.canWrite && newAppointmentOverlay.isOpen}
            onOpenChange={(open) => !open && newAppointmentOverlay.close()}
          />
        )}
      </Observer>

      <AppointmentDetailDrawer
        appointmentId={appointmentId}
        open={appointmentDetailOverlay.isOpen}
        onOpenChange={(open) => !open && appointmentDetailOverlay.close()}
      />

      <Observer>
        {() => (
          <RescheduleAppointmentDialog
            appointmentId={actionAppointmentId}
            open={sessionStore.canWrite && rescheduleOverlay.isOpen}
            onOpenChange={(open) => !open && setLocation('/admin/agenda')}
          />
        )}
      </Observer>

      <Observer>
        {() => (
          <CancelAppointmentDialog
            appointmentId={actionAppointmentId}
            initialType={cancelInitialType}
            open={sessionStore.canWrite && cancelOverlay.isOpen}
            onOpenChange={(open) => !open && setLocation('/admin/agenda')}
          />
        )}
      </Observer>

      <Observer>
        {() => (
          <CreateTimeBlockDialog
            open={sessionStore.canWrite && timeBlockOverlay.isOpen}
            onOpenChange={(open) => !open && setLocation('/admin/agenda')}
            onRescheduleConflict={(id) => setLocation(`/admin/agenda?remarcar=1&appointmentId=${id}`)}
          />
        )}
      </Observer>
    </div>
  );
}
