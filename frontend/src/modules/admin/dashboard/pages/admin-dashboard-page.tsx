import { useEffect } from 'react';

import { useAdminDashboard } from '@/modules/admin/dashboard/hooks/use-admin-dashboard';

import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { RenderComponent } from '@/shared/components/render-component';
import { StatusBadge } from '@/shared/components/status-badge';
import { useCan } from '@/shared/hooks/use-can';
import { formatBRL, formatDate, formatDateTime, shiftDate } from '@/shared/lib/format';
import { BUSINESS_TIME_ZONE } from '@/shared/lib/time';
import { sessionStore } from '@/shared/stores/session-store';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';

import {
  AlertTriangle,
  Award,
  CalendarCheck2,
  CalendarDays,
  CalendarRange,
  Clock3,
  Gauge,
  TicketCheck,
  UserPlus,
  UserRoundX,
  Wallet,
} from 'lucide-react';
import { reaction } from 'mobx';
import { Observer, useLocalObservable } from 'mobx-react-lite';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link } from 'wouter';

function todayInBusinessTimeZone() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIME_ZONE }).format(new Date());
}

const statusLabels: Record<string, string> = { pending: 'agendado', confirmed: 'confirmado', checked_in: 'aguardando', in_service: 'em_atendimento' };

function initialPeriod() {
  const today = todayInBusinessTimeZone();
  return { from: `${today.slice(0, 7)}-01`, to: today };
}

interface Card {
  icon: any;
  title: string;
  value: string;
  description: string;
}

export default function AdminDashboardPage() {
  const canReadCatalog = useCan('catalog.read');
  const filters = useLocalObservable(() => {
    const { from, to } = initialPeriod();

    return {
      from: from,
      to: to,
      get validRange() {
        return Boolean(this.from && this.to && this.from <= this.to);
      },
      setTo(value: string) {
        this.to = value;
      },
      setFrom(value: string) {
        this.from = value;
      },
    };
  });

  const store = useLocalObservable(() => ({
    period: 'month',
    isBarber: false,
    cards: [] as Card[],
    setIsBarber(value: boolean) {
      this.isBarber = value;
    },
    setCards(value: Card[]) {
      this.cards = value;
    },
    setPeriod(value: string) {
      this.period = value;
    },
  }));

  const dashboardQuery = useAdminDashboard(filters);

  useEffect(() => {
    const dispose = reaction(
      () => sessionStore.user,
      (user) => store.setIsBarber(user?.role === 'barber'),
    );

    return () => dispose();
  }, [store]);

  useEffect(() => {
    const dispose = reaction(
      () => dashboardQuery.dashboard,
      (dashboard) => {
        const metrics = dashboard?.metrics;

        store.setCards([
          {
            title: 'Faturamento hoje',
            value: metrics ? formatBRL(metrics.revenueTodayCents) : '',
            description: 'Comandas fechadas hoje',
            icon: Wallet,
          },
          {
            title: 'Faturamento no mês',
            value: metrics ? formatBRL(metrics.revenueMonthCents) : '',
            description: 'Comandas fechadas neste mês',
            icon: CalendarRange,
          },
          {
            title: 'Atendimentos hoje',
            value: metrics ? String(metrics.appointmentsToday) : '',
            description: 'Sem cancelamentos ou ausências',
            icon: CalendarCheck2,
          },
          {
            title: 'Ocupação da agenda',
            value: metrics?.occupancyPct === null || metrics?.occupancyPct === undefined ? '—' : `${metrics.occupancyPct.toLocaleString('pt-BR')}%`,
            description: metrics?.occupancyPct === null ? 'Sem horários de trabalho cadastrados' : 'No período selecionado',
            icon: Gauge,
          },
          {
            title: 'Ticket médio',
            value: metrics ? formatBRL(metrics.averageTicketCents) : '',
            description: 'Por comanda fechada no período',
            icon: TicketCheck,
          },
          {
            title: 'Novos clientes',
            value: metrics ? String(metrics.newCustomers) : '',
            description: 'Cadastros no período selecionado',
            icon: UserPlus,
          },
          { title: 'No-shows', value: metrics ? String(metrics.noShows) : '', description: 'No período selecionado', icon: UserRoundX },
        ]);
      },
    );

    return () => dispose();
  }, [dashboardQuery, store]);

  function selectPeriod(value: string) {
    const today = todayInBusinessTimeZone();
    if (value === 'today') {
      filters.setFrom(today);
      filters.setTo(today);
      store.setPeriod('today');
    } else if (value === 'month') {
      filters.setFrom(`${today.slice(0, 7)}-01`);
      filters.setTo(today);
      store.setPeriod('month');
    } else if (value === 'last30') {
      filters.setFrom(shiftDate(today, -29));
      filters.setTo(today);
      store.setPeriod('last30');
    } else {
      store.setPeriod('custom');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Painel administrativo" title="Visão geral" description="Acompanhe o desempenho da barbearia e os próximos atendimentos." />

      <Observer>
        {() => (
          <RenderComponent condition={canReadCatalog && Boolean(dashboardQuery.dashboard?.inventoryAlerts.length)}>
            <section role="alert" aria-label="Alerta de estoque baixo" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <AlertTriangle className="size-5 shrink-0 text-destructive" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-destructive">
                    {dashboardQuery.dashboard?.inventoryAlerts.length} produto(s) abaixo do estoque mínimo
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {dashboardQuery.dashboard?.inventoryAlerts.slice(0, 5).map((item) => (
                      <li key={item.id}>
                        {item.name}: {item.stock} (mín. {item.minStock})
                      </li>
                    ))}
                    <RenderComponent condition={(dashboardQuery.dashboard?.inventoryAlerts.length ?? 0) > 5}>
                      <li>e mais {(dashboardQuery.dashboard?.inventoryAlerts.length ?? 0) - 5}</li>
                    </RenderComponent>
                  </ul>
                </div>
                <Button asChild variant="outline" className="min-h-11">
                  <Link href="/admin/produtos">Ver produtos</Link>
                </Button>
              </div>
            </section>
          </RenderComponent>
        )}
      </Observer>

      <section
        aria-label="Filtro de período"
        className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-[minmax(12rem,0.7fr)_1fr] sm:items-end"
      >
        <div className="space-y-2">
          <Label htmlFor="dashboard-period">Período</Label>
          <Observer>
            {() => (
              <Select value={store.period} onValueChange={selectPeriod}>
                <SelectTrigger id="dashboard-period" className="min-h-11 w-full">
                  <SelectValue placeholder="Escolha o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="month">Este mês</SelectItem>
                  <SelectItem value="last30">Últimos 30 dias</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            )}
          </Observer>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="dashboard-from">De</Label>
            <Observer>
              {() => (
                <Input
                  id="dashboard-from"
                  type="date"
                  value={filters.from}
                  max={filters.to || undefined}
                  className="min-h-11"
                  onChange={(event) => {
                    store.setPeriod('custom');
                    filters.setFrom(event.target.value);
                  }}
                />
              )}
            </Observer>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dashboard-to">Até</Label>
            <Observer>
              {() => (
                <Input
                  id="dashboard-to"
                  type="date"
                  value={filters.to}
                  min={filters.from || undefined}
                  max={todayInBusinessTimeZone()}
                  className="min-h-11"
                  onChange={(event) => {
                    store.setPeriod('custom');
                    filters.setTo(event.target.value);
                  }}
                />
              )}
            </Observer>
          </div>
        </div>
      </section>

      <Observer>
        {() => (
          <RenderComponent condition={!filters.validRange}>
            <p role="alert" className="text-sm text-destructive">
              A data inicial precisa ser anterior ou igual à data final.
            </p>
          </RenderComponent>
        )}
      </Observer>

      <Observer>
        {() => (
          <RenderComponent condition={dashboardQuery.isError && filters.validRange}>
            <ErrorState
              title="Não foi possível carregar o dashboard"
              description="Confira sua conexão e tente carregar os dados novamente."
              onRetry={() => void dashboardQuery.queryResult.refetch()}
            />
          </RenderComponent>
        )}
      </Observer>

      <Observer>
        {() => (
          <RenderComponent condition={!(dashboardQuery.isError && filters.validRange)}>
            <section aria-label="Indicadores da operação" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {store.cards.map(({ title, value, description, icon: Icon }) => (
                <Card key={title} className="min-w-0">
                  <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
                    <div className="space-y-1">
                      <CardDescription>{title}</CardDescription>
                      <RenderComponent condition={dashboardQuery.isPending || !filters.validRange}>
                        <Skeleton className="h-8 w-28" aria-label={`Carregando ${title.toLowerCase()}`} />
                      </RenderComponent>

                      <RenderComponent condition={!(dashboardQuery.isPending || !filters.validRange)}>
                        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
                      </RenderComponent>
                    </div>
                    <span className="rounded-lg bg-primary/10 p-2 text-primary">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                  </CardHeader>
                  <CardContent>
                    <RenderComponent condition={dashboardQuery.isPending || !filters.validRange}>
                      <Skeleton className="h-4 w-36" />
                    </RenderComponent>

                    <RenderComponent condition={!(dashboardQuery.isPending || !filters.validRange)}>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </RenderComponent>
                  </CardContent>
                </Card>
              ))}
            </section>

            <RenderComponent condition={dashboardQuery.isPending || !filters.validRange}>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]">
                <Skeleton className="h-88 rounded-xl" aria-label="Carregando gráfico de faturamento" />
                <Skeleton className="h-88 rounded-xl" aria-label="Carregando ranking de barbeiros" />
              </div>
            </RenderComponent>

            <RenderComponent condition={!(dashboardQuery.isPending || !filters.validRange)}>
              <RenderComponent condition={dashboardQuery.dashboard}>
                <section className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]">
                  <Card className="min-w-0">
                    <CardHeader>
                      <CardTitle>Faturamento por dia</CardTitle>
                      <CardDescription>
                        {formatDate(dashboardQuery.dashboard?.from || '', "dd 'de' MMM")} a{' '}
                        {formatDate(dashboardQuery.dashboard?.to || '', "dd 'de' MMMM 'de' yyyy")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <RenderComponent condition={dashboardQuery.dashboard?.revenueByDay.every((day) => day.revenueCents === 0)}>
                        <div className="flex min-h-68 items-center justify-center">
                          <EmptyState title="Sem faturamento no período" description="As comandas fechadas aparecerão aqui." />
                        </div>
                      </RenderComponent>

                      <RenderComponent condition={!dashboardQuery.dashboard?.revenueByDay.every((day) => day.revenueCents === 0)}>
                        <div className="h-68 w-full" role="img" aria-label="Gráfico de faturamento por dia">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dashboardQuery.dashboard?.revenueByDay} margin={{ top: 8, right: 12, left: 6, bottom: 4 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="date" tickFormatter={(value) => formatDate(String(value), 'dd/MM')} minTickGap={12} />
                              <YAxis width={86} tickFormatter={(value) => formatBRL(Number(value))} />
                              <Tooltip
                                labelFormatter={(value) => formatDate(String(value), "dd 'de' MMMM")}
                                formatter={(value) => [formatBRL(Number(value)), 'Faturamento']}
                              />
                              <Bar dataKey="revenueCents" name="Faturamento" fill="var(--primary)" radius={[5, 5, 0, 0]} maxBarSize={44} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </RenderComponent>
                    </CardContent>
                  </Card>

                  <Card className="min-w-0">
                    <CardHeader>
                      <CardTitle>{store.isBarber ? 'Meu desempenho' : 'Ranking de barbeiros'}</CardTitle>

                      <CardDescription>Faturamento e atendimentos no período</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <RenderComponent condition={dashboardQuery.dashboard?.barberRanking.length}>
                        <ol className="space-y-3">
                          {dashboardQuery.dashboard?.barberRanking.map((barber, index) => (
                            <li key={barber.barberId} className="flex items-center gap-3 rounded-lg border border-border p-3">
                              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <RenderComponent condition={index === 0}>
                                  <Award className="size-4" aria-label="Primeiro lugar" />
                                </RenderComponent>

                                <RenderComponent condition={index !== 0}>
                                  <span className="text-sm font-semibold tabular-nums">{index + 1}</span>
                                </RenderComponent>
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">{barber.name}</p>
                                <p className="text-xs text-muted-foreground">{barber.appointmentsCount} atendimentos</p>
                              </div>
                              <p className="shrink-0 text-sm font-semibold tabular-nums">{formatBRL(barber.revenueCents)}</p>
                            </li>
                          ))}
                        </ol>
                      </RenderComponent>

                      <RenderComponent condition={!dashboardQuery.dashboard?.barberRanking.length}>
                        <EmptyState title="Sem dados de barbeiros" description="Não há atendimentos ou faturamento no período." />
                      </RenderComponent>
                    </CardContent>
                  </Card>
                </section>
              </RenderComponent>
            </RenderComponent>

            <RenderComponent condition={dashboardQuery.isPending || !filters.validRange}>
              <Skeleton className="h-64 rounded-xl" aria-label="Carregando próximos atendimentos" />
            </RenderComponent>

            <RenderComponent condition={!(dashboardQuery.isPending || !filters.validRange)}>
              <RenderComponent condition={dashboardQuery.dashboard}>
                <Card>
                  <CardHeader>
                    <CardTitle>Próximos atendimentos</CardTitle>
                    <CardDescription>Os horários que vêm a seguir</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RenderComponent condition={dashboardQuery.dashboard?.upcomingAppointments.length}>
                      <ul className="divide-y divide-border">
                        {dashboardQuery.dashboard?.upcomingAppointments.map((appointment) => (
                          <li
                            key={appointment.id}
                            className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(9rem,0.7fr)_minmax(0,1.5fr)_minmax(0,1fr)_auto] sm:items-center"
                          >
                            <div className="flex items-center gap-2 text-sm font-semibold">
                              <Clock3 className="size-4 shrink-0 text-primary" aria-hidden="true" />
                              <time dateTime={appointment.start}>{formatDateTime(appointment.start)}</time>
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{appointment.customerName}</p>
                              <p className="truncate text-sm text-muted-foreground">
                                {appointment.serviceNames.join(' · ') || 'Serviços não informados'}
                              </p>
                            </div>
                            <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                              <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
                              <span className="truncate">{store.isBarber ? 'Seu atendimento' : appointment.barberName}</span>
                            </div>
                            <StatusBadge kind="appointment" status={statusLabels[appointment.status] ?? appointment.status} />
                          </li>
                        ))}
                      </ul>
                    </RenderComponent>

                    <RenderComponent condition={!dashboardQuery.dashboard?.upcomingAppointments.length}>
                      <EmptyState title="Nenhum próximo atendimento" description="Os próximos horários confirmados aparecerão aqui." />
                    </RenderComponent>
                  </CardContent>
                </Card>
              </RenderComponent>
            </RenderComponent>
          </RenderComponent>
        )}
      </Observer>
    </div>
  );
}
