import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, CircleDollarSign, LoaderCircle } from 'lucide-react';
import { useCommissionSummary, useSettleCommissionPeriod } from '@/modules/admin/commissions/hooks/use-commissions';
import type { CommissionFilters } from '@/modules/admin/commissions/api/commissions';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { formatBRL, formatDateTime } from '@/shared/lib/format';
import { BUSINESS_TIME_ZONE } from '@/shared/lib/time';
import { useCan } from '@/shared/hooks/use-can';
import { useSessionStore } from '@/shared/stores/session-store';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

const pageSize = 20;
const monthFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIME_ZONE, year: 'numeric', month: '2-digit' });
const commissionKindLabels = { service: 'Serviço', product: 'Produto' };

function monthRange(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return { from: `${month}-01T00:00:00.000-03:00`, to: `${month}-${String(daysInMonth).padStart(2, '0')}T23:59:59.999-03:00` };
}

function monthLabel(month: string) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: BUSINESS_TIME_ZONE }).format(new Date(`${month}-01T12:00:00-03:00`));
}

export default function CommissionsPage() {
  const user = useSessionStore((state) => state.user);
  const canManage = useCan('team.manage');
  const isBarber = user?.role === 'barber';
  const [month, setMonth] = useState(() => monthFormatter.format(new Date()));
  const [status, setStatus] = useState<CommissionFilters['status']>('all');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const range = useMemo(() => monthRange(month), [month]);
  const filters: CommissionFilters = { from: range.from, to: range.to, status, page, pageSize };
  const summaryQuery = useCommissionSummary(filters, isBarber);
  const settleMutation = useSettleCommissionPeriod();
  const summary = summaryQuery.data;

  useEffect(() => {
    document.title = 'Comissões | Painel administrativo';
  }, []);

  async function settle(barberId: number) {
    await settleMutation.mutateAsync({ barberId, ...range, periodLabel: monthLabel(month) });
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Equipe" title="Comissões" description="Confira os valores registrados no fechamento das comandas e acompanhe os pagamentos." />

      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.5fr)] sm:items-end">
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Período</span>
            <input
              type="month"
              className="min-h-11 w-full rounded-md border border-input bg-background px-3"
              value={month}
              onChange={(event) => {
                setMonth(event.target.value);
                setPage(1);
                setExpandedId(null);
              }}
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Status</span>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as CommissionFilters['status']);
                setPage(1);
                setExpandedId(null);
              }}
            >
              <SelectTrigger className="min-h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
              </SelectContent>
            </Select>
          </label>
        </CardContent>
      </Card>

      <section className="space-y-3" aria-label="Resumo por profissional">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold">Resumo por profissional</h2>
            <p className="text-sm text-muted-foreground capitalize">{monthLabel(month)}</p>
          </div>
          {summary && <Badge variant="outline">{summary.totals.length} profissionais</Badge>}
        </div>
        {summaryQuery.isError ?
          <ErrorState title="Não foi possível carregar as comissões" onRetry={() => void summaryQuery.refetch()} />
        : summaryQuery.isPending ?
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Carregando comissões">
            {[1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-52 rounded-xl" />
            ))}
          </div>
        : summary?.totals.length ?
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {summary.totals.map((total) => (
              <Card key={total.barberId}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between gap-3 text-lg">
                    <span className="truncate">{total.barberName}</span>
                    <CircleDollarSign className="size-5 shrink-0 text-primary" aria-hidden="true" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                    <dt className="text-muted-foreground">Serviços</dt>
                    <dd className="text-right tabular-nums">{formatBRL(total.servicesCents)}</dd>
                    <dt className="text-muted-foreground">Produtos</dt>
                    <dd className="text-right tabular-nums">{formatBRL(total.productsCents)}</dd>
                    <dt className="text-muted-foreground">Gorjetas · sem comissão</dt>
                    <dd className="text-right tabular-nums">{formatBRL(total.tipsCents)}</dd>
                    <dt className="text-muted-foreground">Estornos</dt>
                    <dd className="text-right tabular-nums">{formatBRL(total.refundsCents)}</dd>
                    <dt className="border-t border-border pt-2 font-medium">Total líquido</dt>
                    <dd className="border-t border-border pt-2 text-right font-medium tabular-nums">{formatBRL(total.totalCents)}</dd>
                    <dt className="font-semibold">A pagar</dt>
                    <dd className="text-right font-semibold tabular-nums">{formatBRL(total.toPayCents)}</dd>
                  </dl>
                  {canManage && !isBarber && status !== 'paid' && (
                    <Button type="button" variant="outline" className="min-h-11 w-full" disabled={total.pendingCents <= 0 || settleMutation.isPending} onClick={() => void settle(total.barberId)}>
                      {settleMutation.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                      Marcar período como pago
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        : <EmptyState title="Sem comissões no período" description="Comissões aparecem aqui depois que uma comanda é fechada." icon={<CircleDollarSign className="size-8" />} />}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Detalhe por atendimento</CardTitle>
          <p className="text-sm text-muted-foreground">Os valores de comissão são fotografados no fechamento da comanda; gorjetas não entram no cálculo.</p>
        </CardHeader>
        <CardContent>
          {summaryQuery.isError ?
            <ErrorState title="Não foi possível carregar os atendimentos" onRetry={() => void summaryQuery.refetch()} />
          : summaryQuery.isPending ?
            <Skeleton className="h-48 rounded-xl" />
          : summary?.commissions.length ?
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    {!isBarber && <TableHead>Profissional</TableHead>}
                    <TableHead>Tipo</TableHead>
                    <TableHead>Comissão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>
                      <span className="sr-only">Detalhes</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.commissions.map((commission) => (
                    <>
                      <TableRow key={commission.id}>
                        <TableCell>{formatDateTime(commission.closedAt)}</TableCell>
                        {!isBarber && <TableCell>{commission.barberName}</TableCell>}
                        <TableCell>{commissionKindLabels[commission.kind]}</TableCell>
                        <TableCell className="font-medium tabular-nums">{formatBRL(commission.amountCents)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              commission.status === 'paid' ? 'secondary'
                              : commission.status === 'void' ?
                                'destructive'
                              : 'outline'
                            }
                          >
                            {commission.status === 'paid' ?
                              'Pago'
                            : commission.status === 'void' ?
                              'Estornado'
                            : 'Pendente'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-10"
                            aria-label={`Detalhes da comissão ${commission.id}`}
                            onClick={() => setExpandedId((current) => (current === commission.id ? null : commission.id))}
                          >
                            {expandedId === commission.id ?
                              <ChevronDown className="size-4" />
                            : <ChevronRight className="size-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expandedId === commission.id && (
                        <TableRow key={`${commission.id}-details`} className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={isBarber ? 5 : 6}>
                            <dl className="grid gap-x-6 gap-y-1 py-2 text-sm sm:grid-cols-3">
                              <div>
                                <dt className="text-muted-foreground">Comanda</dt>
                                <dd>#{commission.tabId}</dd>
                              </div>
                              <div>
                                <dt className="text-muted-foreground">Atendimento</dt>
                                <dd>{commission.appointmentId ? `#${commission.appointmentId}` : 'Venda avulsa'}</dd>
                              </div>
                              <div>
                                <dt className="text-muted-foreground">Base × percentual</dt>
                                <dd>
                                  {formatBRL(commission.baseCents)} × {commission.pct}%
                                </dd>
                              </div>
                            </dl>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  {summary.pagination.total} registros · página {summary.pagination.page} de {summary.pagination.pageCount}
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="min-h-11" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    disabled={page >= summary.pagination.pageCount}
                    onClick={() => setPage((value) => Math.min(summary.pagination.pageCount, value + 1))}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </>
          : <EmptyState title="Nenhum atendimento neste filtro" description="Ajuste o período ou o status para consultar outros registros." icon={<CircleDollarSign className="size-8" />} />}
        </CardContent>
      </Card>
    </div>
  );
}
