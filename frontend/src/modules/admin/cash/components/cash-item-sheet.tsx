import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Minus, Plus, ScanBarcode, Search, Scissors, ShoppingBag } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { CashCatalogProduct, CashCatalogService } from '@/modules/admin/cash/api/cash';
import { useAddCashTabItem, useCashCatalog } from '@/modules/admin/cash/hooks/use-cash';
import { cashItemSchema, type CashItemValues } from '@/modules/admin/cash/schemas/cash-item.schema';
import { ConfirmDialog } from '@/shared/components/confirm-dialog';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { formatBRL, formatDuration } from '@/shared/lib/format';
import { useMediaQuery } from '@/shared/hooks/use-media-query';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/shared/ui/drawer';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';

type CashItemSelection = { type: 'service'; item: CashCatalogService } | { type: 'product'; item: CashCatalogProduct };

interface CashItemSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tabId: number;
  defaultBarberId: number | null;
}

export function CashItemSheet({ open, onOpenChange, tabId, defaultBarberId }: CashItemSheetProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const catalogQuery = useCashCatalog();
  const addItem = useAddCashTabItem();
  const [activeTab, setActiveTab] = useState<'services' | 'products'>('services');
  const [searchTerm, setSearchTerm] = useState('');
  const [barcode, setBarcode] = useState('');
  const [selectedItem, setSelectedItem] = useState<CashItemSelection | null>(null);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const form = useForm<CashItemValues>({ resolver: zodResolver(cashItemSchema), defaultValues: { qty: 1, barberId: defaultBarberId } });
  const { reset } = form;
  const products = catalogQuery.data?.products ?? [];
  const services = catalogQuery.data?.services ?? [];
  const search = searchTerm.trim().toLocaleLowerCase('pt-BR');
  const visibleServices = useMemo(() => services.filter((item) => !search || `${item.name} ${item.description}`.toLocaleLowerCase('pt-BR').includes(search)), [search, services]);
  const visibleProducts = useMemo(() => products.filter((item) => !search || `${item.name} ${item.sku}`.toLocaleLowerCase('pt-BR').includes(search)), [products, search]);
  const hasUnsavedChanges = Boolean(selectedItem) || form.formState.isDirty;

  useEffect(() => {
    if (!open) return;
    setActiveTab('services');
    setSearchTerm('');
    setBarcode('');
    setSelectedItem(null);
    reset({ qty: 1, barberId: defaultBarberId });
    const focusFrame = window.requestAnimationFrame(() => document.getElementById('cash-barcode')?.focus());
    return () => window.cancelAnimationFrame(focusFrame);
  }, [defaultBarberId, open, reset]);

  function requestOpenChange(nextOpen: boolean) {
    if (!nextOpen && hasUnsavedChanges && !addItem.isPending) {
      setConfirmCloseOpen(true);
      return;
    }
    onOpenChange(nextOpen);
  }

  function handleBarcode(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const code = barcode.trim().toLocaleLowerCase('pt-BR');
    if (!code) return;
    const product = products.find((item) => item.sku.toLocaleLowerCase('pt-BR') === code);
    if (!product) {
      toast.error('Produto não encontrado pelo código ou SKU informado.');
      return;
    }
    setActiveTab('products');
    setSelectedItem({ type: 'product', item: product });
    setBarcode('');
    form.setValue('qty', 1, { shouldDirty: true });
  }

  function selectItem(selection: CashItemSelection) {
    setSelectedItem(selection);
    form.setValue('qty', 1, { shouldDirty: true });
  }

  function submit(values: CashItemValues) {
    if (!selectedItem) {
      toast.error('Selecione um serviço ou produto.');
      return;
    }
    addItem.mutate(
      { id: tabId, item: { type: selectedItem.type, refId: selectedItem.item.id, qty: values.qty, barberId: values.barberId } },
      {
        onSuccess: () => {
          setSelectedItem(null);
          reset({ qty: 1, barberId: defaultBarberId });
          onOpenChange(false);
        },
      },
    );
  }

  const itemForm = (
    <div className="space-y-5 px-4 pb-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium" htmlFor="cash-barcode">
          <span className="flex items-center gap-2">
            <ScanBarcode className="size-4" aria-hidden="true" />
            Leitor de código de barras
          </span>
          <Input
            id="cash-barcode"
            autoComplete="off"
            value={barcode}
            onChange={(event) => setBarcode(event.target.value)}
            onKeyDown={handleBarcode}
            placeholder="Escaneie ou digite o SKU"
            className="min-h-11"
          />
        </label>
        <label className="space-y-2 text-sm font-medium" htmlFor="cash-catalog-search">
          <span className="flex items-center gap-2">
            <Search className="size-4" aria-hidden="true" />
            Buscar no catálogo
          </span>
          <Input id="cash-catalog-search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Nome do serviço ou produto" className="min-h-11" />
        </label>
      </div>

      {catalogQuery.isError ?
        <ErrorState title="Não foi possível carregar o catálogo" description="Confira sua conexão e tente novamente." onRetry={() => void catalogQuery.refetch()} />
      : catalogQuery.isPending ?
        <Skeleton className="h-56 rounded-xl" />
      : <>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'services' | 'products')}>
            <TabsList className="grid h-11 w-full grid-cols-2">
              <TabsTrigger value="services">
                <Scissors className="size-4" aria-hidden="true" />
                Serviços
              </TabsTrigger>
              <TabsTrigger value="products">
                <ShoppingBag className="size-4" aria-hidden="true" />
                Produtos
              </TabsTrigger>
            </TabsList>
            <TabsContent value="services" className="mt-4">
              {visibleServices.length ?
                <div className="grid max-h-64 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {visibleServices.map((service) => (
                    <Card key={service.id} className={selectedItem?.type === 'service' && selectedItem.item.id === service.id ? 'border-primary ring-1 ring-primary/20' : undefined}>
                      <CardContent className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{service.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDuration(service.durationMin)} · {formatBRL(service.price)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant={selectedItem?.type === 'service' && selectedItem.item.id === service.id ? 'secondary' : 'outline'}
                          className="min-h-11"
                          onClick={() => selectItem({ type: 'service', item: service })}
                        >
                          {selectedItem?.type === 'service' && selectedItem.item.id === service.id ? 'Selecionado' : 'Selecionar'}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              : <EmptyState title="Nenhum serviço encontrado" description="Tente outro termo de busca." />}
            </TabsContent>
            <TabsContent value="products" className="mt-4">
              {visibleProducts.length ?
                <div className="grid max-h-64 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {visibleProducts.map((product) => (
                    <Card key={product.id} className={selectedItem?.type === 'product' && selectedItem.item.id === product.id ? 'border-primary ring-1 ring-primary/20' : undefined}>
                      <CardContent className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{product.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {product.sku} · {formatBRL(product.price)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant={selectedItem?.type === 'product' && selectedItem.item.id === product.id ? 'secondary' : 'outline'}
                          className="min-h-11"
                          onClick={() => selectItem({ type: 'product', item: product })}
                        >
                          {selectedItem?.type === 'product' && selectedItem.item.id === product.id ? 'Selecionado' : 'Selecionar'}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              : <EmptyState title="Nenhum produto encontrado" description="Tente outro termo de busca." />}
              <p className="mt-3 text-xs text-muted-foreground">O estoque disponível é conferido pelo servidor ao adicionar o item.</p>
            </TabsContent>
          </Tabs>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} className="space-y-4 border-t border-border pt-4">
              {selectedItem && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{selectedItem.item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedItem.type === 'service' ? 'Serviço' : 'Produto'} · {formatBRL(selectedItem.item.price)}
                    </p>
                  </div>
                  <Badge variant="secondary">Selecionado</Badge>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="qty"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel htmlFor="cash-qty">Quantidade</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-11"
                            aria-label="Diminuir quantidade"
                            disabled={field.value <= 1}
                            onClick={() => field.onChange(Math.max(1, field.value - 1))}
                          >
                            <Minus className="size-4" aria-hidden="true" />
                          </Button>
                          <Input
                            id="cash-qty"
                            type="number"
                            min={1}
                            max={50}
                            inputMode="numeric"
                            aria-invalid={fieldState.invalid}
                            aria-describedby={fieldState.error ? 'cash-qty-error' : undefined}
                            className="min-h-11 text-center"
                            value={field.value}
                            onChange={(event) => field.onChange(Number(event.target.value))}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-11"
                            aria-label="Aumentar quantidade"
                            disabled={field.value >= 50}
                            onClick={() => field.onChange(Math.min(50, field.value + 1))}
                          >
                            <Plus className="size-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage id="cash-qty-error" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="barberId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Barbeiro responsável</FormLabel>
                      <Select value={field.value ? String(field.value) : 'none'} onValueChange={(value) => field.onChange(value === 'none' ? null : Number(value))}>
                        <FormControl>
                          <SelectTrigger className="min-h-11 w-full">
                            <SelectValue placeholder="Selecione um barbeiro" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Sem profissional</SelectItem>
                          {(catalogQuery.data?.barbers ?? []).map((barber) => (
                            <SelectItem key={barber.id} value={String(barber.id)}>
                              {barber.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" className="min-h-11 w-full" disabled={!selectedItem || addItem.isPending || catalogQuery.isError}>
                {addItem.isPending ? 'Adicionando item…' : 'Adicionar item à comanda'}
              </Button>
            </form>
          </Form>
        </>
      }
    </div>
  );

  const confirmClose = (
    <ConfirmDialog
      open={confirmCloseOpen}
      onOpenChange={setConfirmCloseOpen}
      title="Descartar item selecionado?"
      description="O item ainda não foi adicionado à comanda."
      cancelLabel="Continuar escolhendo"
      confirmLabel="Descartar"
      destructive
      onConfirm={() => {
        setConfirmCloseOpen(false);
        setSelectedItem(null);
        reset({ qty: 1, barberId: defaultBarberId });
        onOpenChange(false);
      }}
    />
  );

  if (isDesktop) {
    return (
      <>
        <Dialog open={open} onOpenChange={requestOpenChange}>
          <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Adicionar item à comanda</DialogTitle>
              <DialogDescription>Escolha serviços ou produtos. O preço base pode variar por profissional; o servidor confirma preço, comissão e estoque.</DialogDescription>
            </DialogHeader>
            {itemForm}
          </DialogContent>
        </Dialog>
        {confirmClose}
      </>
    );
  }

  return (
    <>
      <Drawer open={open} onOpenChange={requestOpenChange}>
        <DrawerContent className="max-h-[92dvh] overflow-y-auto rounded-t-2xl">
          <DrawerHeader className="pr-12 text-left">
            <DrawerTitle>Adicionar item à comanda</DrawerTitle>
            <DrawerDescription>Escolha serviços ou produtos. O preço base pode variar por profissional; o servidor confirma preço, comissão e estoque.</DrawerDescription>
          </DrawerHeader>
          {itemForm}
        </DrawerContent>
      </Drawer>
      {confirmClose}
    </>
  );
}
