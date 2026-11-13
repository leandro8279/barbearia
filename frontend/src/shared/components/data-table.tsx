/* eslint-disable react-hooks/incompatible-library */
import { useMemo, useState } from 'react';

import { ColumnDef, flexRender, getCoreRowModel, PaginationState, RowData, RowSelectionState, SortingState, Updater, useReactTable } from '@tanstack/react-table';

import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

import { ArrowDown, ArrowUp, ArrowUpDown, Check, ChevronLeft, ChevronRight, Minus } from 'lucide-react';

import { RenderComponent } from './render-component';

function applyUpdater<T>(updater: Updater<T>, current: T): T {
  if (typeof updater === 'function') {
    return (updater as (previous: T) => T)(current);
  }
  return updater;
}

export interface DataTableProps<TData extends RowData, TValue = unknown> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  rowCount?: number;
  getRowId?: (row: TData, index: number) => string;
  pagination?: PaginationState;
  onPaginationChange?: (pagination: PaginationState) => void;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (selection: RowSelectionState) => void;
  query?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  enableRowSelection?: boolean;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  pageSizeOptions?: number[];
}

export function DataTable<TData extends RowData, TValue = unknown>({
  columns,
  data,
  rowCount = data.length,
  getRowId,
  pagination: controlledPagination,
  onPaginationChange,
  sorting: controlledSorting,
  onSortingChange,
  rowSelection: controlledSelection,
  onRowSelectionChange,
  query: controlledQuery,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  enableRowSelection = false,
  loading = false,
  error = false,
  onRetry,
  emptyTitle = 'Nenhum resultado encontrado',
  emptyDescription = 'Tente alterar a busca ou os filtros.',
  pageSizeOptions = [10, 20, 50],
}: DataTableProps<TData, TValue>) {
  const [internalPagination, setInternalPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const [internalSelection, setInternalSelection] = useState<RowSelectionState>({});
  const [internalQuery, setInternalQuery] = useState('');
  const pagination = controlledPagination ?? internalPagination;
  const sorting = controlledSorting ?? internalSorting;
  const rowSelection = controlledSelection ?? internalSelection;
  const query = controlledQuery ?? internalQuery;
  const selectionColumn = useMemo<ColumnDef<TData, TValue>>(
    () => ({
      id: 'selecionar',
      header: ({ table }) => (
        <button
          type="button"
          role="checkbox"
          aria-label="Selecionar todos desta página"
          aria-checked={
            table.getIsAllPageRowsSelected() ? true
            : table.getIsSomePageRowsSelected() ?
              'mixed'
            : false
          }
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => table.toggleAllPageRowsSelected(!table.getIsAllPageRowsSelected())}
        >
          <span className="flex size-5 items-center justify-center rounded border border-input bg-background">
            {table.getIsAllPageRowsSelected() ?
              <Check className="size-4" aria-hidden="true" />
            : table.getIsSomePageRowsSelected() ?
              <Minus className="size-4" aria-hidden="true" />
            : null}
          </span>
        </button>
      ),
      cell: ({ row }) => (
        <button
          type="button"
          role="checkbox"
          aria-label={`Selecionar linha ${row.index + 1}`}
          aria-checked={row.getIsSelected()}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => row.toggleSelected(!row.getIsSelected())}
        >
          <span className="flex size-5 items-center justify-center rounded border border-input bg-background">
            <RenderComponent condition={row.getIsSelected()}>
              <Check className="size-4" aria-hidden="true" />
            </RenderComponent>
          </span>
        </button>
      ),
      enableSorting: false,
      enableHiding: false,
    }),
    [],
  );
  const tableColumns = useMemo(() => (enableRowSelection ? [selectionColumn, ...columns] : columns), [columns, enableRowSelection, selectionColumn]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    rowCount,
    getRowId,
    state: { pagination, sorting, rowSelection },
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    enableRowSelection,
    getCoreRowModel: getCoreRowModel(),
    onPaginationChange: (updater) => {
      const next = applyUpdater(updater, pagination);
      if (controlledPagination === undefined) setInternalPagination(next);
      onPaginationChange?.(next);
    },
    onSortingChange: (updater) => {
      const next = applyUpdater(updater, sorting);
      if (controlledSorting === undefined) setInternalSorting(next);
      onSortingChange?.(next);
    },
    onRowSelectionChange: (updater) => {
      const next = applyUpdater(updater, rowSelection);
      if (controlledSelection === undefined) setInternalSelection(next);
      onRowSelectionChange?.(next);
    },
  });
  const pageCount = Math.max(1, table.getPageCount());
  const selectedCount = Object.values(rowSelection).filter(Boolean).length;

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="w-full sm:max-w-sm">
          <span className="sr-only">Buscar nesta lista</span>
          <Input
            type="search"
            className="min-h-11"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(event) => {
              const next = event.target.value;
              if (controlledQuery === undefined) setInternalQuery(next);
              onSearchChange?.(next);
              table.setPageIndex(0);
            }}
          />
        </label>

        <RenderComponent condition={enableRowSelection}>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {selectedCount} selecionado(s)
          </p>
        </RenderComponent>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <RenderComponent condition={error}>
          <ErrorState onRetry={onRetry} />
        </RenderComponent>

        <RenderComponent condition={!error}>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      <RenderComponent condition={!header.isPlaceholder}>
                        <RenderComponent condition={header.column.getCanSort()}>
                          <Button
                            type="button"
                            variant="ghost"
                            className="min-h-11 px-2"
                            onClick={header.column.getToggleSortingHandler()}
                            aria-label={`Ordenar por ${String(header.column.columnDef.header ?? header.column.id)}`}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <RenderComponent condition={header.column.getIsSorted() === 'asc'}>
                              <ArrowUp className="size-4" aria-hidden="true" />
                            </RenderComponent>

                            <RenderComponent condition={header.column.getIsSorted() === 'desc'}>
                              <ArrowDown className="size-4" aria-hidden="true" />
                            </RenderComponent>

                            <RenderComponent condition={!header.column.getIsSorted()}>
                              <ArrowUpDown className="size-4" aria-hidden="true" />
                            </RenderComponent>
                          </Button>
                        </RenderComponent>
                        <RenderComponent condition={!header.column.getCanSort()}>{flexRender(header.column.columnDef.header, header.getContext())}</RenderComponent>
                      </RenderComponent>
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              <RenderComponent condition={loading}>
                {Array.from({ length: Math.min(pagination.pageSize, 5) }, (_, index) => (
                  <TableRow key={`skeleton-${index}`} aria-hidden="true">
                    {table.getVisibleLeafColumns().map((column) => (
                      <TableCell key={column.id}>
                        <Skeleton className="h-5 w-3/4" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </RenderComponent>

              <RenderComponent condition={!loading}>
                <RenderComponent condition={table.getRowModel().rows.length > 0}>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} data-state={row.getIsSelected() ? 'selected' : undefined}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </RenderComponent>
                <RenderComponent condition={table.getRowModel().rows.length == 0}>
                  <TableRow>
                    <TableCell colSpan={table.getVisibleLeafColumns().length} className="p-4">
                      <EmptyState title={emptyTitle} description={emptyDescription} />
                    </TableCell>
                  </TableRow>
                </RenderComponent>
              </RenderComponent>
            </TableBody>
          </Table>
        </RenderComponent>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground">
          Itens por página
          <select
            className="min-h-11 rounded-md border border-input bg-background px-3 text-foreground"
            value={pagination.pageSize}
            onChange={(event) => table.setPageSize(Number(event.target.value))}
            aria-label="Itens por página"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="text-sm text-muted-foreground" aria-live="polite">
            Página {pagination.pageIndex + 1} de {pageCount} · {rowCount} registro(s)
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="icon" className="min-h-11 min-w-11" aria-label="Página anterior" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button type="button" variant="outline" size="icon" className="min-h-11 min-w-11" aria-label="Próxima página" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
