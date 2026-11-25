import {useEffect, useMemo, useState} from 'react'
import {useQueryClient} from '@tanstack/react-query'
import {zodResolver} from '@hookform/resolvers/zod'
import {useForm, useWatch} from 'react-hook-form'
import {useLocation, useSearch} from 'wouter'
import {toast} from 'sonner'
import {
  useAgendaBarbers,
  useAgendaAvailabilitySlots,
  useAgendaCustomerSuggestions,
  useAgendaEligibleBarbers,
  useAgendaServices,
  useCreateAgendaAppointment
} from '@/modules/admin/agenda/hooks/use-agenda'
import type {AgendaCustomer} from '@/modules/admin/agenda/api/agenda'
import {createAppointmentSchema, type CreateAppointmentValues} from '@/modules/admin/agenda/schemas/create-appointment.schema'
import {createQuickAgendaCustomer} from '@/modules/admin/agenda/api/agenda'
import {useSessionStore} from '@/shared/stores/session-store'
import {formatBRL, formatDuration, formatDateTime} from '@/shared/lib/format'
import {BUSINESS_TIME_ZONE} from '@/shared/lib/time'
import {Button} from '@/shared/ui/button'
import {Checkbox} from '@/shared/ui/checkbox'
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/shared/ui/form'
import {Input} from '@/shared/ui/input'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/shared/ui/select'
import {Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle} from '@/shared/ui/sheet'
import {Skeleton} from '@/shared/ui/skeleton'
import {Textarea} from '@/shared/ui/textarea'
import {SlotGrid} from '@/shared/components/slot-grid'
import {ErrorState} from '@/shared/components/error-state'
import {ConfirmDialog} from '@/shared/components/confirm-dialog'

const stepTitles = ['Cliente', 'Serviços', 'Horário', 'Revisão']

function dateTimeParts(value: string | null) {
  if (!value) return {date: '', time: ''}
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return {date: '', time: ''}
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone: BUSINESS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'}).format(date)
  const time = new Intl.DateTimeFormat('pt-BR', {timeZone: BUSINESS_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(date)
  return {date: parts, time}
}

function localTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {timeZone: BUSINESS_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(new Date(value))
}

function todayInBusinessTimeZone() {
  return new Intl.DateTimeFormat('en-CA', {timeZone: BUSINESS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date())
}

function phoneForDisplay(value?: string | null) {
  return value?.trim() || 'Telefone não informado'
}

interface CreateAppointmentDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateAppointmentDrawer({open, onOpenChange}: CreateAppointmentDrawerProps) {
  const search = useSearch()
  const [, setLocation] = useLocation()
  const queryClient = useQueryClient()
  const user = useSessionStore(state => state.user)
  const params = useMemo(() => new URLSearchParams(search), [search])
  const prefillStart = params.get('start')
  const prefillBarberId = params.get('barberId') ?? ''
  const initialDateTime = dateTimeParts(prefillStart)
  const canManage = Boolean(user && (user.role === 'admin' || user.role === 'manager' || user.role === 'reception' || user.permissions.includes('agenda.manage')))
  const isBarber = user?.role === 'barber'
  const [step, setStep] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<AgendaCustomer | null>(null)
  const [quickCustomerName, setQuickCustomerName] = useState('')
  const [quickCustomerPhone, setQuickCustomerPhone] = useState('')
  const [quickCustomerError, setQuickCustomerError] = useState('')
  const [formError, setFormError] = useState('')
  const [discardOpen, setDiscardOpen] = useState(false)
  const form = useForm<CreateAppointmentValues>({
    resolver: zodResolver(createAppointmentSchema),
    defaultValues: {
      customerId: '',
      serviceIds: [],
      barberId: prefillBarberId,
      date: initialDateTime.date || todayInBusinessTimeZone(),
      start: '',
      notes: '',
      expectedPaymentMethod: '',
      bypassAdvance: false,
      allowOutOfHours: false
    }
  })
  const customerId = useWatch({control: form.control, name: 'customerId'})
  const serviceIds = useWatch({control: form.control, name: 'serviceIds'})
  const barberId = useWatch({control: form.control, name: 'barberId'})
  const date = useWatch({control: form.control, name: 'date'})
  const selectedStart = useWatch({control: form.control, name: 'start'})
  const expectedPaymentMethod = useWatch({control: form.control, name: 'expectedPaymentMethod'})
  const bypassAdvance = useWatch({control: form.control, name: 'bypassAdvance'})
  const allowOutOfHours = useWatch({control: form.control, name: 'allowOutOfHours'})
  const servicesQuery = useAgendaServices()
  const customerSuggestions = useAgendaCustomerSuggestions(searchTerm)
  const barberProfiles = useAgendaBarbers(isBarber ? Number(user?.id) : undefined)
  const barberOptions = useAgendaEligibleBarbers(serviceIds.map(Number))
  const eligibleBarbers = isBarber ? (barberOptions.data?.filter(barber => barber.id === barberProfiles.data?.[0]?.id) ?? []) : (barberOptions.data ?? [])
  const availability = useAgendaAvailabilitySlots({serviceIds: serviceIds.map(Number), barberId: barberId ? Number(barberId) : null, date, bypassAdvance, allowOutOfHours})
  const createMutation = useCreateAgendaAppointment()
  const slots = availability.data ?? []
  const selectedSlot = slots.find(slot => slot.start === selectedStart)
  const selectedBarber = eligibleBarbers.find(barber => barber.id === Number(barberId))
  const selectedServices = (servicesQuery.data ?? []).filter(service => serviceIds.includes(String(service.id)))
  const queryClientId = String(customerId || '')

  useEffect(() => {
    if (!open) return
    setStep(0)
    setSearchTerm('')
    setSelectedCustomer(null)
    setQuickCustomerName('')
    setQuickCustomerPhone('')
    setQuickCustomerError('')
    setFormError('')
    form.reset({
      customerId: '',
      serviceIds: [],
      barberId: prefillBarberId,
      date: initialDateTime.date || todayInBusinessTimeZone(),
      start: '',
      notes: '',
      expectedPaymentMethod: '',
      bypassAdvance: false,
      allowOutOfHours: false
    })
  }, [form, initialDateTime.date, open, prefillBarberId])

  useEffect(() => {
    if (isBarber && barberProfiles.data?.[0]) form.setValue('barberId', String(barberProfiles.data[0].id), {shouldValidate: true})
  }, [barberProfiles.data, form, isBarber])

  useEffect(() => {
    if (!prefillStart || !slots.length || form.getValues('start')) return
    const target = new Date(prefillStart).getTime()
    const match = slots.find(slot => new Date(slot.start).getTime() === target)
    if (match) form.setValue('start', match.start, {shouldValidate: true})
  }, [form, prefillStart, slots])

  function closeDrawer(nextOpen: boolean) {
    if (!nextOpen) {
      if (form.formState.isDirty || quickCustomerName.trim() || quickCustomerPhone.trim()) {
        setDiscardOpen(true)
        return
      }
      onOpenChange(false)
      setLocation('/admin/agenda')
      return
    }
    onOpenChange(true)
  }

  function chooseCustomer(customer: AgendaCustomer) {
    setSelectedCustomer(customer)
    setSearchTerm('')
    setQuickCustomerError('')
    form.setValue('customerId', String(customer.id), {shouldValidate: true, shouldDirty: true})
  }

  async function registerQuickCustomer() {
    setQuickCustomerError('')
    const name = quickCustomerName.trim()
    const phone = quickCustomerPhone.replace(/\D/g, '')
    if (name.length < 2) {
      setQuickCustomerError('Informe o nome completo do cliente.')
      return
    }
    if (phone.length < 10) {
      setQuickCustomerError('Informe um telefone com DDD.')
      return
    }
    try {
      const customer = await createQuickAgendaCustomer({name, phone})
      chooseCustomer(customer)
      await queryClient.invalidateQueries({queryKey: ['admin-agenda-customer-suggestions']})
      toast.success('Cadastro rápido criado.')
    } catch (error) {
      setQuickCustomerError(error instanceof Error ? error.message : 'Não foi possível cadastrar o cliente.')
    }
  }

  function selectService(serviceId: number) {
    const id = String(serviceId)
    const current = form.getValues('serviceIds')
    const next = current.includes(id) ? current.filter(item => item !== id) : [...current, id]
    if (next.length > 4) {
      setFormError('Selecione no máximo quatro serviços.')
      return
    }
    setFormError('')
    form.setValue('serviceIds', next, {shouldValidate: true, shouldDirty: true})
    form.setValue('start', '', {shouldDirty: true})
    form.setValue('barberId', isBarber ? String(barberProfiles.data?.[0]?.id ?? '') : '', {shouldValidate: true, shouldDirty: true})
  }

  function selectBarber(value: string) {
    form.setValue('barberId', value, {shouldValidate: true, shouldDirty: true})
    form.setValue('start', '', {shouldDirty: true})
  }

  function selectDate(value: string) {
    form.setValue('date', value, {shouldValidate: true, shouldDirty: true})
    form.setValue('start', '', {shouldDirty: true})
  }

  async function continueStep() {
    setFormError('')
    const fields: Array<keyof CreateAppointmentValues> =
      step === 0 ? ['customerId']
      : step === 1 ? ['serviceIds']
      : step === 2 ? ['barberId', 'date', 'start']
      : []
    const valid = fields.length ? await form.trigger(fields) : true
    if (!valid) return
    if (step < stepTitles.length - 1) setStep(current => current + 1)
  }

  async function submit(values: CreateAppointmentValues) {
    setFormError('')
    try {
      await createMutation.mutateAsync({
        customerId: Number(values.customerId),
        serviceIds: values.serviceIds.map(Number),
        barberId: Number(values.barberId),
        start: values.start,
        notes: values.notes,
        expectedPaymentMethod: values.expectedPaymentMethod || null,
        bypassAdvance: values.bypassAdvance,
        allowOutOfHours: values.allowOutOfHours
      })
      form.reset(values)
      onOpenChange(false)
      setLocation('/admin/agenda')
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Não foi possível criar o agendamento.')
    }
  }

  const timeSlots = slots.map(slot => ({time: localTime(slot.start), available: true}))
  const estimatedDuration = selectedSlot?.durationMin ?? selectedBarber?.durationMin
  const estimatedTotal = selectedSlot?.subtotal ?? selectedBarber?.subtotal
  const serviceError = form.formState.errors.serviceIds?.message

  return (
    <Sheet open={open} onOpenChange={closeDrawer}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-xl" aria-describedby="create-appointment-description">
        <SheetHeader className="border-b border-border px-5 py-5 pr-14 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Novo agendamento</p>
          <SheetTitle className="text-left text-2xl">Agendar atendimento</SheetTitle>
          <SheetDescription id="create-appointment-description">Crie um horário para um cliente da barbearia.</SheetDescription>
          <ol className="grid grid-cols-4 gap-2 pt-3" aria-label="Etapas do agendamento">
            {stepTitles.map((title, index) => (
              <li
                key={title}
                aria-current={step === index ? 'step' : undefined}
                className={`rounded-md px-2 py-2 text-center text-xs ${
                  step === index ? 'bg-primary text-primary-foreground'
                  : index < step ? 'bg-primary/10 text-foreground'
                  : 'bg-muted text-muted-foreground'
                }`}>
                <span className="font-semibold">{index + 1}.</span> {title}
              </li>
            ))}
          </ol>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="space-y-6 px-5 py-5 pb-32 sm:px-6">
            {step === 0 && (
              <section className="space-y-4" aria-labelledby="appointment-customer-title">
                <div>
                  <h3 id="appointment-customer-title" className="font-semibold">
                    Quem será atendido?
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">Busque por nome ou telefone e selecione o cadastro.</p>
                </div>
                {selectedCustomer ?
                  <div className="flex items-start justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
                    <div>
                      <p className="font-semibold">{selectedCustomer.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{phoneForDisplay(selectedCustomer.phone)}</p>
                      {selectedCustomer.email && <p className="text-sm text-muted-foreground">{selectedCustomer.email}</p>}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 shrink-0"
                      onClick={() => {
                        setSelectedCustomer(null)
                        form.setValue('customerId', '', {shouldValidate: true, shouldDirty: true})
                      }}>
                      Trocar
                    </Button>
                  </div>
                : <>
                    <FormField
                      control={form.control}
                      name="customerId"
                      render={() => (
                        <FormItem>
                          <FormLabel>Buscar cliente</FormLabel>
                          <FormControl>
                            <Input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Nome ou telefone" className="min-h-11" autoFocus />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {customerSuggestions.isFetching && <Skeleton className="h-20 rounded-lg" aria-label="Buscando clientes" />}
                    {customerSuggestions.isError && <ErrorState title="Não foi possível buscar clientes" onRetry={() => void customerSuggestions.refetch()} />}
                    {(customerSuggestions.data?.length ?? 0) > 0 && (
                      <ul className="max-h-52 space-y-2 overflow-y-auto rounded-lg border border-border p-2" aria-label="Resultados da busca de clientes">
                        {customerSuggestions.data?.map(customer => (
                          <li key={customer.id}>
                            <button
                              type="button"
                              className="min-h-14 w-full rounded-md px-3 py-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              onClick={() => chooseCustomer(customer)}>
                              <span className="block font-medium">{customer.name}</span>
                              <span className="block text-sm text-muted-foreground">{phoneForDisplay(customer.phone)}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {searchTerm.trim().length >= 2 && !customerSuggestions.isFetching && !customerSuggestions.data?.length && !customerSuggestions.isError && (
                      <p className="text-sm text-muted-foreground">Nenhum cliente encontrado. Você pode fazer um cadastro rápido abaixo.</p>
                    )}
                    <div className="space-y-3 rounded-lg border border-dashed border-border p-4">
                      <h4 className="font-medium">Cadastro rápido</h4>
                      <label className="grid gap-2 text-sm font-medium" htmlFor="quick-customer-name">
                        Nome
                        <Input id="quick-customer-name" value={quickCustomerName} onChange={event => setQuickCustomerName(event.target.value)} placeholder="Nome do cliente" className="min-h-11" />
                      </label>
                      <label className="grid gap-2 text-sm font-medium" htmlFor="quick-customer-phone">
                        Telefone
                        <Input
                          id="quick-customer-phone"
                          type="tel"
                          inputMode="tel"
                          value={quickCustomerPhone}
                          onChange={event => setQuickCustomerPhone(event.target.value)}
                          placeholder="(11) 99999-9999"
                          className="min-h-11"
                        />
                      </label>
                      <Button type="button" variant="outline" className="min-h-11 w-full" onClick={() => void registerQuickCustomer()}>
                        Cadastrar e selecionar cliente
                      </Button>
                      {quickCustomerError && (
                        <p role="alert" className="text-sm text-destructive">
                          {quickCustomerError}
                        </p>
                      )}
                    </div>
                  </>
                }
                {!selectedCustomer && form.formState.errors.customerId && (
                  <p role="alert" className="text-sm text-destructive">
                    {form.formState.errors.customerId.message}
                  </p>
                )}
              </section>
            )}

            {step === 1 && (
              <section className="space-y-4" aria-labelledby="appointment-services-title">
                <div>
                  <h3 id="appointment-services-title" className="font-semibold">
                    Quais serviços serão feitos?
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">Escolha de um a quatro serviços. O servidor calcula duração e valor conforme o profissional.</p>
                </div>
                {servicesQuery.isPending ?
                  <div className="space-y-2">
                    {Array.from({length: 4}, (_, index) => (
                      <Skeleton key={index} className="h-16 rounded-lg" />
                    ))}
                  </div>
                : servicesQuery.isError ?
                  <ErrorState title="Não foi possível carregar os serviços" onRetry={() => void servicesQuery.refetch()} />
                : <div className="space-y-2">
                    {(servicesQuery.data ?? []).map(service => {
                      const checked = serviceIds.includes(String(service.id))
                      return (
                        <button
                          key={service.id}
                          type="button"
                          aria-pressed={checked}
                          onClick={() => selectService(service.id)}
                          className={`flex min-h-16 w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${checked ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
                          <Checkbox checked={checked} aria-hidden="true" tabIndex={-1} />
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium">{service.name}</span>
                            <span className="text-sm text-muted-foreground">{formatDuration(service.durationMin)}</span>
                          </span>
                          <span className="text-sm font-semibold">{formatBRL(service.price)}</span>
                        </button>
                      )
                    })}
                  </div>
                }
                {serviceError && (
                  <p role="alert" className="text-sm text-destructive">
                    {serviceError}
                  </p>
                )}
                {formError && (
                  <p role="alert" className="text-sm text-destructive">
                    {formError}
                  </p>
                )}
              </section>
            )}

            {step === 2 && (
              <section className="space-y-5" aria-labelledby="appointment-time-title">
                <div>
                  <h3 id="appointment-time-title" className="font-semibold">
                    Escolha profissional e horário
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">Os horários livres são calculados no servidor para a duração selecionada.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="appointment-barber" className="text-sm font-medium">
                      Barbeiro
                    </label>
                    <Select value={barberId} onValueChange={selectBarber} disabled={isBarber || barberOptions.isPending || !eligibleBarbers.length}>
                      <SelectTrigger id="appointment-barber" className="min-h-11 w-full">
                        <SelectValue placeholder={barberOptions.isPending ? 'Carregando...' : 'Selecione'} />
                      </SelectTrigger>
                      <SelectContent>
                        {eligibleBarbers.map(barber => (
                          <SelectItem key={barber.id} value={String(barber.id)}>
                            {barber.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {barberOptions.isError && (
                      <p role="alert" className="text-sm text-destructive">
                        Não foi possível carregar os profissionais disponíveis.
                      </p>
                    )}
                    {eligibleBarbers.length === 0 && !barberOptions.isPending && !barberOptions.isError && (
                      <p className="text-sm text-muted-foreground">Nenhum profissional realiza todos os serviços selecionados.</p>
                    )}
                  </div>
                  <label className="grid gap-2 text-sm font-medium" htmlFor="appointment-date">
                    Data
                    <Input id="appointment-date" type="date" value={date} onChange={event => selectDate(event.target.value)} className="min-h-11" />
                  </label>
                </div>
                {canManage && (
                  <div className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
                    <p className="text-sm font-semibold">Exceções de agenda</p>
                    <label className="flex min-h-11 items-start gap-3 text-sm">
                      <Checkbox
                        checked={allowOutOfHours}
                        onCheckedChange={checked => {
                          form.setValue('allowOutOfHours', checked === true, {shouldDirty: true})
                          form.setValue('start', '', {shouldDirty: true})
                        }}
                      />
                      <span>
                        <span className="font-medium">Encaixe fora do horário normal</span>
                        <span className="mt-1 block text-muted-foreground">Mantém bloqueios, reservas e outros atendimentos protegidos. Exige agenda.manage.</span>
                      </span>
                    </label>
                    <label className="flex min-h-11 items-start gap-3 text-sm">
                      <Checkbox
                        checked={bypassAdvance}
                        onCheckedChange={checked => {
                          form.setValue('bypassAdvance', checked === true, {shouldDirty: true})
                          form.setValue('start', '', {shouldDirty: true})
                        }}
                      />
                      <span>
                        <span className="font-medium">Ignorar antecedência mínima</span>
                        <span className="mt-1 block text-muted-foreground">A regra ainda valida jornada, bloqueios e conflitos, salvo encaixe autorizado.</span>
                      </span>
                    </label>
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold">Horários disponíveis</h4>
                    <p className="text-sm text-muted-foreground">Selecione um horário sugerido para confirmar o encaixe.</p>
                  </div>
                  {availability.isPending ?
                    <Skeleton className="h-32 rounded-lg" aria-label="Buscando horários livres" />
                  : availability.isError ?
                    <ErrorState title="Não foi possível consultar horários" description="Tente novamente ou selecione outra data." onRetry={() => void availability.refetch()} />
                  : <SlotGrid
                      slots={timeSlots}
                      selectedTime={selectedSlot ? localTime(selectedSlot.start) : null}
                      onSelect={time => {
                        const slot = slots.find(item => localTime(item.start) === time)
                        form.setValue('start', slot?.start ?? '', {shouldValidate: true, shouldDirty: true})
                      }}
                      emptyMessage={date && barberId ? 'Sem horários livres. Altere a data ou use uma exceção autorizada.' : 'Selecione serviços, profissional e data para ver sugestões.'}
                    />
                  }
                  {form.formState.errors.start && (
                    <p role="alert" className="text-sm text-destructive">
                      {form.formState.errors.start.message}
                    </p>
                  )}
                </div>
                {selectedBarber && (
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="font-medium">{selectedBarber.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Duração {formatDuration(estimatedDuration ?? selectedBarber.totalDurationMin)}
                      {estimatedTotal !== undefined ? ` · ${formatBRL(estimatedTotal)}` : ''}
                    </p>
                  </div>
                )}
              </section>
            )}

            {step === 3 && (
              <section className="space-y-5" aria-labelledby="appointment-review-title">
                <div>
                  <h3 id="appointment-review-title" className="font-semibold">
                    Revise os detalhes
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">Confira os dados antes de salvar.</p>
                </div>
                <div className="space-y-3 rounded-lg border border-border p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Cliente</p>
                    <p className="font-medium">{selectedCustomer?.name || queryClientId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Profissional</p>
                    <p className="font-medium">{selectedBarber?.name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Horário</p>
                    <p className="font-medium">{selectedSlot ? formatDateTime(selectedSlot.start) : 'Selecione um horário'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Serviços</p>
                    <p className="font-medium">{selectedServices.map(service => service.name).join(', ') || '—'}</p>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-border pt-3">
                    <span className="text-muted-foreground">Duração e total</span>
                    <span className="text-right font-semibold">
                      {estimatedDuration ? formatDuration(estimatedDuration) : '—'}
                      {estimatedTotal !== undefined ? ` · ${formatBRL(estimatedTotal)}` : ''}
                    </span>
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} maxLength={500} placeholder="Preferências ou informações importantes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <label htmlFor="expected-payment-method" className="text-sm font-medium">
                    Forma de pagamento prevista
                  </label>
                  <Select value={expectedPaymentMethod} onValueChange={value => form.setValue('expectedPaymentMethod', value as CreateAppointmentValues['expectedPaymentMethod'], {shouldDirty: true})}>
                    <SelectTrigger id="expected-payment-method" className="min-h-11 w-full">
                      <SelectValue placeholder="Não informada" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                      <SelectItem value="pix">Pix</SelectItem>
                      <SelectItem value="debit">Cartão de débito</SelectItem>
                      <SelectItem value="credit">Cartão de crédito</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="ghost" className="min-h-11 px-2" onClick={() => form.setValue('expectedPaymentMethod', '', {shouldDirty: true})}>
                    Limpar forma prevista
                  </Button>
                </div>
                {formError && (
                  <p role="alert" className="text-sm text-destructive">
                    {formError}
                  </p>
                )}
                {(bypassAdvance || allowOutOfHours) && (
                  <p className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-900 dark:text-amber-200">
                    Este horário usa uma exceção de agenda autorizada. A criação será registrada na auditoria.
                  </p>
                )}
              </section>
            )}
          </form>
        </Form>

        <SheetFooter className="fixed bottom-0 right-0 z-10 w-full border-t border-border bg-background px-5 py-4 sm:max-w-xl sm:px-6">
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={createMutation.isPending}
              onClick={() => {
                setFormError('')
                setStep(current => Math.max(0, current - 1))
              }}>
              Voltar
            </Button>
          )}
          {step < stepTitles.length - 1 ?
            <Button type="button" className="min-h-11" onClick={() => void continueStep()}>
              Continuar
            </Button>
          : <Button type="button" className="min-h-11" disabled={createMutation.isPending} onClick={() => void form.handleSubmit(submit)()}>
              {createMutation.isPending ? 'Salvando...' : 'Criar agendamento'}
            </Button>
          }
        </SheetFooter>
      </SheetContent>
      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Descartar novo agendamento?"
        description="Há informações não salvas. Quer fechar o drawer e descartar o rascunho?"
        confirmLabel="Descartar rascunho"
        destructive
        onConfirm={() => {
          setDiscardOpen(false)
          form.reset()
          onOpenChange(false)
          setLocation('/admin/agenda')
        }}
      />
    </Sheet>
  )
}
