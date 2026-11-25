import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarClock, CircleDollarSign, FileText } from 'lucide-react';
import { Link } from 'wouter';
import type { FinanceBasis, FinanceSummaryFilters } from '@/modules/admin/finance/api/finance';
import { FinanceMetricCard, MonthlyFinanceChart, PaymentMethodChart, metricValue } from '@/modules/admin/finance/components/finance-charts';
import { useFinanceSummary } from '@/modules/admin/finance/hooks/use-finance';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { BUSINESS_TIME_ZONE } from '@/shared/lib/time';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';

type Period = 'month' | 'last30' | 'quarter' | 'custom';

function todayInSaoPaulo() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIME_ZONE }).format(new Date());
}

function shiftDate(date: string, days: number) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function initialDates() {
  const today = todayInSaoPaulo();
  return { from: `${today.slice(0, 7)}-01`, to: today };
}

function dateTimeBound(date: string, end = false) {
  return `${date}T${end ? '23:59:59.999' : '00:00:00.000'}-03:00`;
}

function previousRange(from: string, to: string) {
  const start = new Date(`${from}T12:00:00-03:00`).getTime();
  const end = new Date(`${to}T12:00:00-03:00`).getTime();
  const days = Math.round((end - start) / 86400000) + 1;
  return { from: shiftDate(from, -days), to: shiftDate(from, -1) };
}

export default function FinanceOverviewPage() {
  const [period, setPeriod] = useState<Period>('month');
  const [initial] = useState(initialDates);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [basis, setBasis] = useState<FinanceBasis>('cash');
  const validRange = Boolean(from && to && from <= to && to <= todayInSaoPaulo());
  const queryFrom = validRange ? from : initial.from;
  const queryTo = validRange ? to : initial.to;
  const filters = useMemo<FinanceSummaryFilters>(() => ({ from: dateTimeBound(queryFrom), to: dateTimeBound(queryTo, true), basis }), [basis, queryFrom, queryTo]);
  const summaryQuery = useFinanceSummary(filters);
  const summary = summaryQuery.data;

  useEffect(() => {
    document.title = 'Financeiro | Painel administrativo';
  }, []);

  function choosePeriod(value: string) {
    const today = todayInSaoPaulo();
    if (value === 'month') {
      setFrom(`${today.slice(0, 7)}-01`);
      setTo(today);
      setPeriod('month');
    } else if (value === 'last30') {
      setFrom(shiftDate(today, -29));
      setTo(today);
      setPeriod('last30');
    } else if (value === 'quarter') {
      const [year, month] = today.split('-').map(Number);
      const quarterStartMonth = Math.floor((month - 1) / 3) * 3 + 1;
      setFrom(`${year}-${String(quarterStartMonth).padStart(2, '0')}-01`);
      setTo(today);
      setPeriod('quarter');
    } else {
      setPeriod('custom');
    }
  }

  const prior = previousRange(from, to);
  const metricCards =
    summary ?
      [
        { title: 'Receita', key: 'revenueCents' as const, description: 'Comandas e recebimentos no período' },
        { title: 'Despesas', key: 'expensesCents' as const, description: 'Despesas consideradas no período', inverseTrend: true },
        { title: 'Lucro', key: 'profitCents' as const, description: 'Receita menos despesas', highlight: true },
        { title: 'Ticket médio', key: 'averageTicketCents' as const, description: `${summary.metrics.tabsCount} comandas fechadas` },
        { title: 'Comissões a pagar', key: 'commissionsToPayCents' as const, description: 'Saldo pendente de pagamento', inverseTrend: true },
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Financeiro"
        title="Visão geral"
        description="Uma leitura clara do que entrou, saiu e ainda está por pagar."
        actions={
          <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
            <Link href="/admin/financeiro/despesas">
              <FileText className="size-4" aria-hidden="true" />
              Despesas
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_minmax(12rem,0.7fr)_repeat(2,minmax(9rem,0.55fr))] md:items-end">
          <div className="space-y-2">
            <label htmlFor="finance-basis" className="text-sm font-medium">
              Regime de apuração
            </label>
            <Select value={basis} onValueChange={(value) => setBasis(value as FinanceBasis)}>
              <SelectTrigger id="finance-basis" className="min-h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Caixa · quando recebeu ou pagou</SelectItem>
                <SelectItem value="accrual">Competência · pela data do lançamento</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor="finance-period" className="text-sm font-medium">
              Período
            </label>
            <Select value={period} onValueChange={choosePeriod}>
              <SelectTrigger id="finance-period" className="min-h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="last30">Últimos 30 dias</SelectItem>
                <SelectItem value="quarter">Este trimestre</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor="finance-from" className="text-sm font-medium">
              De
            </label>
            <Input
              id="finance-from"
              type="date"
              value={from}
              max={to || todayInSaoPaulo()}
              className="min-h-11"
              onChange={(event) => {
                setFrom(event.target.value);
                setPeriod('custom');
              }}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="finance-to" className="text-sm font-medium">
              Até
            </label>
            <Input
              id="finance-to"
              type="date"
              value={to}
              min={from || undefined}
              max={todayInSaoPaulo()}
              className="min-h-11"
              onChange={(event) => {
                setTo(event.target.value);
                setPeriod('custom');
              }}
            />
          </div>
        </CardContent>
      </Card>

      {!validRange && (
        <p role="alert" className="text-sm text-destructive">
          Informe um período válido, até hoje.
        </p>
      )}
      {summaryQuery.isError && validRange ?
        <ErrorState title="Não foi possível carregar o resumo financeiro" description="Confira sua conexão e tente novamente." onRetry={() => void summaryQuery.refetch()} />
      : <>
          {summaryQuery.isPending || !validRange ?
            <section aria-label="Carregando indicadores financeiros" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[0, 1, 2, 3, 4].map((item) => (
                <Skeleton key={item} className="h-36 rounded-xl" />
              ))}
            </section>
          : summary ?
            <section aria-label="Indicadores financeiros" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {metricCards.map((item) => (
                <FinanceMetricCard
                  key={item.key}
                  title={item.title}
                  value={metricValue(summary.metrics, item.key)}
                  previousValue={metricValue(summary.previous, item.key)}
                  description={item.description}
                  highlight={item.highlight}
                  inverseTrend={item.inverseTrend}
                />
              ))}
            </section>
          : null}

          {summaryQuery.isPending || !validRange ?
            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.85fr)]" aria-label="Carregando gráficos financeiros">
              <Skeleton className="h-[25rem] rounded-xl" />
              <Skeleton className="h-[25rem] rounded-xl" />
            </section>
          : summary ?
            <>
              {summary.monthly.length === 0 && summary.paymentMethods.length === 0 && summary.metrics.tabsCount === 0 && summary.metrics.expensesCents === 0 && (
                <div className="rounded-xl border border-dashed border-border bg-card/60 py-2">
                  <EmptyState
                    title="Ainda não há movimentações"
                    description="Quando houver comandas fechadas ou despesas no período, você verá os resultados por aqui."
                    icon={<CircleDollarSign className="size-8" />}
                  />
                </div>
              )}
              <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.85fr)]">
                <MonthlyFinanceChart monthly={summary.monthly} />
                <PaymentMethodChart paymentMethods={summary.paymentMethods} />
              </section>
              <Card className="border-primary/20 bg-primary/[0.04]">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <CalendarClock className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">Comparação com o período anterior</p>
                    <p className="text-sm text-muted-foreground">
                      {prior.from.split('-').reverse().join('/')} a {prior.to.split('-').reverse().join('/')} · mesmos dias de duração
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">As variações aparecem em cada indicador.</p>
                </CardContent>
              </Card>
            </>
          : null}
        </>
      }
    </div>
  );
}
