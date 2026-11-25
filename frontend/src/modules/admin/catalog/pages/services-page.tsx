import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table';
import { Link, useSearch } from 'wouter';
import { Copy, Pencil, Plus } from 'lucide-react';
import type { AdminService } from '@/modules/admin/catalog/api/catalog';
import { useAdminServices, useDuplicateService, useServiceCategories, useSetServiceActive } from '@/modules/admin/catalog/hooks/use-catalog';
import { ServiceDrawer } from '@/modules/admin/catalog/components/service-drawer';
import { DataTable } from '@/shared/components/data-table';
import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { formatBRL, formatDuration } from '@/shared/lib/format';
import { useCan } from '@/shared/hooks/use-can';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { useOverlay } from '@/shared/hooks/use-overlay';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';

type ActiveFilter = 'all' | 'active' | 'inactive';

export default function ServicesPage() {
  const canWriteCatalog = useCan('catalog.write');
  const searchParams = new URLSearchParams(useSearch());
  const serviceOverlay = useOverlay('servico', '');
  const selectedServiceId = searchParams.get('servico');
  const categoriesQuery = useServiceCategories();
  const setActive = useSetServiceActive();
  const duplicate = useDuplicateService();
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const debouncedSearch = useDebounce(search, 250);
  const sort = sorting[0] ?? { id: 'name', desc: false };
  const serviceParams = {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    query: debouncedSearch.trim(),
    categoryId: categoryFilter === 'all' ? undefined : Number(categoryFilter),
    active: activeFilter === 'all' ? undefined : activeFilter === 'active',
    sortBy: sort.id === 'categoryId' ? 'categoryId' : sort.id,
    sortOrder: sort.desc ? ('desc' as const) : ('asc' as const),
  };
  const servicesQuery = useAdminServices(serviceParams);
  const categories = categoriesQuery.data ?? [];
  const categoryNames = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);

  useEffect(() => {
    document.title = 'Serviços | Painel administrativo';
  }, []);

  const columns = useMemo<ColumnDef<AdminService>[]>(
    () => [
      { accessorKey: 'name', header: 'Nome', cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
      { accessorKey: 'categoryId', header: 'Categoria', cell: ({ row }) => categoryNames.get(row.original.categoryId) ?? `Categoria #${row.original.categoryId}` },
      { accessorKey: 'durationMin', header: 'Duração', cell: ({ row }) => formatDuration(row.original.durationMin) },
      { accessorKey: 'price', header: 'Preço', cell: ({ row }) => <span className="tabular-nums">{formatBRL(row.original.price)}</span> },
      { accessorKey: 'commissionPct', header: 'Comissão padrão', cell: ({ row }) => <span className="tabular-nums">{row.original.commissionPct}%</span> },
      { accessorKey: 'active', header: 'Status', cell: ({ row }) => <Badge variant={row.original.active ? 'default' : 'secondary'}>{row.original.active ? 'Ativo' : 'Inativo'}</Badge> },
      {
        id: 'actions',
        header: 'Ações',
        enableSorting: false,
        cell: ({ row }) => {
          const service = row.original;
          if (!canWriteCatalog) return <span className="text-sm text-muted-foreground">—</span>;
          return (
            <div className="flex min-w-max items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11 shrink-0"
                aria-label={`Editar ${service.name}`}
                title={`Editar ${service.name}`}
                onClick={() => serviceOverlay.open(String(service.id))}
              >
                <Pencil className="size-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="min-h-11 px-3"
                disabled={setActive.isPending || duplicate.isPending}
                onClick={() => setActive.mutate({ id: service.id, active: !service.active })}
              >
                {service.active ? 'Desativar' : 'Ativar'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11 shrink-0"
                aria-label={`Duplicar ${service.name}`}
                title={`Duplicar ${service.name}`}
                disabled={setActive.isPending || duplicate.isPending}
                onClick={() => duplicate.mutate(service)}
              >
                <Copy className="size-4" aria-hidden="true" />
              </Button>
            </div>
          );
        },
      },
    ],
    [canWriteCatalog, categoryNames, duplicate, serviceOverlay, setActive],
  );

  function resetPage() {
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Painel administrativo"
        title="Serviços"
        description="Gerencie serviços, preços, duração e comissão padrão da equipe."
        actions={
          canWriteCatalog ?
            <Button asChild className="min-h-11 w-full sm:w-auto">
              <Link href="/admin/servicos?servico=novo">
                <Plus className="size-4" aria-hidden="true" />
                Novo serviço
              </Link>
            </Button>
          : undefined
        }
      />

      {categoriesQuery.isError && (
        <ErrorState
          title="Não foi possível carregar as categorias"
          description="Os serviços continuam disponíveis, mas os nomes das categorias podem não aparecer."
          onRetry={() => void categoriesQuery.refetch()}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="service-category-filter" className="text-sm font-medium">
            Categoria
          </label>
          {categoriesQuery.isPending ?
            <Skeleton className="h-11 rounded-md" />
          : <Select
              value={categoryFilter}
              onValueChange={(value) => {
                setCategoryFilter(value);
                resetPage();
              }}
              disabled={categoriesQuery.isError}
            >
              <SelectTrigger id="service-category-filter" className="min-h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        </div>
        <div className="space-y-2">
          <label htmlFor="service-status-filter" className="text-sm font-medium">
            Status
          </label>
          <Select
            value={activeFilter}
            onValueChange={(value) => {
              setActiveFilter(value as ActiveFilter);
              resetPage();
            }}
          >
            <SelectTrigger id="service-status-filter" className="min-h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os serviços</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={servicesQuery.data?.items ?? []}
        rowCount={servicesQuery.data?.total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        sorting={sorting}
        onSortingChange={setSorting}
        query={search}
        onSearchChange={(value) => {
          setSearch(value);
          resetPage();
        }}
        searchPlaceholder="Buscar serviço pelo nome"
        loading={servicesQuery.isPending}
        error={servicesQuery.isError}
        onRetry={() => void servicesQuery.refetch()}
        emptyTitle={search || categoryFilter !== 'all' || activeFilter !== 'all' ? 'Nenhum serviço encontrado' : 'Nenhum serviço cadastrado'}
        emptyDescription="Altere a busca ou os filtros para ver outros serviços."
        pageSizeOptions={[10, 20, 50]}
      />
      <ServiceDrawer
        open={serviceOverlay.isOpen}
        serviceId={selectedServiceId}
        onOpenChange={(open) => {
          if (!open) serviceOverlay.close();
        }}
      />
    </div>
  );
}
