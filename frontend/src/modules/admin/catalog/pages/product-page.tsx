import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useParams } from 'wouter';
import { ArrowLeft, AlertTriangle, LoaderCircle } from 'lucide-react';
import { CatalogImageField } from '@/modules/admin/catalog/components/catalog-image-field';
import { AdjustStockDialog } from '@/modules/admin/catalog/components/adjust-stock-dialog';
import { useProduct, useProductCategories, useSaveProduct } from '@/modules/admin/catalog/hooks/use-products';
import { productSchema, type ProductFormValues } from '@/modules/admin/catalog/schemas/product.schema';
import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/components/form-field';
import { MoneyInput } from '@/shared/components/money-input';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';

function blankProduct(categoryId: number): ProductFormValues {
  return { sku: '', name: '', categoryId, price: 0, costCents: 0, stock: 0, minStock: 0, kind: 'resale', commissionPct: 10, image: '', active: true };
}

export default function ProductPage() {
  const params = useParams<{ id: string }>();
  const productId = params.id ?? 'novo';
  const editing = productId !== 'novo';
  const [, navigate] = useLocation();
  const productQuery = useProduct(editing ? productId : null, editing);
  const categoriesQuery = useProductCategories();
  const saveProduct = useSaveProduct();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const form = useForm<ProductFormValues>({ resolver: zodResolver(productSchema), defaultValues: blankProduct(0) });
  const categories = categoriesQuery.data ?? [];
  const product = productQuery.data;
  const lowStock = Boolean(product && product.stock < product.minStock);
  const waitingForData = categoriesQuery.isPending || (editing && productQuery.isPending);

  useEffect(() => {
    document.title = `${editing ? 'Produto' : 'Novo produto'} | Painel administrativo`;
  }, [editing]);

  useEffect(() => {
    if (categoriesQuery.isError) return;
    if (editing && product) form.reset(product, { keepDirtyValues: true });
    else if (!editing && categoriesQuery.data) form.reset(blankProduct(categoriesQuery.data[0]?.id ?? 0));
  }, [categoriesQuery.data, categoriesQuery.isError, editing, form, product]);

  async function onSubmit(values: ProductFormValues) {
    try {
      const saved = await saveProduct.mutateAsync({ id: editing ? productId : null, product: values });
      form.reset({ ...values, stock: saved.stock });
      if (!editing) navigate(`/admin/produtos/${saved.id}`);
    } catch (error) {
      if (error instanceof Error && error.message.toLocaleLowerCase('pt-BR').includes('sku')) form.setError('sku', { message: error.message });
    }
  }

  const imageError = form.formState.errors.image?.message;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Painel administrativo"
        title={editing ? (product?.name ?? 'Produto') : 'Novo produto'}
        description={editing ? 'Atualize os dados, valores e nível mínimo de estoque.' : 'Cadastre um produto para revenda ou uso interno.'}
        actions={
          <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
            <Link href="/admin/produtos">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Voltar para produtos
            </Link>
          </Button>
        }
      />

      {categoriesQuery.isError ?
        <ErrorState title="Não foi possível carregar as categorias" description="Tente carregar os dados novamente." onRetry={() => void categoriesQuery.refetch()} />
      : editing && productQuery.isError ?
        <ErrorState title="Não foi possível carregar o produto" description="Confira se o produto ainda existe e tente novamente." onRetry={() => void productQuery.refetch()} />
      : waitingForData ?
        <Skeleton className="h-[36rem] rounded-xl" aria-label="Carregando dados do produto" />
      : <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <Tabs defaultValue="geral" className="rounded-xl border border-border bg-card">
              <div className="border-b border-border p-4">
                <TabsList className="grid h-auto w-full grid-cols-3">
                  <TabsTrigger className="min-h-11" value="geral">
                    Geral
                  </TabsTrigger>
                  <TabsTrigger className="min-h-11" value="preco">
                    Preço e custo
                  </TabsTrigger>
                  <TabsTrigger className="min-h-11" value="estoque">
                    Estoque
                  </TabsTrigger>
                </TabsList>
              </div>
              <div className="p-4 sm:p-6">
                <TabsContent value="geral" className="max-w-2xl space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
                          <FormControl>
                            <Input {...field} autoFocus placeholder="Ex.: Pomada matte" className="min-h-11" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sku"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SKU</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex.: BAR-021" className="min-h-11 uppercase" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria</FormLabel>
                        <Select value={field.value ? String(field.value) : ''} onValueChange={(value) => field.onChange(Number(value))}>
                          <FormControl>
                            <SelectTrigger className="min-h-11 w-full">
                              <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={String(category.id)}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <CatalogImageField
                    label="Foto"
                    value={form.watch('image') || ''}
                    maxBytes={200 * 1024}
                    onChange={(value) => {
                      form.setValue('image', value, { shouldDirty: true });
                      form.clearErrors('image');
                    }}
                    onError={(message) => (message ? form.setError('image', { message }) : form.clearErrors('image'))}
                  />
                  {imageError && (
                    <p className="text-sm text-destructive" role="alert">
                      {imageError}
                    </p>
                  )}
                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex min-h-11 items-center gap-3 rounded-lg border border-border p-3">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                        </FormControl>
                        <FormLabel className="cursor-pointer">Produto ativo no catálogo</FormLabel>
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="preco" className="max-w-2xl space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preço de venda</FormLabel>
                          <FormControl>
                            <MoneyInput id="product-price" value={field.value} onValueChange={field.onChange} aria-label="Preço de venda" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="costCents"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custo</FormLabel>
                          <FormControl>
                            <MoneyInput id="product-cost" value={field.value} onValueChange={field.onChange} aria-label="Custo do produto" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-sm font-medium">Margem estimada</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums">
                      {form.watch('price') > 0 ? `${(((form.watch('price') - form.watch('costCents')) / form.watch('price')) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">Calculada pelo preço de venda menos o custo; não é salva como valor separado.</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="kind"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de produto</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="min-h-11 w-full">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="resale">Revenda</SelectItem>
                              <SelectItem value="supply">Insumo interno</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="commissionPct"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Comissão por venda (%)</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" max="100" step="0.1" value={field.value} onChange={(event) => field.onChange(Number(event.target.value))} className="min-h-11" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="estoque" className="max-w-2xl space-y-5">
                  {editing && product ?
                    <div
                      className={lowStock ? 'flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-destructive' : 'rounded-lg border border-border bg-muted p-4'}
                    >
                      {lowStock && <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />}
                      <div>
                        <p className="font-semibold">Saldo atual: {product.stock}</p>
                        <p className="text-sm">{lowStock ? `Abaixo do mínimo de ${product.minStock}.` : `Estoque mínimo: ${product.minStock}.`}</p>
                      </div>
                      <Badge className="ml-auto" variant={lowStock ? 'destructive' : 'secondary'}>
                        {lowStock ? 'Estoque baixo' : 'Normal'}
                      </Badge>
                    </div>
                  : <FormField
                      control={form.control}
                      name="stock"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Saldo inicial</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="0" step="1" onChange={(event) => field.onChange(Number(event.target.value))} className="min-h-11" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  }
                  <FormField
                    control={form.control}
                    name="minStock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estoque mínimo</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min="0" step="1" onChange={(event) => field.onChange(Number(event.target.value))} className="min-h-11" />
                        </FormControl>
                        <p className="text-sm text-muted-foreground">Quando o saldo ficar abaixo deste valor, o dashboard mostrará um alerta.</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {editing && product && (
                    <Button type="button" variant="outline" className="min-h-11" onClick={() => setAdjustOpen(true)}>
                      Ajustar saldo
                    </Button>
                  )}
                </TabsContent>
              </div>
            </Tabs>

            <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
              <Button type="button" asChild variant="outline" className="min-h-11">
                <Link href="/admin/produtos">Cancelar</Link>
              </Button>
              <Button type="submit" className="min-h-11" disabled={saveProduct.isPending || !form.formState.isDirty}>
                {saveProduct.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                {editing ? 'Salvar produto' : 'Cadastrar produto'}
              </Button>
            </div>
          </form>
        </Form>
      }

      {editing && product && <AdjustStockDialog open={adjustOpen} onOpenChange={setAdjustOpen} productId={product.id} productName={product.name} currentStock={product.stock} />}
    </div>
  );
}
