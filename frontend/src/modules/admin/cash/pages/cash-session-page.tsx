import {useEffect, useState} from 'react'
import {zodResolver} from '@hookform/resolvers/zod'
import {useForm} from 'react-hook-form'
import {Link} from 'wouter'
import {Printer} from 'lucide-react'
import type {CashDenominationKey, CashMethodTotals, CashSessionRecord} from '@/modules/admin/cash/api/cash'
import {useCashSessionMovements, useCashSummary, useCloseCashSession, useOpenCashSession} from '@/modules/admin/cash/hooks/use-cash'
import {cashSessionCloseSchema, cashSessionOpenSchema, type CashSessionCloseValues, type CashSessionOpenValues} from '@/modules/admin/cash/schemas/cash-session.schema'
import {ConfirmDialog} from '@/shared/components/confirm-dialog'
import {EmptyState} from '@/shared/components/empty-state'
import {ErrorState} from '@/shared/components/error-state'
import {PageHeader} from '@/shared/components/page-header'
import {formatBRL, formatDateTime} from '@/shared/lib/format'
import {useCan} from '@/shared/hooks/use-can'
import {useSessionStore} from '@/shared/stores/session-store'
import {Badge} from '@/shared/ui/badge'
import {Button} from '@/shared/ui/button'
import {Card, CardContent, CardHeader, CardTitle} from '@/shared/ui/card'
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/shared/ui/form'
import {Input} from '@/shared/ui/input'
import {MoneyInput} from '@/shared/components/money-input'
import {Skeleton} from '@/shared/ui/skeleton'

const denominations: {key: CashDenominationKey; cents: number; label: string}[] = [
  {key: '20000', cents: 20_000, label: 'R$ 200'},
  {key: '10000', cents: 10_000, label: 'R$ 100'},
  {key: '5000', cents: 5_000, label: 'R$ 50'},
  {key: '2000', cents: 2_000, label: 'R$ 20'},
  {key: '1000', cents: 1_000, label: 'R$ 10'},
  {key: '500', cents: 500, label: 'R$ 5'},
  {key: '200', cents: 200, label: 'R$ 2'}
]

const paymentMethods: {key: keyof CashMethodTotals; label: string}[] = [
  {key: 'cash', label: 'Dinheiro'},
  {key: 'pix', label: 'Pix'},
  {key: 'debit', label: 'Débito'},
  {key: 'credit', label: 'Crédito'}
]

const emptyCounts: CashMethodTotals = {cash: 0, pix: 0, debit: 0, credit: 0}
const emptyDenominations: Record<CashDenominationKey, number> = {20000: 0, 10000: 0, 5000: 0, 2000: 0, 1000: 0, 500: 0, 200: 0}

function defaultCloseValues(): CashSessionCloseValues {
  return {countedByMethod: {...emptyCounts}, countedCashByDenomination: {...emptyDenominations}, countedOtherCashCents: 0, closingNote: ''}
}

function MethodComparison({expected, counted}: {expected: CashMethodTotals; counted: CashMethodTotals}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-left text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Forma</th>
            <th className="px-3 py-2 text-right font-medium">Esperado</th>
            <th className="px-3 py-2 text-right font-medium">Contado</th>
            <th className="py-2 pl-3 text-right font-medium">Diferença</th>
          </tr>
        </thead>
        <tbody>
          {paymentMethods.map(method => {
            const difference = counted[method.key] - expected[method.key]
            return (
              <tr key={method.key} className="border-b last:border-0">
                <th scope="row" className="py-3 pr-3 font-medium">
                  {method.label}
                </th>
                <td className="px-3 py-3 text-right tabular-nums">{formatBRL(expected[method.key])}</td>
                <td className="px-3 py-3 text-right tabular-nums">{formatBRL(counted[method.key])}</td>
                <td className={`py-3 pl-3 text-right font-medium tabular-nums ${difference ? 'text-destructive' : 'text-muted-foreground'}`}>{formatBRL(difference)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function CashSessionPage() {
  const summaryQuery = useCashSummary()
  const openSessionMutation = useOpenCashSession()
  const closeSessionMutation = useCloseCashSession()
  const user = useSessionStore(state => state.user)
  const canManageCash = useCan('cash.manage')
  const [closedReport, setClosedReport] = useState<CashSessionRecord | null>(null)
  const [openError, setOpenError] = useState('')
  const [closeError, setCloseError] = useState('')
  const [confirmDifferenceOpen, setConfirmDifferenceOpen] = useState(false)
  const [pendingCloseValues, setPendingCloseValues] = useState<CashSessionCloseValues | null>(null)
  const openForm = useForm<CashSessionOpenValues>({resolver: zodResolver(cashSessionOpenSchema), defaultValues: {openingCents: 0}, mode: 'onChange'})
  const closeForm = useForm<CashSessionCloseValues>({resolver: zodResolver(cashSessionCloseSchema), defaultValues: defaultCloseValues(), mode: 'onChange'})
  const session = summaryQuery.data?.session ?? null
  const reportSessionId = closedReport?.id ?? session?.id ?? 0
  const movementsQuery = useCashSessionMovements(reportSessionId)
  const countedValues = closeForm.watch()
  const expectedValues = summaryQuery.data?.balanceByMethod ?? emptyCounts
  const countedCashFromDenominations = denominations.reduce(
    (total, denomination) => total + denomination.cents * countedValues.countedCashByDenomination[denomination.key],
    countedValues.countedOtherCashCents
  )
  const cashDifferenceCents = countedValues.countedByMethod.cash - expectedValues.cash
  const differenceNeedsApproval = Math.abs(cashDifferenceCents) > 500
  const cashDenominationsMatch = countedValues.countedByMethod.cash === countedCashFromDenominations
  const busy = openSessionMutation.isPending || closeSessionMutation.isPending
  const responsibleName = user?.name || 'Equipe'

  useEffect(() => {
    document.title = 'Sessão do caixa | Painel administrativo'
  }, [])

  useEffect(() => {
    if (!session) return
    closeForm.reset(defaultCloseValues())
    void closeForm.trigger()
  }, [closeForm.reset, closeForm.trigger, session?.id])

  async function submitOpen(values: CashSessionOpenValues) {
    setOpenError('')
    try {
      await openSessionMutation.mutateAsync(values.openingCents)
      openForm.reset({openingCents: 0})
      setClosedReport(null)
    } catch (error) {
      setOpenError(error instanceof Error ? error.message : 'Não foi possível abrir o caixa.')
    }
  }

  async function saveClose(values: CashSessionCloseValues, approveDifference = false) {
    if (!session) return
    setCloseError('')
    try {
      const closed = await closeSessionMutation.mutateAsync({
        id: session.id,
        input: {
          countedByMethod: values.countedByMethod,
          countedCashByDenomination: values.countedCashByDenomination,
          countedOtherCashCents: values.countedOtherCashCents,
          closingNote: values.closingNote.trim(),
          ...(approveDifference ? {approveDifference: true} : {})
        }
      })
      setClosedReport({...closed, openedByName: session.openedByName, closedByName: responsibleName})
      setCloseError('')
      setConfirmDifferenceOpen(false)
      setPendingCloseValues(null)
    } catch (error) {
      setCloseError(error instanceof Error ? error.message : 'Não foi possível fechar o caixa.')
      setConfirmDifferenceOpen(false)
      setPendingCloseValues(null)
    }
  }

  function submitClose(values: CashSessionCloseValues) {
    setCloseError('')
    if (!cashDenominationsMatch) {
      setCloseError('A contagem de cédulas e moedas precisa corresponder ao total contado em dinheiro.')
      return
    }
    if (differenceNeedsApproval && !canManageCash) {
      setCloseError('A diferença em dinheiro acima de R$ 5,00 exige a permissão cash.manage.')
      return
    }
    if (differenceNeedsApproval) {
      setPendingCloseValues(values)
      setConfirmDifferenceOpen(true)
      return
    }
    void saveClose(values)
  }

  function confirmCloseWithDifference() {
    if (!pendingCloseValues) return
    void saveClose(pendingCloseValues, true)
  }

  if (closedReport) {
    const expected = closedReport.expectedByMethod ?? emptyCounts
    const counted = closedReport.countedByMethod ?? emptyCounts
    const transferredTabIds = closedReport.transferredTabIds ?? []
    const closedDenominations = closedReport.countedCashByDenomination ?? emptyDenominations
    const otherCoinsCents = closedReport.countedOtherCashCents ?? 0
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Painel administrativo"
          title="Caixa fechado"
          description="Confira ou imprima o relatório desta sessão."
          actions={
            <div className="cash-receipt-hidden flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="min-h-11" onClick={() => window.print()}>
                <Printer className="size-4" aria-hidden="true" />
                Imprimir relatório
              </Button>
              <Button type="button" className="min-h-11" onClick={() => setClosedReport(null)}>
                Abrir próximo caixa
              </Button>
            </div>
          }
        />

        <div id="cash-receipt" className="space-y-5">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>Relatório da sessão #{closedReport.id}</CardTitle>
                <Badge variant="secondary">Fechado</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground">Responsável pela abertura</p>
                <p className="mt-1 font-medium">{closedReport.openedByName ?? (Number(user?.id) === closedReport.openedBy ? responsibleName : `Equipe #${closedReport.openedBy}`)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Responsável pelo fechamento</p>
                <p className="mt-1 font-medium">{closedReport.closedByName ?? (Number(user?.id) === closedReport.closedBy ? responsibleName : `Equipe #${closedReport.closedBy ?? '—'}`)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Aberto em</p>
                <p className="mt-1 font-medium">{formatDateTime(closedReport.openedAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Fechado em</p>
                <p className="mt-1 font-medium">{closedReport.closedAt ? formatDateTime(closedReport.closedAt) : '—'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-muted-foreground">Fundo inicial</p>
                <p className="mt-1 font-semibold tabular-nums">{formatBRL(closedReport.openingCents)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conferência por forma de pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <MethodComparison expected={expected} counted={counted} />
              <div className={`rounded-lg border p-4 ${closedReport.diffCents ? 'border-destructive/50 bg-destructive/5' : 'border-border bg-muted/30'}`}>
                <p className="text-sm text-muted-foreground">Diferença em dinheiro</p>
                <p className={`mt-1 text-2xl font-semibold tabular-nums ${closedReport.diffCents ? 'text-destructive' : ''}`}>{formatBRL(closedReport.diffCents ?? 0)}</p>
                {closedReport.differenceApprovedBy && <p className="mt-1 text-xs text-muted-foreground">Diferença aprovada por responsável com permissão cash.manage.</p>}
              </div>
              <div>
                <p className="text-sm font-medium">Contagem de cédulas e moedas</p>
                <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                  {denominations.map(denomination => (
                    <li key={denomination.key} className="flex justify-between gap-3">
                      <span>{denomination.label}</span>
                      <span className="tabular-nums">
                        {closedDenominations[denomination.key]} un. · {formatBRL(denomination.cents * closedDenominations[denomination.key])}
                      </span>
                    </li>
                  ))}
                  <li className="flex justify-between gap-3">
                    <span>Moedas</span>
                    <span className="tabular-nums">{formatBRL(otherCoinsCents)}</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Movimentações da sessão</CardTitle>
            </CardHeader>
            <CardContent>
              {movementsQuery.isError ?
                <ErrorState title="Não foi possível carregar as movimentações" description="Os totais de fechamento foram calculados no servidor." onRetry={() => void movementsQuery.refetch()} />
              : movementsQuery.isPending ?
                <Skeleton className="h-20 rounded-lg" />
              : movementsQuery.data?.length ?
                <ul className="divide-y">
                  {movementsQuery.data.map(movement => (
                    <li key={movement.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                      <div>
                        <p className="font-medium">
                          {movement.type === 'withdraw' ? 'Sangria' : 'Suprimento'} · {movement.reason}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(movement.createdAt)}</p>
                      </div>
                      <p className="font-semibold tabular-nums">
                        {movement.type === 'withdraw' ? '− ' : '+ '}
                        {formatBRL(movement.amountCents)}
                      </p>
                    </li>
                  ))}
                </ul>
              : <EmptyState title="Sem movimentações" description="Não houve sangrias ou suprimentos nesta sessão." />}
            </CardContent>
          </Card>

          {closedReport.closingNote && (
            <Card>
              <CardHeader>
                <CardTitle>Observação</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm">{closedReport.closingNote}</CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Comandas pendentes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {transferredTabIds.length ?
                <p>As comandas permaneceram abertas e foram transferidas para a próxima sessão: {transferredTabIds.map(id => `#${id}`).join(', ')}.</p>
              : <p className="text-muted-foreground">Não havia comandas abertas para transferir.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (summaryQuery.isError) {
    return <ErrorState title="Não foi possível carregar a sessão do caixa" description="Confira sua conexão e tente novamente." onRetry={() => void summaryQuery.refetch()} />
  }

  if (summaryQuery.isPending || !summaryQuery.data) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Painel administrativo"
        title="Sessão do caixa"
        description="Abra o caixa, confira os valores por forma de pagamento e imprima o fechamento."
        actions={
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/admin/caixa">Voltar ao caixa</Link>
          </Button>
        }
      />

      {session ?
        <>
          <Card>
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">Caixa aberto · sessão #{session.id}</h2>
                  <Badge>Aberto</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Responsável: {session.openedByName || (Number(session.openedBy) === Number(user?.id) ? responsibleName : `Equipe #${session.openedBy}`)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Aberto em {formatDateTime(session.openedAt)}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-sm text-muted-foreground">Fundo inicial</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{formatBRL(session.openingCents)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conferir e fechar</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...closeForm}>
                <form className="space-y-6" onSubmit={closeForm.handleSubmit(submitClose)}>
                  <section className="space-y-3" aria-labelledby="cash-session-count-title">
                    <div>
                      <h3 id="cash-session-count-title" className="font-semibold">
                        Contagem por forma de pagamento
                      </h3>
                      <p className="text-sm text-muted-foreground">Informe o valor que encontrou. O dinheiro contado deve coincidir com as cédulas e moedas.</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {paymentMethods.map(method => (
                        <FormField
                          key={method.key}
                          control={closeForm.control}
                          name={`countedByMethod.${method.key}`}
                          render={({field}) => (
                            <FormItem>
                              <FormLabel>{method.label} contado</FormLabel>
                              <FormControl>
                                <MoneyInput value={field.value} onValueChange={field.onChange} aria-label={`${method.label} contado`} disabled={busy} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <div className="space-y-3 rounded-xl border p-4">
                      <div>
                        <h4 className="font-medium">Cédulas</h4>
                        <p className="text-sm text-muted-foreground">Digite a quantidade de cada valor.</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {denominations.map(denomination => (
                          <FormField
                            key={denomination.key}
                            control={closeForm.control}
                            name={`countedCashByDenomination.${denomination.key}`}
                            render={({field}) => (
                              <FormItem>
                                <FormLabel>{denomination.label} · quantidade</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    step={1}
                                    className="min-h-11"
                                    value={field.value}
                                    onChange={event => field.onChange(event.target.value === '' ? 0 : Number(event.target.value))}
                                    disabled={busy}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormField
                        control={closeForm.control}
                        name="countedOtherCashCents"
                        render={({field}) => (
                          <FormItem className="max-w-sm">
                            <FormLabel>Moedas</FormLabel>
                            <FormControl>
                              <MoneyInput value={field.value} onValueChange={field.onChange} aria-label="Total contado em moedas" disabled={busy} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <p className="text-sm text-muted-foreground">Cédulas e moedas somam {formatBRL(countedCashFromDenominations)}.</p>
                      {!cashDenominationsMatch && (
                        <p role="alert" className="text-sm text-destructive">
                          Esse total precisa ser igual ao valor contado em dinheiro.
                        </p>
                      )}
                    </div>
                  </section>

                  <section className="space-y-3" aria-labelledby="cash-session-summary-title">
                    <div>
                      <h3 id="cash-session-summary-title" className="font-semibold">
                        Esperado × contado
                      </h3>
                      <p className="text-sm text-muted-foreground">Os valores esperados incluem o fundo inicial, pagamentos e movimentações registrados nesta sessão.</p>
                    </div>
                    <Card>
                      <CardContent className="p-4">
                        <MethodComparison expected={expectedValues} counted={countedValues.countedByMethod} />
                      </CardContent>
                    </Card>
                    <div className={`rounded-xl border p-4 ${cashDifferenceCents ? 'border-destructive/50 bg-destructive/5' : 'border-border bg-muted/30'}`}>
                      <p className="text-sm text-muted-foreground">Diferença em dinheiro</p>
                      <p className={`mt-1 text-2xl font-semibold tabular-nums ${cashDifferenceCents ? 'text-destructive' : ''}`}>{formatBRL(cashDifferenceCents)}</p>
                    </div>
                    {differenceNeedsApproval && !canManageCash && (
                      <p role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">
                        A diferença ultrapassa R$ 5,00. É necessária a permissão cash.manage para aprovar o fechamento.
                      </p>
                    )}
                    {differenceNeedsApproval && canManageCash && (
                      <p role="status" className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                        O fechamento exigirá confirmação da diferença acima de R$ 5,00.
                      </p>
                    )}
                  </section>

                  {summaryQuery.data.openTabs.length > 0 && (
                    <section className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4" aria-label="Comandas que serão transferidas">
                      <h3 className="font-semibold">Comandas pendentes serão transferidas</h3>
                      <p className="text-sm">
                        {summaryQuery.data.openTabs.length} {summaryQuery.data.openTabs.length === 1 ? 'comanda continuará aberta' : 'comandas continuarão abertas'} e sairão desta sessão. Nenhuma será
                        fechada automaticamente.
                      </p>
                      <ul className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                        {summaryQuery.data.openTabs.map(tab => (
                          <li key={tab.id}>
                            #{tab.id} · {tab.customerName}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  <FormField
                    control={closeForm.control}
                    name="closingNote"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Observação do fechamento</FormLabel>
                        <FormControl>
                          <Input {...field} maxLength={500} className="min-h-11" placeholder="Opcional" disabled={busy} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {closeError && (
                    <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                      {closeError}
                    </p>
                  )}
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <Button asChild type="button" variant="outline" className="min-h-11">
                      <Link href="/admin/caixa">Cancelar</Link>
                    </Button>
                    <Button type="submit" className="min-h-11" disabled={busy || !closeForm.formState.isValid || !cashDenominationsMatch || (differenceNeedsApproval && !canManageCash)}>
                      {closeSessionMutation.isPending ? 'Fechando caixa…' : 'Fechar caixa'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Movimentações registradas</CardTitle>
            </CardHeader>
            <CardContent>
              {movementsQuery.isError ?
                <ErrorState title="Não foi possível carregar as movimentações" description="Tente novamente para conferir as sangrias e suprimentos." onRetry={() => void movementsQuery.refetch()} />
              : movementsQuery.isPending ?
                <Skeleton className="h-20 rounded-lg" />
              : movementsQuery.data?.length ?
                <ul className="divide-y">
                  {movementsQuery.data.map(movement => (
                    <li key={movement.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                      <div>
                        <p className="font-medium">
                          {movement.type === 'withdraw' ? 'Sangria' : 'Suprimento'} · {movement.reason}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(movement.createdAt)}</p>
                      </div>
                      <p className="font-semibold tabular-nums">
                        {movement.type === 'withdraw' ? '− ' : '+ '}
                        {formatBRL(movement.amountCents)}
                      </p>
                    </li>
                  ))}
                </ul>
              : <EmptyState title="Sem movimentações" description="Sangrias e suprimentos registrados aparecerão aqui." />}
            </CardContent>
          </Card>
        </>
      : <Card>
          <CardHeader>
            <CardTitle>Abrir caixa</CardTitle>
            <p className="text-sm text-muted-foreground">Informe o fundo de troco inicial. Apenas uma sessão pode ficar aberta por vez.</p>
          </CardHeader>
          <CardContent>
            <Form {...openForm}>
              <form className="max-w-xl space-y-5" onSubmit={openForm.handleSubmit(submitOpen)}>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">Responsável pela abertura</p>
                  <p className="mt-1 font-medium">{responsibleName}</p>
                </div>
                <FormField
                  control={openForm.control}
                  name="openingCents"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel>Fundo inicial</FormLabel>
                      <FormControl>
                        <MoneyInput value={field.value} onValueChange={field.onChange} aria-label="Fundo inicial do caixa" disabled={busy} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {openError && (
                  <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                    {openError}
                  </p>
                )}
                <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={busy}>
                  {openSessionMutation.isPending ? 'Abrindo caixa…' : 'Abrir caixa'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      }

      <ConfirmDialog
        open={confirmDifferenceOpen}
        onOpenChange={setConfirmDifferenceOpen}
        title="Aprovar diferença do caixa?"
        description={`A diferença em dinheiro é ${formatBRL(cashDifferenceCents)}, acima do limite de R$ 5,00. A aprovação será registrada no fechamento.`}
        confirmLabel="Aprovar e fechar"
        pending={closeSessionMutation.isPending}
        onConfirm={confirmCloseWithDifference}
      />
    </div>
  )
}
