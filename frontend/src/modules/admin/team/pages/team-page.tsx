import { useEffect, useMemo } from 'react';
import { Link } from 'wouter';
import { ArrowRight, Clock3, Plus, UsersRound } from 'lucide-react';
import { useTeamWeek } from '@/modules/admin/team/hooks/use-team';
import type { TeamBarber, TeamSchedule, TeamWeekAppointment } from '@/modules/admin/team/api/team';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { formatDate, formatDuration } from '@/shared/lib/format';
import { BUSINESS_TIME_ZONE } from '@/shared/lib/time';
import { useSessionStore } from '@/shared/stores/session-store';
import { useCan } from '@/shared/hooks/use-can';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Progress } from '@/shared/ui/progress';
import { Skeleton } from '@/shared/ui/skeleton';

function currentWeek() {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIME_ZONE }).format(new Date());
  const [year, month, day] = today.split('-').map(Number);
  const todayDate = new Date(Date.UTC(year, month - 1, day, 12));
  const mondayOffset = (todayDate.getUTCDay() + 6) % 7;
  const monday = new Date(todayDate);
  monday.setUTCDate(monday.getUTCDate() - mondayOffset);
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  return { from: monday.toISOString().slice(0, 10), to: sunday.toISOString().slice(0, 10) };
}

function dateForWeekday(monday: string, offset: number) {
  const [year, month, day] = monday.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + offset, 12));
  return { date: date.toISOString().slice(0, 10), weekday: date.getUTCDay() };
}

function minutes(value: string) {
  const [hours, mins] = value.split(':').map(Number);
  return hours * 60 + mins;
}

function availableMinutesForWeek(barberId: number, monday: string, schedules: TeamSchedule[]) {
  return Array.from({ length: 7 }, (_, offset) => {
    const { weekday } = dateForWeekday(monday, offset);
    return schedules
      .filter((schedule) => schedule.barberId === barberId && schedule.weekday === weekday)
      .reduce((sum, schedule) => {
        const work = schedule.ranges.reduce((total, range) => total + Math.max(0, minutes(range.end) - minutes(range.start)), 0);
        const breaks = schedule.breaks.reduce((total, range) => total + Math.max(0, minutes(range.end) - minutes(range.start)), 0);
        return sum + Math.max(0, work - breaks);
      }, 0);
  }).reduce((sum, value) => sum + value, 0);
}

function occupiedMinutesForWeek(barberId: number, appointments: TeamWeekAppointment[]) {
  return appointments
    .filter((appointment) => appointment.barberId === barberId && !['canceled', 'no_show'].includes(appointment.status))
    .reduce((sum, appointment) => sum + Math.max(0, Number(appointment.durationMin) || 0), 0);
}

function BarberCard({ barber, occupancy, availableMinutes, occupiedMinutes }: { barber: TeamBarber; occupancy: number | null; availableMinutes: number; occupiedMinutes: number }) {
  const initials = barber.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  return (
    <Card className="h-full">
      <CardContent className="space-y-5 p-4 sm:p-5">
        <div className="flex items-start gap-4">
          <Avatar size="lg" className="size-14">
            {barber.photo && <AvatarImage src={barber.photo} alt="" />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold">{barber.name}</h2>
            <Badge variant={barber.active ? 'default' : 'secondary'} className="mt-1">
              {barber.active ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
          {useCan('team.write') && (
            <Button asChild variant="ghost" size="icon" className="size-11 shrink-0" aria-label={`Abrir perfil de ${barber.name}`}>
              <Link href={`/admin/equipe/${barber.id}`}>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          )}
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Especialidades</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {barber.specialties.length ?
              barber.specialties.map((specialty) => (
                <Badge key={specialty} variant="outline">
                  {specialty}
                </Badge>
              ))
            : <span className="text-sm text-muted-foreground">Não informadas</span>}
          </div>
        </div>

        <div className="space-y-2 border-t border-border pt-4">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 font-medium">
              <Clock3 className="size-4 text-primary" aria-hidden="true" />
              Ocupação da semana
            </span>
            <span className="font-semibold tabular-nums">{occupancy === null ? 'Sem escala' : `${occupancy}%`}</span>
          </div>
          <Progress value={occupancy ?? 0} aria-label={occupancy === null ? 'Sem escala cadastrada' : `${occupancy}% da escala ocupada`} />
          <p className="text-xs text-muted-foreground">
            {availableMinutes > 0 ? `${formatDuration(occupiedMinutes)} reservados de ${formatDuration(availableMinutes)}` : 'Cadastre uma escala para calcular a ocupação.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TeamPage() {
  const user = useSessionStore((state) => state.user);
  const week = useMemo(currentWeek, []);
  const teamQuery = useTeamWeek(week.from, week.to);
  const isBarber = user?.role === 'barber';
  const canWriteTeam = useCan('team.write');
  const barbers = teamQuery.data?.barbers ?? [];
  const schedules = teamQuery.data?.schedules ?? [];
  const appointments = teamQuery.data?.appointments ?? [];

  useEffect(() => {
    document.title = 'Profissionais | Painel administrativo';
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Painel administrativo"
        title={isBarber ? 'Meu perfil profissional' : 'Profissionais'}
        description={`${formatDate(week.from)} a ${formatDate(week.to)} · equipe, especialidades e ocupação.`}
        actions={
          !isBarber && canWriteTeam ?
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
                <Link href="/admin/equipe?folga=1">Folgas e férias</Link>
              </Button>
              <Button asChild className="min-h-11 w-full sm:w-auto">
                <Link href="/admin/equipe/novo">
                  <Plus className="size-4" />
                  Novo profissional
                </Link>
              </Button>
            </div>
          : undefined
        }
      />

      {teamQuery.isError ?
        <ErrorState title="Não foi possível carregar a equipe" description="Confira sua conexão e tente novamente." onRetry={() => void teamQuery.refetch()} />
      : teamQuery.isPending ?
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Carregando equipe">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-64 rounded-xl" />
          ))}
        </div>
      : barbers.length ?
        <section aria-label={isBarber ? 'Meu perfil profissional' : 'Profissionais da equipe'} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {barbers.map((barber) => {
            const availableMinutes = availableMinutesForWeek(barber.id, week.from, schedules);
            const occupiedMinutes = occupiedMinutesForWeek(barber.id, appointments);
            const occupancy = availableMinutes ? Math.round((occupiedMinutes / availableMinutes) * 100) : null;
            return <BarberCard key={barber.id} barber={barber} occupancy={occupancy} availableMinutes={availableMinutes} occupiedMinutes={occupiedMinutes} />;
          })}
        </section>
      : <EmptyState
          title={isBarber ? 'Perfil profissional não encontrado' : 'Nenhum profissional cadastrado'}
          description={isBarber ? 'Peça à administração para vincular seu perfil à equipe.' : 'Cadastre um profissional para organizar a agenda e acompanhar a ocupação.'}
          icon={<UsersRound className="size-8" />}
          actionLabel={!isBarber && canWriteTeam ? 'Novo profissional' : undefined}
          onAction={!isBarber && canWriteTeam ? () => window.location.assign('/admin/equipe/novo') : undefined}
        />
      }
    </div>
  );
}
