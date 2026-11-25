import {useEffect, useState} from 'react'
import {zodResolver} from '@hookform/resolvers/zod'
import {useForm} from 'react-hook-form'
import {CalendarOff} from 'lucide-react'
import {useAgendaBarbers, useCreateAgendaTimeBlocks} from '@/modules/admin/agenda/hooks/use-agenda'
import type {AgendaTimeBlockConflict} from '@/modules/admin/agenda/api/agenda'
import {createTimeBlockSchema, type CreateTimeBlockValues} from '@/modules/admin/agenda/schemas/agenda-overlays.schema'
import {formatDateTime} from '@/shared/lib/format'
import {BUSINESS_TIME_ZONE} from '@/shared/lib/time'
import {Button} from '@/shared/ui/button'
import {Checkbox} from '@/shared/ui/checkbox'
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@/shared/ui/dialog'
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/shared/ui/form'
import {Input} from '@/shared/ui/input'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/shared/ui/select'
import {Skeleton} from '@/shared/ui/skeleton'
import {ConfirmDialog} from '@/shared/components/confirm-dialog'
import {ErrorState} from '@/shared/components/error-state'
import {HttpError} from '@/shared/lib/http'

function today() {
  return new Intl.DateTimeFormat('en-CA', {timeZone: BUSINESS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date())
}

function getConflicts(error: unknown): AgendaTimeBlockConflict[] {
  if (!(error instanceof HttpError) || error.status !== 409 || typeof error.details !== 'object' || error.details === null || !('details' in error.details)) return []
  const details = error.details.details
  return typeof details === 'object' && details !== null && 'conflicts' in details && Array.isArray(details.conflicts) ? (details.conflicts as AgendaTimeBlockConflict[]) : []
}

interface CreateTimeBlockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRescheduleConflict: (appointmentId: number) => void
}

export function CreateTimeBlockDialog({open, onOpenChange, onRescheduleConflict}: CreateTimeBlockDialogProps) {
  const barbersQuery = useAgendaBarbers()
  const mutation = useCreateAgendaTimeBlocks()
  const form = useForm<CreateTimeBlockValues>({
    resolver: zodResolver(createTimeBlockSchema),
    defaultValues: {
      allBarbers: false,
      barberIds: [],
      date: today(),
      allDay: false,
      startTime: '12:00',
      endTime: '13:00',
      type: 'block',
      reason: 'Almoço',
      customReason: '',
      weekly: false,
      repeatWeeks: '4'
    }
  })
  const allBarbers = form.watch('allBarbers')
  const allDay = form.watch('allDay')
  const reason = form.watch('reason')
  const weekly = form.watch('weekly')
  const [formError, setFormError] = useState('')
  const [conflicts, setConflicts] = useState<AgendaTimeBlockConflict[]>([])
  const [completed, setCompleted] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)

  useEffect(() => {
    if (!open) {
      form.reset({
        allBarbers: false,
        barberIds: [],
        date: today(),
        allDay: false,
        startTime: '12:00',
        endTime: '13:00',
        type: 'block',
        reason: 'Almoço',
        customReason: '',
        weekly: false,
        repeatWeeks: '4'
      })
      setFormError('')
      setConflicts([])
      setCompleted(false)
    }
  }, [form, open])

  function requestClose(nextOpen: boolean) {
    if (!nextOpen && form.formState.isDirty && !completed) {
      setDiscardOpen(true)
      return
    }
    onOpenChange(nextOpen)
  }

  function toggleBarber(id: string, checked: boolean) {
    const selected = form.getValues('barberIds')
    form.setValue('barberIds', checked ? [...selected, id] : selected.filter(value => value !== id), {shouldDirty: true, shouldValidate: true})
  }

  async function submit(values: CreateTimeBlockValues) {
    setFormError('')
    setConflicts([])
    const chosenReason = values.reason === 'Outro' ? values.customReason.trim() : values.reason
    try {
      await mutation.mutateAsync({
        barberIds: values.allBarbers ? null : values.barberIds.map(Number),
        date: values.date,
        startTime: values.allDay ? '00:00' : values.startTime,
        endTime: values.allDay ? '00:00' : values.endTime,
        allDay: values.allDay,
        type: values.reason === 'Folga' ? 'timeoff' : 'block',
        reason: chosenReason,
        repeatWeeks: values.weekly ? Number(values.repeatWeeks) : 1
      })
      setCompleted(true)
    } catch (error) {
      const appointments = getConflicts(error)
      if (appointments.length) {
        setConflicts(appointments)
        setFormError('Há agendamentos ativos neste período. Remarque-os antes de criar o bloqueio.')
      } else {
        setFormError(error instanceof Error ? error.message : 'Não foi possível criar o bloqueio.')
      }
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={requestClose}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{completed ? 'Bloqueio criado' : 'Bloquear horário'}</DialogTitle>
            <DialogDescription>O período será removido da disponibilidade assim que for salvo.</DialogDescription>
          </DialogHeader>
          {completed ?
            <div className="space-y-3">
              <p role="status" className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
                A disponibilidade pública foi atualizada.
              </p>
              <DialogFooter>
                <Button type="button" className="min-h-11" onClick={() => requestClose(false)}>
                  Fechar
                </Button>
              </DialogFooter>
            </div>
          : <Form {...form}>
              <form className="space-y-5" onSubmit={form.handleSubmit(submit)}>
                <FormField
                  control={form.control}
                  name="allBarbers"
                  render={({field}) => (
                    <FormItem className="flex items-start gap-3 rounded-lg border p-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={checked => {
                            field.onChange(checked === true)
                            if (checked === true) form.setValue('barberIds', [], {shouldDirty: true, shouldValidate: true})
                          }}
                        />
                      </FormControl>
                      <div>
                        <FormLabel className="cursor-pointer">Bloquear todos os barbeiros</FormLabel>
                        <p className="text-sm text-muted-foreground">Use para fechar a unidade ou interromper o atendimento de toda a equipe.</p>
                      </div>
                    </FormItem>
                  )}
                />
                {!allBarbers && (
                  <FormField
                    control={form.control}
                    name="barberIds"
                    render={() => (
                      <FormItem>
                        <FormLabel>Barbeiros</FormLabel>
                        {barbersQuery.isPending ?
                          <Skeleton className="h-24 rounded-lg" />
                        : barbersQuery.isError ?
                          <ErrorState title="Não foi possível carregar os barbeiros" onRetry={() => void barbersQuery.refetch()} />
                        : <div className="grid gap-2 sm:grid-cols-2">
                            {(barbersQuery.data ?? []).map(barber => {
                              const checked = form.getValues('barberIds').includes(String(barber.id))
                              return (
                                <label key={barber.id} className="flex min-h-11 items-center gap-3 rounded-md border px-3 text-sm">
                                  <Checkbox checked={checked} onCheckedChange={value => toggleBarber(String(barber.id), value === true)} />
                                  {barber.name}
                                </label>
                              )
                            })}
                          </div>
                        }
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Data inicial</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            min={today()}
                            className="min-h-11"
                            {...field}
                            onChange={event => {
                              field.onChange(event)
                              setConflicts([])
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="reason"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Motivo</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={value => {
                            field.onChange(value)
                            form.setValue('type', value === 'Folga' ? 'timeoff' : 'block', {shouldDirty: true})
                          }}>
                          <FormControl>
                            <SelectTrigger className="min-h-11 w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Almoço">Almoço</SelectItem>
                            <SelectItem value="Curso">Curso</SelectItem>
                            <SelectItem value="Folga">Folga</SelectItem>
                            <SelectItem value="Outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {reason === 'Outro' && (
                  <FormField
                    control={form.control}
                    name="customReason"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Descreva o motivo</FormLabel>
                        <FormControl>
                          <Input className="min-h-11" maxLength={120} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="allDay"
                  render={({field}) => (
                    <FormItem className="flex items-center gap-3">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={value => field.onChange(value === true)} />
                      </FormControl>
                      <FormLabel className="cursor-pointer">Dia inteiro</FormLabel>
                    </FormItem>
                  )}
                />
                {!allDay && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>Início</FormLabel>
                          <FormControl>
                            <Input type="time" className="min-h-11" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endTime"
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>Fim</FormLabel>
                          <FormControl>
                            <Input type="time" className="min-h-11" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                <FormField
                  control={form.control}
                  name="weekly"
                  render={({field}) => (
                    <FormItem className="flex items-start gap-3 rounded-lg border p-3">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={value => field.onChange(value === true)} />
                      </FormControl>
                      <div>
                        <FormLabel className="cursor-pointer">Repetir semanalmente</FormLabel>
                        <p className="text-sm text-muted-foreground">Cria o bloqueio nesta data e nas semanas seguintes.</p>
                      </div>
                    </FormItem>
                  )}
                />
                {weekly && (
                  <FormField
                    control={form.control}
                    name="repeatWeeks"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Ocorrências, contando esta semana</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="min-h-11 w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="2">2 semanas</SelectItem>
                            <SelectItem value="4">4 semanas</SelectItem>
                            <SelectItem value="8">8 semanas</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                )}
                {conflicts.length > 0 && (
                  <section className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3" aria-label="Agendamentos em conflito">
                    <p className="font-medium">Remarque antes de bloquear</p>
                    <ul className="space-y-2">
                      {conflicts.map(appointment => (
                        <li key={appointment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-background p-2 text-sm">
                          <span>
                            {appointment.customerName} · {appointment.barberName} · {formatDateTime(appointment.start)}
                          </span>
                          <Button type="button" variant="outline" className="min-h-11" onClick={() => onRescheduleConflict(appointment.id)}>
                            Remarcar
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {formError && (
                  <p role="alert" className="text-sm text-destructive">
                    {formError}
                  </p>
                )}
                <DialogFooter>
                  <Button type="button" variant="outline" className="min-h-11" disabled={mutation.isPending} onClick={() => requestClose(false)}>
                    Voltar
                  </Button>
                  <Button type="submit" className="min-h-11" disabled={mutation.isPending || barbersQuery.isPending || barbersQuery.isError}>
                    {mutation.isPending ?
                      <>
                        <CalendarOff className="size-4" aria-hidden="true" /> Salvando...
                      </>
                    : 'Criar bloqueio'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          }
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Descartar bloqueio?"
        description="As informações preenchidas ainda não foram salvas."
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
