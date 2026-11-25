import {useEffect} from 'react'
import {zodResolver} from '@hookform/resolvers/zod'
import {useForm} from 'react-hook-form'
import {AlertCircle, LoaderCircle} from 'lucide-react'
import {serviceSchema, type ServiceFormValues} from '@/modules/admin/catalog/schemas/service.schema'
import {useAdminService, useCatalogBarbers, useSaveAdminService, useServiceCategories} from '@/modules/admin/catalog/hooks/use-catalog'
import {CatalogImageField} from '@/modules/admin/catalog/components/catalog-image-field'
import {DurationInput} from '@/shared/components/duration-input'
import {MoneyInput} from '@/shared/components/money-input'
import {ErrorState} from '@/shared/components/error-state'
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/shared/components/form-field'
import {Button} from '@/shared/ui/button'
import {Checkbox} from '@/shared/ui/checkbox'
import {Input} from '@/shared/ui/input'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/shared/ui/select'
import {Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle} from '@/shared/ui/sheet'
import {Switch} from '@/shared/ui/switch'
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/shared/ui/tabs'
import {Textarea} from '@/shared/ui/textarea'

interface ServiceDrawerProps {
  open: boolean
  serviceId: string | null
  onOpenChange: (open: boolean) => void
}

function emptyService(barbers: Array<{id: number; name: string; photo: string | null}>, categoryId: number): ServiceFormValues {
  return {
    name: '',
    categoryId,
    description: '',
    image: '',
    durationMin: 30,
    bufferMin: 0,
    price: 0,
    commissionPct: 45,
    active: true,
    featured: false,
    barberAssignments: barbers.map(barber => ({barberId: barber.id, name: barber.name, photo: barber.photo, assigned: true, durationMin: null, price: null, commissionPct: null}))
  }
}

export function ServiceDrawer({open, serviceId, onOpenChange}: ServiceDrawerProps) {
  const editingId = serviceId && serviceId !== 'novo' ? serviceId : null
  const serviceQuery = useAdminService(editingId, open)
  const categoriesQuery = useServiceCategories()
  const barbersQuery = useCatalogBarbers(open)
  const saveService = useSaveAdminService()
  const form = useForm<ServiceFormValues>({resolver: zodResolver(serviceSchema), defaultValues: emptyService([], 0)})
  const categories = categoriesQuery.data ?? []
  const barbers = barbersQuery.data ?? []
  const waitingForData = categoriesQuery.isPending || barbersQuery.isPending || (Boolean(editingId) && serviceQuery.isPending)

  useEffect(() => {
    if (!open || categoriesQuery.isError || barbersQuery.isError) return
    if (!editingId && categoriesQuery.data && barbersQuery.data) {
      form.reset(emptyService(barbersQuery.data, categoriesQuery.data[0]?.id ?? 0))
    } else if (editingId && serviceQuery.data) {
      const {barberAssignments, ...service} = serviceQuery.data
      form.reset({...emptyService(barbers, categories[0]?.id ?? 0), ...service, image: service.image || '', barberAssignments})
    }
  }, [barbers, barbersQuery.data, barbersQuery.isError, categories, categoriesQuery.data, categoriesQuery.isError, editingId, form, open, serviceQuery.data])

  function requestOpenChange(nextOpen: boolean) {
    if (!nextOpen && form.formState.isDirty && !window.confirm('Descartar as alterações deste serviço?')) return
    if (!nextOpen) form.reset()
    onOpenChange(nextOpen)
  }

  async function onSubmit(values: ServiceFormValues) {
    try {
      await saveService.mutateAsync({id: editingId, service: values})
      form.reset(values)
      onOpenChange(false)
    } catch {
      // The mutation reports server errors with a toast; keep the drawer open for correction.
    }
  }

  const imageError = form.formState.errors.image?.message
  const assignmentError = form.formState.errors.barberAssignments?.message

  return (
    <Sheet open={open} onOpenChange={requestOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-2xl">
        <SheetHeader className="border-b border-border pr-12">
          <SheetTitle>{editingId ? 'Editar serviço' : 'Novo serviço'}</SheetTitle>
          <SheetDescription>Defina os dados, o tempo e os profissionais que realizam este serviço.</SheetDescription>
        </SheetHeader>

        {categoriesQuery.isError || barbersQuery.isError || (editingId && serviceQuery.isError) ?
          <div className="p-5">
            <ErrorState
              title="Não foi possível carregar os dados do serviço"
              description="Confira sua conexão e tente novamente."
              onRetry={() => {
                void categoriesQuery.refetch()
                void barbersQuery.refetch()
                if (editingId) void serviceQuery.refetch()
              }}
            />
          </div>
        : waitingForData ?
          <div className="flex min-h-64 items-center justify-center p-6 text-muted-foreground" role="status">
            <LoaderCircle className="mr-2 size-4 animate-spin" aria-hidden="true" />
            Carregando dados do serviço...
          </div>
        : <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
              <Tabs defaultValue="geral" className="flex flex-1 flex-col">
                <div className="border-b border-border px-5 py-3">
                  <TabsList className="grid h-auto w-full grid-cols-3">
                    <TabsTrigger className="min-h-11" value="geral">
                      Geral
                    </TabsTrigger>
                    <TabsTrigger className="min-h-11" value="tempo">
                      Tempo e preço
                    </TabsTrigger>
                    <TabsTrigger className="min-h-11" value="profissionais">
                      Profissionais
                    </TabsTrigger>
                  </TabsList>
                </div>
                <div className="flex-1 space-y-6 overflow-y-auto p-5">
                  <TabsContent value="geral" className="space-y-5">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>Nome do serviço</FormLabel>
                          <FormControl>
                            <Input {...field} autoFocus placeholder="Ex.: Corte tradicional" className="min-h-11" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>Categoria</FormLabel>
                          <Select value={field.value ? String(field.value) : ''} onValueChange={value => field.onChange(Number(value))}>
                            <FormControl>
                              <SelectTrigger className="min-h-11 w-full">
                                <SelectValue placeholder="Selecione uma categoria" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map(category => (
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
                    <FormField
                      control={form.control}
                      name="description"
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={4} placeholder="Descreva o serviço para a equipe e os clientes." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <CatalogImageField
                      label="Foto"
                      value={form.watch('image') || ''}
                      maxBytes={1024 * 1024}
                      onChange={value => {
                        form.setValue('image', value, {shouldDirty: true})
                        form.clearErrors('image')
                      }}
                      onError={message => (message ? form.setError('image', {message}) : form.clearErrors('image'))}
                    />
                    {imageError && (
                      <p className="text-sm text-destructive" role="alert">
                        {imageError}
                      </p>
                    )}
                    <div className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div>
                        <p className="font-medium">Serviço ativo</p>
                        <p className="text-sm text-muted-foreground">Serviços inativos não aparecem para novos agendamentos.</p>
                      </div>
                      <FormField control={form.control} name="active" render={({field}) => <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Serviço ativo" />} />
                    </div>
                    <FormField
                      control={form.control}
                      name="featured"
                      render={({field}) => (
                        <FormItem className="flex items-center gap-3 rounded-lg border border-border p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={checked => field.onChange(checked === true)} />
                          </FormControl>
                          <FormLabel className="cursor-pointer">Destacar este serviço no catálogo público</FormLabel>
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="tempo" className="space-y-5">
                    <FormField
                      control={form.control}
                      name="durationMin"
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>Duração</FormLabel>
                          <FormControl>
                            <DurationInput value={field.value} onValueChange={field.onChange} min={5} />
                          </FormControl>
                          <p className="text-sm text-muted-foreground">A duração deve ser múltipla de 5 minutos.</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bufferMin"
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>Intervalo após o serviço</FormLabel>
                          <FormControl>
                            <DurationInput value={field.value} onValueChange={field.onChange} min={0} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="price"
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>Preço</FormLabel>
                          <FormControl>
                            <MoneyInput id="service-price" value={field.value} onValueChange={field.onChange} aria-label="Preço do serviço" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="commissionPct"
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>Comissão padrão (%)</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" max="100" step="0.1" value={field.value} onChange={event => field.onChange(Number(event.target.value))} className="min-h-11" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">Alterar o preço padrão não muda os valores dos agendamentos já criados.</p>
                  </TabsContent>

                  <TabsContent value="profissionais" className="space-y-4">
                    <p className="text-sm text-muted-foreground">Escolha quem realiza o serviço. Campos vazios usam o tempo, preço e comissão padrão.</p>
                    {form.watch('barberAssignments').map((assignment, index) => (
                      <section key={assignment.barberId} className="space-y-3 rounded-xl border border-border p-4">
                        <label className="flex min-h-11 cursor-pointer items-center gap-3">
                          <Checkbox
                            checked={assignment.assigned}
                            onCheckedChange={checked => form.setValue(`barberAssignments.${index}.assigned`, checked === true, {shouldDirty: true, shouldValidate: true})}
                            aria-label={`Serviço realizado por ${assignment.name}`}
                          />
                          <span className="font-medium">{assignment.name}</span>
                        </label>
                        {assignment.assigned && (
                          <div className="grid gap-3 sm:grid-cols-3">
                            <label className="space-y-1 text-sm">
                              <span>Duração específica (min)</span>
                              <Input
                                type="number"
                                min="5"
                                step="5"
                                value={assignment.durationMin ?? ''}
                                onChange={event =>
                                  form.setValue(`barberAssignments.${index}.durationMin`, event.target.value === '' ? null : Number(event.target.value), {shouldDirty: true, shouldValidate: true})
                                }
                                className="min-h-11"
                              />
                            </label>
                            <label className="space-y-1 text-sm">
                              <span>Preço específico</span>
                              <MoneyInput
                                id={`service-price-${assignment.barberId}`}
                                value={assignment.price ?? 0}
                                onValueChange={value => form.setValue(`barberAssignments.${index}.price`, value === 0 ? null : value, {shouldDirty: true, shouldValidate: true})}
                                aria-label={`Preço de ${assignment.name}`}
                              />
                            </label>
                            <label className="space-y-1 text-sm">
                              <span>Comissão específica (%)</span>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={assignment.commissionPct ?? ''}
                                onChange={event =>
                                  form.setValue(`barberAssignments.${index}.commissionPct`, event.target.value === '' ? null : Number(event.target.value), {shouldDirty: true, shouldValidate: true})
                                }
                                className="min-h-11"
                              />
                            </label>
                          </div>
                        )}
                      </section>
                    ))}
                    {assignmentError && (
                      <p className="text-sm text-destructive" role="alert">
                        <AlertCircle className="mr-1 inline size-4" aria-hidden="true" />
                        {String(assignmentError)}
                      </p>
                    )}
                    {Object.entries(form.formState.errors.barberAssignments ?? {}).map(([key, value]) =>
                      key !== 'message' && typeof value === 'object' && value !== null ?
                        <p key={key} className="text-sm text-destructive" role="alert">
                          Confira os overrides do profissional selecionado.
                        </p>
                      : null
                    )}
                  </TabsContent>
                </div>
              </Tabs>
              <SheetFooter className="border-t border-border bg-background">
                <Button type="button" variant="outline" className="min-h-11" onClick={() => requestOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="min-h-11" disabled={saveService.isPending || !form.formState.isDirty}>
                  {saveService.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                  {editingId ? 'Salvar serviço' : 'Criar serviço'}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        }
      </SheetContent>
    </Sheet>
  )
}
