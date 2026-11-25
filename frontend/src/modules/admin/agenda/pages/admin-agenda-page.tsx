import { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { ArrowLeft, ArrowRight, CalendarDays, CalendarOff, Clock3, Grip } from 'lucide-react';
import { CalendarGrid, type CalendarAppointment, type CalendarBlock, type CalendarDropTarget } from '@/shared/components/calendar-grid';
import { CalendarPicker } from '@/shared/components/calendar-picker';
import { ConfirmDialog } from '@/shared/components/confirm-dialog';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { formatDate, formatDateTime } from '@/shared/lib/format';
import { BUSINESS_TIME_ZONE, FIXED_OFFSET } from '@/shared/lib/time';
import { useSessionStore } from '@/shared/stores/session-store';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import { useAgendaAppointments, useAgendaBarbers, useAgendaTimeBlocks, useAgendaUnit, useRescheduleAgendaAppointment } from '@/modules/admin/agenda/hooks/use-agenda';
import type { AgendaAppointment, AgendaTimeBlock } from '@/modules/admin/agenda/api/agenda';
import { CreateAppointmentDrawer } from '@/modules/admin/agenda/components/create-appointment-drawer';
import { AppointmentDetailDrawer } from '@/modules/admin/agenda/components/appointment-detail-drawer';
import { RescheduleAppointmentDialog } from '@/modules/admin/agenda/components/reschedule-appointment-dialog';
import { CancelAppointmentDialog } from '@/modules/admin/agenda/components/cancel-appointment-dialog';
import { CreateTimeBlockDialog } from '@/modules/admin/agenda/components/create-time-block-dialog';
import { useOverlay } from '@/shared/hooks/use-overlay';

type AgendaView = 'day' | 'week';

interface PendingMove {
  appointment: AgendaAppointment;
  target: CalendarDropTarget;
}

function todayInBusinessTimeZone() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIME_ZONE }).format(new Date());
}

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function startOfWeek(value: string) {
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

function dateRange(view: AgendaView, date: string) {
  const from = view === 'week' ? startOfWeek(date) : date;
  return { from, to: view === 'week' ? shiftDate(from, 6) : from };
}

function dateAtNoon(value: string) {
  return new Date(`${value}T12:00:00${FIXED_OFFSET}`);
}

function timeValue(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function rangeValue(range: { start: string; end: string } | [string, string]) {
  return Array.isArray(range) ? { start: timeValue(range[0]), end: timeValue(range[1]) } : { start: timeValue(range.start), end: timeValue(range.end) };
}

function isoAt(date: string, minute: number) {
  const offsetDays = Math.floor(minute / 1440);
  const time = ((minute % 1440) + 1440) % 1440;
  const targetDate = new Date(`${date}T12:00:00.000Z`);
  targetDate.setUTCDate(targetDate.getUTCDate() + offsetDays);
  return `${targetDate.toISOString().slice(0, 10)}T${String(Math.floor(time / 60)).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}:00${FIXED_OFFSET}`;
}

function visibleDays(from: string, to: string) {
  const days: string[] = [];
  let current = from;
  while (current <= to) {
    days.push(current);
    current = shiftDate(current, 1);
  }
  return days;
}

function buildUnitHours(
  unit:
    | {
        businessHours?: Array<{ weekday: number; ranges: Array<{ start: string; end: string } | [string, string]> }>;
        holidays?: Array<{ date: string; name: string; closed?: boolean; ranges?: Array<{ start: string; end: string } | [string, string]> }>;
      }
    | null
    | undefined,
  days: string[],
) {
  const perDay = days.map((day) => {
    const weekday = new Date(`${day}T12:00:00.000Z`).getUTCDay();
    const holiday = unit?.holidays?.find((item) => item.date === day);
    const regularHours = unit?.businessHours?.find((item) => Number(item.weekday) === weekday);
    const ranges = holiday?.closed ? [] : (holiday?.ranges ?? regularHours?.ranges ?? []).map(rangeValue).filter((range) => range.start < range.end);
    return { day, holidayName: holiday?.name, ranges };
  });
  const allRanges = perDay.flatMap((item) => item.ranges);
  const startHour = allRanges.length ? Math.floor(Math.min(...allRanges.map((range) => range.start)) / 60) : 8;
  const endHour = allRanges.length ? Math.ceil(Math.max(...allRanges.map((range) => range.end)) / 60) : 20;
  const closedBlocks: CalendarBlock[] = [];

  for (const item of perDay) {
    let cursor = startHour * 60;
    if (!item.ranges.length) {
      closedBlocks.push({ id: `closed-${item.day}`, barberId: null, startsAt: isoAt(item.day, startHour * 60), endsAt: isoAt(item.day, endHour * 60), reason: item.holidayName || 'Unidade fechada' });
      continue;
    }
    const ranges = [...item.ranges].sort((left, right) => left.start - right.start);
    for (const range of ranges) {
      if (range.start > cursor) {
        closedBlocks.push({ id: `closed-${item.day}-${cursor}`, barberId: null, startsAt: isoAt(item.day, cursor), endsAt: isoAt(item.day, range.start), reason: 'Fora do horário de funcionamento' });
      }
      cursor = Math.max(cursor, range.end);
    }
    if (cursor < endHour * 60) {
      closedBlocks.push({ id: `closed-${item.day}-${cursor}`, barberId: null, startsAt: isoAt(item.day, cursor), endsAt: isoAt(item.day, endHour * 60), reason: 'Fora do horário de funcionamento' });
    }
  }

  return { startHour, endHour: Math.max(startHour + 1, endHour), closedBlocks };
}

export default function AdminAgendaPage() {
  const user = useSessionStore((state) => state.user);
  const [, setLocation] = useLocation();
  const search = useSearch();
  const newAppointmentOverlay = useOverlay('novo');
  const appointmentDetailOverlay = useOverlay('ag', '');
  const rescheduleOverlay = useOverlay('remarcar');
  const cancelOverlay = useOverlay('cancelar');
  const timeBlockOverlay = useOverlay('bloqueio');
  const searchParams = new URLSearchParams(search);
  const appointmentId = searchParams.get('ag');
  const actionAppointmentId = searchParams.get('appointmentId');
  const cancelInitialType = searchParams.get('type') === 'no_show' ? 'no_show' : 'barbershop';
  const isBarber = user?.role === 'barber';
  const canWrite = user?.role === 'admin' || user?.role === 'manager' || Boolean(user?.permissions.includes('agenda.write'));
  const userId = isBarber ? Number(user?.id) : undefined;
  const [date, setDate] = useState(todayInBusinessTimeZone);
  const [view, setView] = useState<AgendaView>('day');
  const [selectedBarberId, setSelectedBarberId] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);

  const barbersQuery = useAgendaBarbers(userId);
  const unitQuery = useAgendaUnit();
  const timeBlocksQuery = useAgendaTimeBlocks();
  const range = dateRange(view, date);
  const weekBarberId = selectedBarberId === 'all' ? barbersQuery.data?.[0]?.id : Number(selectedBarberId);
  const barberFilter =
    isBarber ? 'me'
    : view === 'week' ? weekBarberId
    : selectedBarberId === 'all' ? undefined
    : Number(selectedBarberId);
  const appointmentsQuery = useAgendaAppointments(range.from, range.to, barberFilter);
  const rescheduleMutation = useRescheduleAgendaAppointment();

  useEffect(() => {
    document.title = 'Agenda | Painel administrativo';
  }, []);

  useEffect(() => {
    if (view === 'week' && selectedBarberId === 'all' && barbersQuery.data?.length) setSelectedBarberId(String(barbersQuery.data[0].id));
  }, [barbersQuery.data, selectedBarberId, view]);

  const days = useMemo(() => visibleDays(range.from, range.to), [range.from, range.to]);
  const hours = useMemo(() => buildUnitHours(unitQuery.data, days), [days, unitQuery.data]);
  const visibleBarbers = useMemo(() => {
    const barbers = barbersQuery.data ?? [];
    if (isBarber) return barbers;
    if (view === 'week') return barbers.filter((barber) => barber.id === Number(weekBarberId));
    return selectedBarberId === 'all' ? barbers : barbers.filter((barber) => barber.id === Number(selectedBarberId));
  }, [barbersQuery.data, isBarber, selectedBarberId, view, weekBarberId]);

  const allAppointments = appointmentsQuery.data ?? [];
  const filteredAppointments = statusFilter === 'all' ? allAppointments : allAppointments.filter((appointment) => appointment.status === statusFilter);
  const calendarAppointments: CalendarAppointment[] = filteredAppointments.map((appointment) => ({
    id: String(appointment.id),
    barberId: String(appointment.barberId),
    startsAt: appointment.start,
    durationMinutes: appointment.durationMin,
    customerName: appointment.customerName,
    serviceName: appointment.items.map((item) => item.name).join(' · ') || 'Serviços não informados',
    status: appointment.status,
    canMove: canWrite && ['pending', 'confirmed'].includes(appointment.status),
  }));
  const allCalendarAppointments: CalendarAppointment[] = allAppointments.map((appointment) => ({
    id: String(appointment.id),
    barberId: String(appointment.barberId),
    startsAt: appointment.start,
    durationMinutes: appointment.durationMin,
    customerName: appointment.customerName,
    serviceName: appointment.items.map((item) => item.name).join(' · ') || 'Serviços não informados',
    status: appointment.status,
  }));
  const periodStart = new Date(`${range.from}T00:00:00${FIXED_OFFSET}`).getTime();
  const periodEnd = new Date(`${shiftDate(range.to, 1)}T00:00:00${FIXED_OFFSET}`).getTime();
  const actualBlocks: CalendarBlock[] = (timeBlocksQuery.data ?? [])
    .filter((block) => new Date(block.start).getTime() < periodEnd && new Date(block.end).getTime() > periodStart)
    .map((block: AgendaTimeBlock) => ({
      id: String(block.id),
      barberId: block.barberId === null ? null : String(block.barberId),
      startsAt: block.start,
      endsAt: block.end,
      reason: block.reason || (block.type === 'timeoff' ? 'Folga' : 'Bloqueio'),
    }));
  const calendarBlocks = [...actualBlocks, ...hours.closedBlocks];
  const hasError = barbersQuery.isError || unitQuery.isError || appointmentsQuery.isError || timeBlocksQuery.isError;
  const isPending = barbersQuery.isPending || unitQuery.isPending || appointmentsQuery.isPending || timeBlocksQuery.isPending;
  const pickerDate = dateAtNoon(date);

  function selectDate(value: Date | null) {
    if (value) setDate(formatDate(value, 'yyyy-MM-dd'));
  }

  function shiftPeriod(direction: -1 | 1) {
    setDate(shiftDate(date, direction * (view === 'week' ? 7 : 1)));
  }

  function moveAppointment(appointmentId: string, target: CalendarDropTarget) {
    const appointment = allAppointments.find((item) => String(item.id) === appointmentId);
    if (!appointment || !canWrite || !['pending', 'confirmed'].includes(appointment.status)) return;
    const targetStart = `${target.date}T${target.time}:00${FIXED_OFFSET}`;
    if (appointment.barberId === Number(target.barberId) && new Date(appointment.start).getTime() === new Date(targetStart).getTime()) return;
    setPendingMove({ appointment, target });
  }

  function confirmMove() {
    if (!pendingMove) return;
    void rescheduleMutation
      .mutateAsync({
        id: pendingMove.appointment.id,
        start: `${pendingMove.target.date}T${pendingMove.target.time}:00${FIXED_OFFSET}`,
        barberId: Number(pendingMove.target.barberId),
        reason: 'Remarcado pela equipe na grade da agenda',
        notifyCustomer: false,
      })
      .finally(() => setPendingMove(null))
      .catch(() => undefined);
  }

  function selectSlot(target: CalendarDropTarget) {
    const start = `${target.date}T${target.time}:00${FIXED_OFFSET}`;
    setLocation(`/admin/agenda?novo=1&barberId=${encodeURIComponent(target.barberId)}&start=${encodeURIComponent(start)}`);
  }

  const hasData = barbersQuery.data !== undefined && appointmentsQuery.data !== undefined && timeBlocksQuery.data !== undefined;
  const pendingTargetBarber = pendingMove ? barbersQuery.data?.find((barber) => barber.id === Number(pendingMove.target.barberId)) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Painel administrativo"
        title="Agenda"
        description="Organize os atendimentos da equipe e acompanhe os horários disponíveis."
        actions={
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            {canWrite && (
              <Button type="button" variant="outline" className="min-h-11 flex-1 sm:flex-none" onClick={() => timeBlockOverlay.open()}>
                <CalendarOff className="size-4" aria-hidden="true" /> Bloquear horário
              </Button>
            )}
            <Button type="button" variant={view === 'day' ? 'default' : 'outline'} className="min-h-11 flex-1 sm:flex-none" aria-pressed={view === 'day'} onClick={() => setView('day')}>
              Dia
            </Button>
            <Button type="button" variant={view === 'week' ? 'default' : 'outline'} className="min-h-11 flex-1 sm:flex-none" aria-pressed={view === 'week'} onClick={() => setView('week')}>
              Semana
            </Button>
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
          <CalendarPicker value={pickerDate} onValueChange={selectDate} label="Data" />
          <div className="space-y-2">
            <label htmlFor="agenda-barber" className="text-sm font-medium">
              Barbeiro
            </label>
            <Select
              value={isBarber ? String(barbersQuery.data?.[0]?.id ?? '') : selectedBarberId}
              onValueChange={(value) => setSelectedBarberId(value)}
              disabled={isBarber || !barbersQuery.data?.length}
            >
              <SelectTrigger id="agenda-barber" className="min-h-11 w-full">
                <SelectValue placeholder="Selecione o barbeiro" />
              </SelectTrigger>
              <SelectContent>
                {view === 'day' && !isBarber && <SelectItem value="all">Todos os barbeiros</SelectItem>}
                {(barbersQuery.data ?? []).map((barber) => (
                  <SelectItem key={barber.id} value={String(barber.id)}>
                    {barber.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor="agenda-status" className="text-sm font-medium">
              Status
            </label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
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
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button type="button" variant="outline" className="min-h-11" aria-label={view === 'week' ? 'Semana anterior' : 'Dia anterior'} onClick={() => shiftPeriod(-1)}>
              <ArrowLeft className="size-4" aria-hidden="true" />
            </Button>
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setDate(todayInBusinessTimeZone())}>
              Hoje
            </Button>
            <Button type="button" variant="outline" className="min-h-11" aria-label={view === 'week' ? 'Próxima semana' : 'Próximo dia'} onClick={() => shiftPeriod(1)}>
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{view === 'week' ? 'Visão semanal' : 'Visão do dia'}</h2>
          <p className="text-sm text-muted-foreground">{range.from === range.to ? formatDate(range.from) : `${formatDate(range.from, 'dd/MM')} a ${formatDate(range.to, 'dd/MM/yyyy')}`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground" aria-label="Legenda da agenda">
          <span className="inline-flex items-center gap-1">
            <Clock3 className="size-4 text-destructive" aria-hidden="true" /> Agora
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-4 rounded border border-border bg-[repeating-linear-gradient(135deg,var(--border)_0,var(--border)_1px,transparent_1px,transparent_7px)]" aria-hidden="true" />{' '}
            Bloqueio ou folga
          </span>
          {canWrite && (
            <span className="inline-flex items-center gap-1">
              <Grip className="size-4" aria-hidden="true" /> Arraste para remarcar
            </span>
          )}
        </div>
      </div>

      {hasError ?
        <ErrorState
          title="Não foi possível carregar a agenda"
          description="Confira sua conexão e tente carregar os dados novamente."
          onRetry={() => {
            void Promise.all([barbersQuery.refetch(), unitQuery.refetch(), timeBlocksQuery.refetch(), appointmentsQuery.refetch()]);
          }}
        />
      : isPending || !hasData ?
        <Skeleton className="h-[38rem] rounded-xl" aria-label="Carregando agenda" />
      : !visibleBarbers.length ?
        <EmptyState title="Nenhum barbeiro disponível" description={isBarber ? 'Não foi possível localizar sua agenda.' : 'Cadastre ou ative um barbeiro para visualizar a agenda.'} />
      : <>
          {filteredAppointments.length === 0 && allAppointments.length === 0 && calendarBlocks.length === 0 && (
            <EmptyState title="Agenda livre neste período" description="Não há atendimentos nem bloqueios. Selecione um horário livre na grade para iniciar um agendamento." />
          )}
          <CalendarGrid
            date={dateAtNoon(range.from)}
            view={view}
            barbers={visibleBarbers.map((barber) => ({ id: String(barber.id), name: barber.name }))}
            appointments={calendarAppointments}
            allAppointments={allCalendarAppointments}
            blocks={calendarBlocks}
            startHour={hours.startHour}
            endHour={hours.endHour}
            intervalMinutes={15}
            onSelectAppointment={(appointment) => setLocation(`/admin/agenda?ag=${encodeURIComponent(appointment.id)}`)}
            onSelectSlot={canWrite ? selectSlot : undefined}
            onMoveAppointment={canWrite ? moveAppointment : undefined}
          />
        </>
      }

      <ConfirmDialog
        open={pendingMove !== null}
        onOpenChange={(open) => {
          if (!open && !rescheduleMutation.isPending) setPendingMove(null);
        }}
        title="Confirmar remarcação"
        description={
          pendingMove ?
            `Mover ${pendingMove.appointment.customerName} de ${formatDateTime(pendingMove.appointment.start)} para ${formatDateTime(`${pendingMove.target.date}T${pendingMove.target.time}:00${FIXED_OFFSET}`)}${pendingTargetBarber ? ` com ${pendingTargetBarber.name}` : ''}?`
          : 'Confirme a alteração do horário.'
        }
        confirmLabel="Remarcar atendimento"
        pending={rescheduleMutation.isPending}
        onConfirm={confirmMove}
      />
      <CreateAppointmentDrawer
        open={canWrite && newAppointmentOverlay.isOpen}
        onOpenChange={(open) => {
          if (!open) newAppointmentOverlay.close();
        }}
      />
      <AppointmentDetailDrawer
        appointmentId={appointmentId}
        open={appointmentDetailOverlay.isOpen}
        onOpenChange={(open) => {
          if (!open) appointmentDetailOverlay.close();
        }}
      />
      <RescheduleAppointmentDialog
        appointmentId={actionAppointmentId}
        open={canWrite && rescheduleOverlay.isOpen}
        onOpenChange={(open) => {
          if (!open) setLocation('/admin/agenda');
        }}
      />
      <CancelAppointmentDialog
        appointmentId={actionAppointmentId}
        initialType={cancelInitialType}
        open={canWrite && cancelOverlay.isOpen}
        onOpenChange={(open) => {
          if (!open) setLocation('/admin/agenda');
        }}
      />
      <CreateTimeBlockDialog
        open={canWrite && timeBlockOverlay.isOpen}
        onOpenChange={(open) => {
          if (!open) setLocation('/admin/agenda');
        }}
        onRescheduleConflict={(id) => setLocation(`/admin/agenda?remarcar=1&appointmentId=${id}`)}
      />
    </div>
  );
}
