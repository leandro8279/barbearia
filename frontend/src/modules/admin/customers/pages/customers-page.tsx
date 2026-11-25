import {useEffect, useMemo, useState} from 'react'
import type {ColumnDef, PaginationState, SortingState} from '@tanstack/react-table'
import {Link, useSearch} from 'wouter'
import {UserPlus} from 'lucide-react'
import type {AdminCustomer} from '@/modules/admin/customers/api/customers'
import {useAdminCustomers} from '@/modules/admin/customers/hooks/use-customers'
import {CustomerDrawer} from '@/modules/admin/customers/components/customer-drawer'
import {DataTable} from '@/shared/components/data-table'
import {PageHeader} from '@/shared/components/page-header'
import {useDebounce} from '@/shared/hooks/use-debounce'
import {useOverlay} from '@/shared/hooks/use-overlay'
import {useCan} from '@/shared/hooks/use-can'
import {formatBRL, formatDate, formatPhone} from '@/shared/lib/format'
import {Badge} from '@/shared/ui/badge'
import {Button} from '@/shared/ui/button'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/shared/ui/select'

type NoVisitFilter = 'all' | '30' | '60' | '90'
type BirthdayFilter = 'all' | 'month'

export default function CustomersPage() {
  const searchParams = new URLSearchParams(useSearch())
  const customerDrawer = useOverlay('cliente', '')
  const canWrite = useCan('customers.write')
  const customerDrawerId = searchParams.get('cliente')
  const [pagination, setPagination] = useState<PaginationState>({pageIndex: 0, pageSize: 10})
  const [sorting, setSorting] = useState<SortingState>([{id: 'name', desc: false}])
  const [search, setSearch] = useState('')
  const [noVisitFilter, setNoVisitFilter] = useState<NoVisitFilter>('all')
  const [birthdayFilter, setBirthdayFilter] = useState<BirthdayFilter>('all')
  const debouncedSearch = useDebounce(search, 250)
  const sort = sorting[0] ?? {id: 'name', desc: false}
  const customersQuery = useAdminCustomers({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    query: debouncedSearch.trim(),
    noVisitDays: noVisitFilter === 'all' ? undefined : Number(noVisitFilter),
    birthday: birthdayFilter === 'all' ? undefined : birthdayFilter,
    sortBy: sort.id,
    sortOrder: sort.desc ? 'desc' : 'asc'
  })

  useEffect(() => {
    document.title = 'Clientes | Painel administrativo'
  }, [])

  const columns = useMemo<ColumnDef<AdminCustomer>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Nome',
        cell: ({row}) => (
          <Link href={`/admin/clientes/${row.original.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
            {row.original.name}
          </Link>
        )
      },
      {
        accessorKey: 'phone',
        header: 'Telefone',
        enableSorting: false,
        cell: ({row}) => {
          const customer = row.original
          const phone = customer.phoneMasked ? customer.phone : formatPhone(customer.phone)
          return <span title={customer.phoneMasked ? 'Telefone parcialmente oculto por permissão' : undefined}>{phone || '—'}</span>
        }
      },
      {accessorKey: 'lastVisit', header: 'Última visita', cell: ({row}) => (row.original.lastVisit ? formatDate(row.original.lastVisit) : '—')},
      {accessorKey: 'visitsCount', header: 'Nº de visitas', cell: ({row}) => row.original.visitsCount.toLocaleString('pt-BR')},
      {accessorKey: 'totalSpentCents', header: 'Gasto total', cell: ({row}) => <span className="tabular-nums">{formatBRL(row.original.totalSpentCents)}</span>},
      {
        id: 'tags',
        header: 'Tags',
        enableSorting: false,
        cell: ({row}) =>
          row.original.tags.length ?
            <div className="flex min-w-32 flex-wrap gap-1.5">
              {row.original.tags.map((tag, index) => (
                <Badge key={`${row.original.id}-${tag}-${index}`} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          : <span className="text-muted-foreground">—</span>
      }
    ],
    []
  )

  function resetPage() {
    setPagination(current => ({...current, pageIndex: 0}))
  }

  const hasFilters = search.trim() !== '' || noVisitFilter !== 'all' || birthdayFilter !== 'all'

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Painel administrativo"
        title="Clientes"
        description="Consulte visitas, gastos e segmentos dos clientes."
        actions={
          canWrite && (
            <Button className="min-h-11" onClick={() => customerDrawer.open('novo')}>
              <UserPlus aria-hidden="true" />
              Novo cliente
            </Button>
          )
        }
      />

      <section aria-label="Filtros de clientes" className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="customer-no-visit-filter" className="text-sm font-medium">
            Sem visita há
          </label>
          <Select
            value={noVisitFilter}
            onValueChange={value => {
              setNoVisitFilter(value as NoVisitFilter)
              resetPage()
            }}>
            <SelectTrigger id="customer-no-visit-filter" className="min-h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Qualquer período</SelectItem>
              <SelectItem value="30">30 dias ou mais</SelectItem>
              <SelectItem value="60">60 dias ou mais</SelectItem>
              <SelectItem value="90">90 dias ou mais</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label htmlFor="customer-birthday-filter" className="text-sm font-medium">
            Aniversariantes
          </label>
          <Select
            value={birthdayFilter}
            onValueChange={value => {
              setBirthdayFilter(value as BirthdayFilter)
              resetPage()
            }}>
            <SelectTrigger id="customer-birthday-filter" className="min-h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              <SelectItem value="month">Este mês</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <DataTable
        columns={columns}
        data={customersQuery.data?.items ?? []}
        rowCount={customersQuery.data?.total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        sorting={sorting}
        onSortingChange={next => {
          setSorting(next)
          resetPage()
        }}
        query={search}
        onSearchChange={value => {
          setSearch(value)
          resetPage()
        }}
        searchPlaceholder="Buscar por nome ou telefone"
        loading={customersQuery.isPending}
        error={customersQuery.isError}
        onRetry={() => void customersQuery.refetch()}
        emptyTitle={hasFilters ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
        emptyDescription="Altere a busca ou os filtros para ver outros clientes."
        pageSizeOptions={[10, 20, 50]}
      />
      {canWrite && <CustomerDrawer open={customerDrawer.isOpen} customerId={customerDrawerId} onOpenChange={open => customerDrawer.setOpen(open, customerDrawerId ?? 'novo')} />}
    </div>
  )
}
