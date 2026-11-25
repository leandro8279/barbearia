import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { CalendarDays, ChevronLeft, ChevronRight, Scissors, UserRound } from 'lucide-react';
import { useAccountAppointments, useAccountBarbers } from '@/modules/account/hooks/use-account-data';
import { useRepeatAppointment } from '@/modules/account/hooks/use-repeat-appointment';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { StatusBadge, type AppointmentStatus } from '@/shared/components/status-badge';
import { formatBRL, formatDateTime } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { AppointmentActionOverlays } from '@/modules/account/components/appointment-action-overlays';
import type { AppointmentListView, CustomerAppointment } from '@/modules/account/api/appointments';

const PAGE_SIZE = 8;
const views: Array<{ value: AppointmentListView; label: string }> = [
  { value: 'upcoming', label: 'Próximos' },
  { value: 'past', label: 'Passados' },
  { value: 'canceled', label: 'Cancelados' },
];

const apiStatusLabels: Record<string, AppointmentStatus> = {
  pending: 'agendado',
  confirmed: 'confirmado',
  checked_in: 'aguardando',
  in_service: 'em_atendimento',
  done: 'concluido',
  canceled: 'cancelado',
  no_show: 'no_show',
};

export default function AccountAppointmentsPage() {
  const [, navigate] = useLocation();
  const [view, setView] = useState<AppointmentListView>('upcoming');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const appointmentsQuery = useAccountAppointments({ view, page, limit: PAGE_SIZE, from: from || undefined, to: to || undefined }, !from || !to || from <= to);
  const barbersQuery = useAccountBarbers();
  const repeatAppointment = useRepeatAppointment();
  const invalidRange = Boolean(from && to && from > to);
  const result = appointmentsQuery.data;
  const total = result?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);
  const appointmentCards = (result?.items ?? []).map((appointment) => renderAppointment(appointment, view, barbersQuery.data ?? [], repeatAppointment));

  useEffect(() => {
    document.title = 'Meus agendamentos | Barbearia';
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) {
      description = document.createElement('meta');
      description.name = 'description';
      document.head.append(description);
    }
    description.content = 'Consulte seus próximos horários, atendimentos passados e cancelamentos.';
  }, []);

  const resultContent =
    invalidRange ?
      <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        A data inicial precisa ser anterior ou igual à data final.
      </p>
    : appointmentsQuery.isPending || (barbersQuery.isPending && !result) ?
      <div className="space-y-3" aria-label="Carregando seus agendamentos">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-36 rounded-xl" />
        ))}
      </div>
    : appointmentsQuery.isError ? <ErrorState title="Não foi possível carregar os agendamentos" description="Confira sua conexão e tente novamente." onRetry={() => void appointmentsQuery.refetch()} />
    : total === 0 ?
      <EmptyState
        title={
          view === 'upcoming' ? 'Nenhum próximo agendamento'
          : view === 'past' ?
            'Nenhum atendimento passado'
          : 'Nenhum agendamento cancelado'
        }
        description={view === 'upcoming' ? 'Quando você reservar um horário, ele aparecerá aqui.' : 'Não há agendamentos neste período.'}
        actionLabel={view === 'upcoming' ? 'Agendar horário' : undefined}
        onAction={view === 'upcoming' ? () => navigate('/agendar') : undefined}
      />
    : <div className="space-y-4">
        <div className="space-y-3">{appointmentCards}</div>
        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Mostrando {rangeStart}–{rangeEnd} de {total}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="min-h-11" disabled={page <= 1 || appointmentsQuery.isFetching} onClick={() => setPage((value) => Math.max(1, value - 1))}>
              <ChevronLeft aria-hidden="true" />
              Anterior
            </Button>
            <span className="min-w-20 text-center text-sm" aria-label={`Página ${page} de ${totalPages}`}>
              {page} / {totalPages}
            </span>
            <Button variant="outline" className="min-h-11" disabled={page >= totalPages || appointmentsQuery.isFetching} onClick={() => setPage((value) => value + 1)}>
              Próxima
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Minha conta"
        title="Meus agendamentos"
        description="Acompanhe seus próximos horários e consulte seu histórico."
        actions={
          <Button asChild className="min-h-11">
            <Link href="/agendar">
              <CalendarDays aria-hidden="true" />
              Agendar novamente
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <div className="space-y-2">
            <Label htmlFor="appointments-from">De</Label>
            <Input
              id="appointments-from"
              type="date"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value);
                setPage(1);
              }}
              className="min-h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="appointments-to">Até</Label>
            <Input
              id="appointments-to"
              type="date"
              value={to}
              onChange={(event) => {
                setTo(event.target.value);
                setPage(1);
              }}
              className="min-h-11"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs
        value={view}
        onValueChange={(value) => {
          if (value === 'upcoming' || value === 'past' || value === 'canceled') {
            setView(value);
            setPage(1);
          }
        }}
      >
        <TabsList className="grid h-auto w-full grid-cols-3 sm:w-[28rem]">
          {views.map((item) => (
            <TabsTrigger key={item.value} value={item.value} className="min-h-11">
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {views.map((item) => (
          <TabsContent key={item.value} value={item.value} className="mt-5">
            {resultContent}
          </TabsContent>
        ))}
      </Tabs>
      <AppointmentActionOverlays />
    </div>
  );
}

function renderAppointment(appointment: CustomerAppointment, view: AppointmentListView, barbers: Array<{ id: number; name: string }>, repeatAppointment: (appointment: CustomerAppointment) => void) {
  const barber = barbers.find((item) => item.id === appointment.barberId)?.name ?? 'Profissional';
  const services = appointment.items.map((item) => item.name).filter(Boolean);
  const status = apiStatusLabels[appointment.status] ?? appointment.status.replaceAll('_', ' ');

  return (
    <Card key={appointment.id} className="shadow-sm">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{formatDateTime(appointment.start)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Código {appointment.code}</p>
          </div>
          <StatusBadge kind="appointment" status={status} />
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <p className="flex items-start gap-2">
            <UserRound className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              <span className="text-muted-foreground">Barbeiro: </span>
              {barber}
            </span>
          </p>
          <p className="flex items-start gap-2">
            <Scissors className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              <span className="text-muted-foreground">Serviços: </span>
              {services.length ? services.join(' · ') : 'Não informados'}
            </span>
          </p>
        </div>
        <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium">Total {formatBRL(appointment.total)}</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="min-h-11">
              <Link href={`/conta/agendamentos/${appointment.id}`}>Ver detalhes</Link>
            </Button>
            {view === 'past' && (
              <Button variant="outline" className="min-h-11" onClick={() => repeatAppointment(appointment)}>
                <CalendarDays aria-hidden="true" />
                Agendar novamente
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
