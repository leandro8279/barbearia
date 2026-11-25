import {useEffect, useMemo, useState} from 'react'
import {Check, ChevronLeft, ChevronRight, CircleDollarSign, Clock3, Pencil, Plus, Search, X} from 'lucide-react'
import {Link} from 'wouter'
import type {Expense, ExpenseQuery} from '@/modules/admin/finance/api/finance'
import {ExpenseFormDialog} from '@/modules/admin/finance/components/expense-form-dialog'
import {useExpenseCategories, useExpenses, useMarkExpensePaid, useSaveExpense} from '@/modules/admin/finance/hooks/use-finance'
import {ConfirmDialog} from '@/shared/components/confirm-dialog'
import {EmptyState} from '@/shared/components/empty-state'
import {ErrorState} from '@/shared/components/error-state'
import {PageHeader} from '@/shared/components/page-header'
import {useCan} from '@/shared/hooks/use-can'
import {useDebounce} from '@/shared/hooks/use-debounce'
import {formatBRL, formatDate} from '@/shared/lib/format'
import {Badge} from '@/shared/ui/badge'
import {Button} from '@/shared/ui/button'
import {Card, CardContent} from '@/shared/ui/card'
import {Input} from '@/shared/ui/input'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/shared/ui/select'
import {Skeleton} from '@/shared/ui/skeleton'
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/shared/ui/table'

const pageSize = 10
type ExpenseStatus = ExpenseQuery['status']

function expenseStatusLabel(expense: Expense) {
  if (expense.displayStatus === 'overdue') return 'Atrasada'
  return expense.status === 'paid' ? 'Paga' : 'A pagar'
}

function expenseStatusVariant(expense: Expense): 'secondary' | 'destructive' | 'outline' {
  if (expense.displayStatus === 'overdue') return 'destructive'
  return expense.status === 'paid' ? 'secondary' : 'outline'
}

export default function ExpensesPage() {
  const canWrite = useCan('finance.write')
  const canManage = useCan('finance.manage')
  const categoriesQuery = useExpenseCategories()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ExpenseStatus>('all')
  const [category, setCategory] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [marking, setMarking] = useState<Expense | null>(null)
  const debouncedSearch = useDebounce(search, 250)
  const params = useMemo<ExpenseQuery>(
    () => ({
      page,
      pageSize,
      query: debouncedSearch.trim(),
      category: category === 'all' ? undefined : category,
      status,
      from: from ? `${from}T00:00:00.000-03:00` : undefined,
      to: to ? `${to}T23:59:59.999-03:00` : undefined
    }),
    [category, debouncedSearch, from, page, status, to]
  )
  const expensesQuery = useExpenses(params)
  const saveMutation = useSaveExpense()
  const paidMutation = useMarkExpensePaid()
  const expenses = expensesQuery.data?.items ?? []

  useEffect(() => {
    document.title = 'Despesas | Painel administrativo'
  }, [])

  function resetPage() {
    setPage(1)
  }

  function canEdit(expense: Expense) {
    return expense.status === 'paid' ? canManage : canWrite
  }

  async function saveExpense(id: number | null, input: Parameters<typeof saveMutation.mutateAsync>[0]['input']) {
    await saveMutation.mutateAsync({id, input})
  }

  async function markPaid() {
    if (!marking || !canWrite) return
    try {
      await paidMutation.mutateAsync(marking.id)
      setMarking(null)
    } catch {
      // The mutation hook already reports the failure through a toast.
    }
  }

  function openCreate() {
    if (!canWrite) return
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(expense: Expense) {
    if (!canEdit(expense)) return
    setEditing(expense)
    setDialogOpen(true)
  }

  const noFilters = !debouncedSearch.trim() && status === 'all' && category === 'all' && !from && !to

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Financeiro"
        title="Despesas"
        description="Acompanhe vencimentos e mantenha os compromissos da barbearia em dia."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
              <Link href="/admin/financeiro">Visão geral</Link>
            </Button>
            {canWrite && (
              <Button type="button" className="min-h-11 w-full sm:w-auto" onClick={openCreate}>
                <Plus className="size-4" aria-hidden="true" />
                Nova despesa
              </Button>
            )}
          </div>
        }
      />

      <section
        aria-label="Filtros de despesas"
        className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 xl:grid-cols-[minmax(14rem,1.4fr)_minmax(10rem,0.8fr)_minmax(10rem,0.8fr)_minmax(9rem,0.7fr)_minmax(9rem,0.7fr)]">
        <label className="relative block space-y-2 sm:col-span-2 xl:col-span-1">
          <span className="text-sm font-medium">Buscar</span>
          <Search className="pointer-events-none absolute bottom-3 left-3 size-4 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            value={search}
            onChange={event => {
              setSearch(event.target.value)
              resetPage()
            }}
            placeholder="Descrição ou categoria"
            className="min-h-11 pl-9"
          />
        </label>
        <div className="space-y-2">
          <label htmlFor="expense-status-filter" className="text-sm font-medium">
            Status
          </label>
          <Select
            value={status}
            onValueChange={value => {
              setStatus(value as ExpenseStatus)
              resetPage()
            }}>
            <SelectTrigger id="expense-status-filter" className="min-h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="open">A pagar</SelectItem>
              <SelectItem value="overdue">Vencidas</SelectItem>
              <SelectItem value="paid">Pagas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label htmlFor="expense-category-filter" className="text-sm font-medium">
            Categoria
          </label>
          <Select
            value={category}
            onValueChange={value => {
              setCategory(value)
              resetPage()
            }}
            disabled={categoriesQuery.isPending || categoriesQuery.isError}>
            <SelectTrigger id="expense-category-filter" className="min-h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {(categoriesQuery.data ?? []).map(item => (
                <SelectItem key={item.id} value={item.slug}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label htmlFor="expense-from" className="text-sm font-medium">
            Vencimento de
          </label>
          <Input
            id="expense-from"
            type="date"
            value={from}
            max={to || undefined}
            onChange={event => {
              setFrom(event.target.value)
              resetPage()
            }}
            className="min-h-11"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="expense-to" className="text-sm font-medium">
            Vencimento até
          </label>
          <Input
            id="expense-to"
            type="date"
            value={to}
            min={from || undefined}
            onChange={event => {
              setTo(event.target.value)
              resetPage()
            }}
            className="min-h-11"
          />
        </div>
        {(search || category !== 'all' || status !== 'all' || from || to) && (
          <div className="sm:col-span-2 xl:col-span-5">
            <Button
              type="button"
              variant="ghost"
              className="min-h-10 px-2 text-muted-foreground"
              onClick={() => {
                setSearch('')
                setCategory('all')
                setStatus('all')
                setFrom('')
                setTo('')
                resetPage()
              }}>
              <X className="size-4" aria-hidden="true" />
              Limpar filtros
            </Button>
          </div>
        )}
      </section>

      {categoriesQuery.isError && (
        <ErrorState title="Não foi possível carregar as categorias" description="Os filtros por categoria estão temporariamente indisponíveis." onRetry={() => void categoriesQuery.refetch()} />
      )}

      <Card>
        <CardContent className="p-0">
          {expensesQuery.isError ?
            <div className="p-4">
              <ErrorState title="Não foi possível carregar as despesas" description="Confira sua conexão e tente novamente." onRetry={() => void expensesQuery.refetch()} />
            </div>
          : expensesQuery.isPending ?
            <div className="space-y-3 p-4" aria-label="Carregando despesas">
              {[0, 1, 2, 3, 4].map(item => (
                <Skeleton key={item} className="h-14 rounded-lg" />
              ))}
            </div>
          : expenses.length ?
            <>
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>
                        <span className="sr-only">Ações</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map(expense => (
                      <TableRow key={expense.id}>
                        <TableCell className="whitespace-nowrap text-sm">{formatDate(expense.dueAt)}</TableCell>
                        <TableCell>
                          <span className="font-medium">{expense.description}</span>
                          {expense.recurring && <span className="ml-2 text-xs text-muted-foreground">Mensal</span>}
                        </TableCell>
                        <TableCell>{categoriesQuery.data?.find(item => item.slug === expense.category || item.name === expense.category)?.name ?? expense.category}</TableCell>
                        <TableCell className="whitespace-nowrap font-medium tabular-nums">{formatBRL(expense.amountCents)}</TableCell>
                        <TableCell>
                          <Badge variant={expenseStatusVariant(expense)}>{expenseStatusLabel(expense)}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {canEdit(expense) && (
                              <Button type="button" variant="ghost" size="icon" className="min-h-10 min-w-10" aria-label={`Editar ${expense.description}`} onClick={() => openEdit(expense)}>
                                <Pencil className="size-4" aria-hidden="true" />
                              </Button>
                            )}
                            {canWrite && expense.status === 'open' && (
                              <Button type="button" variant="outline" className="min-h-10 px-3" onClick={() => setMarking(expense)}>
                                <Check className="size-4" aria-hidden="true" />
                                Marcar paga
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ul className="divide-y divide-border md:hidden">
                {expenses.map(expense => (
                  <li key={expense.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words font-medium">{expense.description}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {categoriesQuery.data?.find(item => item.slug === expense.category || item.name === expense.category)?.name ?? expense.category}
                          {expense.recurring ? ' · Mensal' : ''}
                        </p>
                      </div>
                      <Badge variant={expenseStatusVariant(expense)} className="shrink-0">
                        {expenseStatusLabel(expense)}
                      </Badge>
                    </div>
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Vencimento</p>
                        <p className="flex items-center gap-1.5 text-sm">
                          <Clock3 className="size-3.5 text-primary" aria-hidden="true" />
                          {formatDate(expense.dueAt)}
                        </p>
                      </div>
                      <p className="shrink-0 font-semibold tabular-nums">{formatBRL(expense.amountCents)}</p>
                    </div>
                    {(canEdit(expense) || (canWrite && expense.status === 'open')) && (
                      <div className="flex gap-2 border-t border-border pt-2">
                        {canEdit(expense) && (
                          <Button type="button" variant="outline" className="min-h-10 flex-1" onClick={() => openEdit(expense)}>
                            <Pencil className="size-4" aria-hidden="true" />
                            Editar
                          </Button>
                        )}
                        {canWrite && expense.status === 'open' && (
                          <Button type="button" variant="outline" className="min-h-10 flex-1" onClick={() => setMarking(expense)}>
                            <Check className="size-4" aria-hidden="true" />
                            Marcar paga
                          </Button>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  {expensesQuery.data?.total ?? 0} despesas · página {page} de {Math.max(1, expensesQuery.data?.pageCount ?? 1)}
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="min-h-11 flex-1 sm:flex-none" disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>
                    <ChevronLeft className="size-4" aria-hidden="true" />
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 flex-1 sm:flex-none"
                    disabled={page >= (expensesQuery.data?.pageCount ?? 1)}
                    onClick={() => setPage(value => Math.min(expensesQuery.data?.pageCount ?? 1, value + 1))}>
                    Próxima
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </>
          : <div className="py-6">
              <EmptyState
                title={noFilters ? 'Nenhuma despesa cadastrada' : 'Nenhuma despesa encontrada'}
                description={noFilters ? 'Registre o primeiro compromisso financeiro para acompanhar seus vencimentos.' : 'Altere os filtros ou a busca para consultar outros lançamentos.'}
                icon={<CircleDollarSign className="size-8" />}
              />
              {canWrite && noFilters && (
                <div className="mt-4 flex justify-center">
                  <Button type="button" className="min-h-11" onClick={openCreate}>
                    <Plus className="size-4" aria-hidden="true" />
                    Cadastrar despesa
                  </Button>
                </div>
              )}
            </div>
          }
        </CardContent>
      </Card>

      <ExpenseFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        expense={editing}
        categories={categoriesQuery.data ?? []}
        categoriesLoading={categoriesQuery.isPending}
        categoriesError={categoriesQuery.isError}
        pending={saveMutation.isPending}
        onRetryCategories={() => void categoriesQuery.refetch()}
        onSave={saveExpense}
      />
      <ConfirmDialog
        open={Boolean(marking)}
        onOpenChange={open => {
          if (!open && !paidMutation.isPending) setMarking(null)
        }}
        title="Marcar despesa como paga?"
        description={marking ? `${marking.description} · ${formatBRL(marking.amountCents)}. Essa ação registra o pagamento desta despesa.` : 'Essa ação registra o pagamento desta despesa.'}
        confirmLabel="Confirmar pagamento"
        pending={paidMutation.isPending}
        onConfirm={() => void markPaid()}
      />
    </div>
  )
}
