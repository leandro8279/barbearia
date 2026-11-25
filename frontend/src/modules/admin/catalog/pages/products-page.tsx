import {useEffect, useMemo, useState} from 'react'
import type {ColumnDef, PaginationState, SortingState} from '@tanstack/react-table'
import {AlertTriangle, Plus} from 'lucide-react'
import {Link} from 'wouter'
import type {CatalogProduct, ProductQuery} from '@/modules/admin/catalog/api/products'
import {useAdminProducts, useProductCategories} from '@/modules/admin/catalog/hooks/use-products'
import {DataTable} from '@/shared/components/data-table'
import {ErrorState} from '@/shared/components/error-state'
import {PageHeader} from '@/shared/components/page-header'
import {useCan} from '@/shared/hooks/use-can'
import {useDebounce} from '@/shared/hooks/use-debounce'
import {formatBRL} from '@/shared/lib/format'
import {Badge} from '@/shared/ui/badge'
import {Button} from '@/shared/ui/button'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/shared/ui/select'
import {Skeleton} from '@/shared/ui/skeleton'

type KindFilter = 'all' | 'resale' | 'supply'
type StockFilter = 'all' | 'low' | 'ok'

export default function ProductsPage() {
  const canWriteCatalog = useCan('catalog.write')
  const categoriesQuery = useProductCategories()
  const [pagination, setPagination] = useState<PaginationState>({pageIndex: 0, pageSize: 10})
  const [sorting, setSorting] = useState<SortingState>([{id: 'name', desc: false}])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const debouncedSearch = useDebounce(search, 250)
  const sort = sorting[0] ?? {id: 'name', desc: false}
  const productParams: ProductQuery = {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    query: debouncedSearch.trim(),
    categoryId: categoryFilter === 'all' ? undefined : Number(categoryFilter),
    kind: kindFilter === 'all' ? undefined : kindFilter,
    stock: stockFilter === 'all' ? undefined : stockFilter,
    sortBy: sort.id,
    sortOrder: sort.desc ? 'desc' : 'asc'
  }
  const productsQuery = useAdminProducts(productParams)
  const categories = categoriesQuery.data ?? []
  const categoryNames = useMemo(() => new Map(categories.map(category => [category.id, category.name])), [categories])

  useEffect(() => {
    document.title = 'Produtos | Painel administrativo'
  }, [])

  function resetPage() {
    setPagination(current => ({...current, pageIndex: 0}))
  }

  const columns = useMemo<ColumnDef<CatalogProduct>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Produto',
        cell: ({row}) => {
          const product = row.original
          return (
            <div className="flex min-w-40 items-center gap-3">
              <img src={product.image || '/seed/product-care.svg'} alt="" width={40} height={40} loading="lazy" decoding="async" className="size-10 shrink-0 rounded-md border border-border object-cover" />
              <div className="min-w-0">
                {canWriteCatalog ?
                  <Link href={`/admin/produtos/${product.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
                    {product.name}
                  </Link>
                : <span className="font-medium">{product.name}</span>}
                <p className="text-xs text-muted-foreground">{product.sku}</p>
              </div>
            </div>
          )
        }
      },
      {accessorKey: 'categoryId', header: 'Categoria', cell: ({row}) => categoryNames.get(row.original.categoryId) ?? `Categoria #${row.original.categoryId}`},
      {accessorKey: 'price', header: 'Preço', cell: ({row}) => <span className="tabular-nums">{formatBRL(row.original.price)}</span>},
      {accessorKey: 'costCents', header: 'Custo', cell: ({row}) => <span className="tabular-nums">{formatBRL(row.original.costCents)}</span>},
      {
        id: 'margin',
        header: 'Margem',
        enableSorting: false,
        cell: ({row}) => {
          const {price, costCents} = row.original
          const margin = price > 0 ? ((price - costCents) / price) * 100 : null
          return <span className="tabular-nums">{margin === null ? '—' : `${margin.toLocaleString('pt-BR', {maximumFractionDigits: 1})}%`}</span>
        }
      },
      {
        accessorKey: 'stock',
        header: 'Estoque',
        cell: ({row}) => {
          const product = row.original
          const low = product.stock < product.minStock
          return (
            <span className={low ? 'inline-flex items-center gap-1.5 font-medium text-destructive' : 'tabular-nums'}>
              {low && <AlertTriangle className="size-4" aria-hidden="true" />}
              {product.stock}
              <span className="text-xs text-muted-foreground">/ mín. {product.minStock}</span>
            </span>
          )
        }
      },
      {
        accessorKey: 'kind',
        header: 'Tipo',
        enableSorting: false,
        cell: ({row}) => <Badge variant={row.original.kind === 'resale' ? 'secondary' : 'outline'}>{row.original.kind === 'resale' ? 'Revenda' : 'Uso interno'}</Badge>
      }
    ],
    [canWriteCatalog, categoryNames]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Painel administrativo"
        title="Produtos"
        description="Consulte preços, custos e saldos dos produtos e insumos."
        actions={
          canWriteCatalog ?
            <Button asChild className="min-h-11 w-full sm:w-auto">
              <Link href="/admin/produtos/novo">
                <Plus className="size-4" aria-hidden="true" />
                Novo produto
              </Link>
            </Button>
          : undefined
        }
      />

      {categoriesQuery.isError && (
        <ErrorState
          title="Não foi possível carregar as categorias"
          description="Os produtos estão disponíveis, mas os nomes das categorias podem não aparecer."
          onRetry={() => void categoriesQuery.refetch()}
        />
      )}

      <section aria-label="Filtros de produtos" className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <label htmlFor="product-category-filter" className="text-sm font-medium">
            Categoria
          </label>
          {categoriesQuery.isPending ?
            <Skeleton className="h-11 rounded-md" />
          : <Select
              value={categoryFilter}
              onValueChange={value => {
                setCategoryFilter(value)
                resetPage()
              }}
              disabled={categoriesQuery.isError}>
              <SelectTrigger id="product-category-filter" className="min-h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={String(category.id)}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        </div>
        <div className="space-y-2">
          <label htmlFor="product-kind-filter" className="text-sm font-medium">
            Tipo
          </label>
          <Select
            value={kindFilter}
            onValueChange={value => {
              setKindFilter(value as KindFilter)
              resetPage()
            }}>
            <SelectTrigger id="product-kind-filter" className="min-h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Revenda e uso interno</SelectItem>
              <SelectItem value="resale">Revenda</SelectItem>
              <SelectItem value="supply">Uso interno</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label htmlFor="product-stock-filter" className="text-sm font-medium">
            Estoque
          </label>
          <Select
            value={stockFilter}
            onValueChange={value => {
              setStockFilter(value as StockFilter)
              resetPage()
            }}>
            <SelectTrigger id="product-stock-filter" className="min-h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os saldos</SelectItem>
              <SelectItem value="low">Abaixo do mínimo</SelectItem>
              <SelectItem value="ok">No mínimo ou acima</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <DataTable
        columns={columns}
        data={productsQuery.data?.items ?? []}
        rowCount={productsQuery.data?.total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        sorting={sorting}
        onSortingChange={setSorting}
        query={search}
        onSearchChange={value => {
          setSearch(value)
          resetPage()
        }}
        searchPlaceholder="Buscar por nome ou SKU"
        loading={productsQuery.isPending}
        error={productsQuery.isError}
        onRetry={() => void productsQuery.refetch()}
        emptyTitle={search || categoryFilter !== 'all' || kindFilter !== 'all' || stockFilter !== 'all' ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
        emptyDescription="Altere a busca ou os filtros para ver outros produtos."
        pageSizeOptions={[10, 20, 50]}
      />
    </div>
  )
}
