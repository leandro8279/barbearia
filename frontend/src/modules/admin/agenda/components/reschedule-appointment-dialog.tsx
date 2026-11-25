import {useEffect, useRef, useState} from 'react'
import {zodResolver} from '@hookform/resolvers/zod'
import {useForm} from 'react-hook-form'
import {ArrowRight, MessageCircle} from 'lucide-react'
import {useAgendaAppointmentDetail, useAgendaAvailabilitySlots, useAgendaEligibleBarbers, useRescheduleAgendaAppointment} from '@/modules/admin/agenda/hooks/use-agenda'
import {rescheduleAppointmentSchema, type RescheduleAppointmentValues} from '@/modules/admin/agenda/schemas/agenda-overlays.schema'
import {formatBRL, formatDateTime, formatDuration} from '@/shared/lib/format'
import {BUSINESS_TIME_ZONE} from '@/shared/lib/time'
import {Button} from '@/shared/ui/button'
import {Checkbox} from '@/shared/ui/checkbox'
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@/shared/ui/dialog'
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/shared/ui/form'
import {Input} from '@/shared/ui/input'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/shared/ui/select'
import {Skeleton} from '@/shared/ui/skeleton'
import {Textarea} from '@/shared/ui/textarea'
import {SlotGrid} from '@/shared/components/slot-grid'
import {ErrorState} from '@/shared/components/error-state'
import {ConfirmDialog} from '@/shared/components/confirm-dialog'

function dateOf(value: string) {
  return new Intl.DateTimeFormat('en-CA', {timeZone: BUSINESS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date(value))
}

function today() {
  return new Intl.DateTimeFormat('en-CA', {timeZone: BUSINESS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date())
}

function timeOf(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {timeZone: BUSINESS_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(new Date(value))
}

interface RescheduleAppointmentDialogProps {
  open: boolean
  appointmentId: string | null
  onOpenChange: (open: boolean) => void
  onCompleted?: () => void
  completedActionLabel?: string
}

export function RescheduleAppointmentDialog({open, appointmentId, onOpenChange, onCompleted, completedActionLabel = 'Fechar'}: RescheduleAppointmentDialogProps) {
  const id = appointmentId && /^\d+$/.test(appointmentId) ? Number(appointmentId) : null
  const detailQuery = useAgendaAppointmentDetail(id)
  const appointment = detailQuery.data?.appointment
  const customer = detailQuery.data?.customer
  const serviceIds = appointment?.items.map(item => item.serviceId) ?? []
  const barberQuery = useAgendaEligibleBarbers(serviceIds)
  const form = useForm<RescheduleAppointmentValues>({resolver: zodResolver(rescheduleAppointmentSchema), defaultValues: {barberId: '', date: today(), start: '', reason: '', notifyCustomer: true}})
  const barberId = form.watch('barberId')
  const date = form.watch('date')
  const notifyCustomer = form.watch('notifyCustomer')
  const slotsQuery = useAgendaAvailabilitySlots({serviceIds, barberId: barberId ? Number(barberId) : null, date, bypassAdvance: false, allowOutOfHours: false})
  const mutation = useRescheduleAgendaAppointment()
  const initialized = useRef(false)
  const [formError, setFormError] = useState('')
  const [whatsAppHref, setWhatsAppHref] = useState('')
  const [discardOpen, setDiscardOpen] = useState(false)
  const [completed, setCompleted] = useState(false)
  const slots = slotsQuery.data ?? []
  const selectedSlot = slots.find(slot => slot.start === form.watch('start'))

  useEffect(() => {
    if (!open) {
      initialized.current = false
      setFormError('')
      setWhatsAppHref('')
      setCompleted(false)
      return
    }
    if (appointment && !initialized.current) {
      initialized.current = true
      form.reset({barberId: String(appointment.barberId), date: dateOf(appointment.start), start: '', reason: '', notifyCustomer: true})
    }
  }, [appointment, form, open])

  function requestClose(nextOpen: boolean) {
    if (!nextOpen && form.formState.isDirty && !completed) {
      setDiscardOpen(true)
      return
    }
    onOpenChange(nextOpen)
  }

  async function submit(values: RescheduleAppointmentValues) {
    if (!appointment) return
    setFormError('')
    try {
      await mutation.mutateAsync({id: appointment.id, barberId: Number(values.barberId), start: values.start, reason: values.reason, notifyCustomer: values.notifyCustomer})
      const phone = (customer?.phone ?? '').replace(/\D/g, '')
      if (values.notifyCustomer && phone.length >= 10) {
        const text = `Olá, ${customer?.name}. Seu agendamento foi remarcado:\n${formatDateTime(appointment.start)} → ${formatDateTime(values.start)}.`
        setWhatsAppHref(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`)
      } else {
        setWhatsAppHref('')
      }
      setCompleted(true)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Não foi possível remarcar o agendamento.')
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={requestClose}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Remarcar agendamento</DialogTitle>
            <DialogDescription>{appointment ? `${customer?.name ?? 'Cliente'} · ${formatDateTime(appointment.start)}` : 'Escolha profissional, data e horário.'}</DialogDescription>
          </DialogHeader>
          {!id ?
            <ErrorState title="Agendamento não informado" description="Abra a remarcação a partir de um atendimento da agenda." />
          : detailQuery.isPending ?
            <div className="space-y-3">
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-32 rounded-lg" />
            </div>
          : detailQuery.isError || !appointment ?
            <ErrorState title="Não foi possível carregar o agendamento" onRetry={() => void detailQuery.refetch()} />
          : completed ?
            <div className="space-y-4">
              <p role="status" className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
                Novo horário salvo e registrado no histórico.
              </p>
              {notifyCustomer && whatsAppHref ?
                <Button asChild className="min-h-11 w-full">
                  <a href={whatsAppHref} target="_blank" rel="noreferrer">
                    <MessageCircle className="size-4" aria-hidden="true" /> Avisar cliente pelo WhatsApp
                  </a>
                </Button>
              : notifyCustomer ?
                <p className="text-sm text-muted-foreground">A notificação ficou registrada, mas o cliente não tem telefone cadastrado para abrir o WhatsApp.</p>
              : null}
            </div>
          : <Form {...form}>
              <form className="space-y-5" onSubmit={form.handleSubmit(submit)}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="barberId"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Barbeiro</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={value => {
                            field.onChange(value)
                            form.setValue('start', '', {shouldDirty: true})
                          }}>
                          <FormControl>
                            <SelectTrigger className="min-h-11 w-full">
                              <SelectValue placeholder={barberQuery.isPending ? 'Carregando...' : 'Selecione'} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(barberQuery.data ?? []).map(barber => (
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
                  <FormField
                    control={form.control}
                    name="date"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Data</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            min={today()}
                            className="min-h-11"
                            {...field}
                            onChange={event => {
                              field.onChange(event)
                              form.setValue('start', '', {shouldDirty: true})
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {barberQuery.isError && <ErrorState title="Não foi possível carregar os barbeiros" onRetry={() => void barberQuery.refetch()} />}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Sugestões de horário</p>
                  {slotsQuery.isPending ?
                    <Skeleton className="h-28 rounded-lg" aria-label="Buscando horários" />
                  : slotsQuery.isError ?
                    <ErrorState title="Não foi possível consultar horários" onRetry={() => void slotsQuery.refetch()} />
                  : <SlotGrid
                      slots={slots.map(slot => ({time: timeOf(slot.start), available: true}))}
                      selectedTime={selectedSlot ? timeOf(selectedSlot.start) : null}
                      onSelect={time => {
                        const slot = slots.find(item => timeOf(item.start) === time)
                        form.setValue('start', slot?.start ?? '', {shouldValidate: true, shouldDirty: true})
                      }}
                      emptyMessage="Não há horários disponíveis nessa data para este barbeiro."
                    />
                  }
                  <FormField
                    control={form.control}
                    name="start"
                    render={() => (
                      <FormItem>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="reason"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel>Motivo da remarcação</FormLabel>
                      <FormControl>
                        <Textarea rows={2} maxLength={300} placeholder="Ex.: pedido do cliente" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notifyCustomer"
                  render={({field}) => (
                    <FormItem className="flex items-start gap-3 rounded-lg border p-3">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={value => field.onChange(value === true)} />
                      </FormControl>
                      <div>
                        <FormLabel className="cursor-pointer">Avisar cliente por WhatsApp</FormLabel>
                        <p className="text-sm text-muted-foreground">Registra a mudança e oferece um link para enviar o horário anterior e o novo.</p>
                      </div>
                    </FormItem>
                  )}
                />
                {selectedSlot && (
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 p-3 text-sm">
                    <span>
                      {formatDuration(selectedSlot.durationMin)} · {formatBRL(selectedSlot.subtotal)}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <ArrowRight className="size-4" aria-hidden="true" />
                      {formatDateTime(selectedSlot.start)}
                    </span>
                  </div>
                )}
                {formError && (
                  <p role="alert" className="text-sm text-destructive">
                    {formError}
                  </p>
                )}
                <DialogFooter>
                  <Button type="button" variant="outline" className="min-h-11" onClick={() => requestClose(false)} disabled={mutation.isPending}>
                    Voltar
                  </Button>
                  <Button type="submit" className="min-h-11" disabled={mutation.isPending || slotsQuery.isPending || barberQuery.isPending}>
                    {mutation.isPending ? 'Salvando...' : 'Confirmar remarcação'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          }
          {completed && (
            <DialogFooter>
              <Button type="button" className="min-h-11" onClick={() => (onCompleted ? onCompleted() : requestClose(false))}>
                {completedActionLabel}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Descartar remarcação?"
        description="Há alterações ainda não salvas."
        confirmLabel="Descartar"
        destructive
        onConfirm={() => {
          setDiscardOpen(false)
          form.reset()
          onOpenChange(false)
        }}
      />
    </>
  )
}
