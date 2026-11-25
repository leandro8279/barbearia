import {useEffect, useState} from 'react'
import {zodResolver} from '@hookform/resolvers/zod'
import {useForm} from 'react-hook-form'
import {CalendarOff, LoaderCircle} from 'lucide-react'
import {RescheduleAppointmentDialog} from '@/modules/admin/agenda/components/reschedule-appointment-dialog'
import type {TeamScheduleImpact, TimeOffInput} from '@/modules/admin/team/api/team-management'
import type {TeamBarber} from '@/modules/admin/team/api/team'
import {timeOffSchema, type TimeOffValues} from '@/modules/admin/team/schemas/time-off.schema'
import {useCreateTimeOff, usePreviewTimeOff} from '@/modules/admin/team/hooks/use-team-management'
import {ConfirmDialog} from '@/shared/components/confirm-dialog'
import {formatDateTime} from '@/shared/lib/format'
import {useCan} from '@/shared/hooks/use-can'
import {Button} from '@/shared/ui/button'
import {Checkbox} from '@/shared/ui/checkbox'
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@/shared/ui/dialog'
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/shared/ui/form'
import {Input} from '@/shared/ui/input'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/shared/ui/select'
import {Skeleton} from '@/shared/ui/skeleton'

function todayInBusinessTime() {
  return new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date())
}

function emptyValues(): TimeOffValues {
  const today = todayInBusinessTime()
  return {barberIds: [], fromDate: today, toDate: today, allDay: true, startTime: '09:00', endTime: '10:00', reason: 'Folga'}
}

interface TeamTimeOffDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  barbers: TeamBarber[]
  barbersPending: boolean
  barbersError: boolean
  onRetryBarbers: () => void
}

export function TeamTimeOffDialog({open, onOpenChange, barbers, barbersPending, barbersError, onRetryBarbers}: TeamTimeOffDialogProps) {
  const canReschedule = useCan('agenda.write')
  const previewMutation = usePreviewTimeOff()
  const createMutation = useCreateTimeOff()
  const form = useForm<TimeOffValues>({resolver: zodResolver(timeOffSchema), defaultValues: emptyValues()})
  const allDay = form.watch('allDay')
  const [preview, setPreview] = useState<{conflicts: TeamScheduleImpact[]; count: number} | null>(null)
  const [reviewedInput, setReviewedInput] = useState<TimeOffInput | null>(null)
  const [completed, setCompleted] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [rescheduleQueue, setRescheduleQueue] = useState<number[]>([])
  const [rescheduleIndex, setRescheduleIndex] = useState(0)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!open) {
      form.reset(emptyValues())
      setPreview(null)
      setReviewedInput(null)
      setCompleted(false)
      setFormError('')
      setRescheduleQueue([])
      setRescheduleIndex(0)
      setRescheduleOpen(false)
    }
  }, [form, open])

  function requestClose(nextOpen: boolean) {
    if (!nextOpen && !completed && (form.formState.isDirty || preview !== null)) {
      setDiscardOpen(true)
      return
    }
    onOpenChange(nextOpen)
  }

  function getInput(values: TimeOffValues): TimeOffInput {
    return {...values, startTime: values.allDay ? '00:00' : values.startTime, endTime: values.allDay ? '00:00' : values.endTime}
  }

  async function checkConflicts(values: TimeOffValues) {
    setFormError('')
    setPreview(null)
    setReviewedInput(null)
    try {
      const input = getInput(values)
      const result = await previewMutation.mutateAsync(input)
      setPreview(result)
      setReviewedInput(input)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Não foi possível conferir os agendamentos afetados.')
    }
  }

  async function createBlocks() {
    if (!reviewedInput || preview?.conflicts.length) return
    setFormError('')
    try {
      await createMutation.mutateAsync(reviewedInput)
      setCompleted(true)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Não foi possível registrar o período.')
    }
  }

  async function refreshPreview() {
    if (!reviewedInput) return
    try {
      setPreview(await previewMutation.mutateAsync(reviewedInput))
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Não foi possível atualizar os agendamentos afetados.')
    }
  }

  function startMassReschedule() {
    const ids = [...new Set((preview?.conflicts ?? []).map(item => item.id))]
    if (!ids.length) return
    setRescheduleQueue(ids)
    setRescheduleIndex(0)
    setRescheduleOpen(true)
  }

  function finishCurrentReschedule() {
    if (rescheduleIndex + 1 < rescheduleQueue.length) {
      setRescheduleIndex(index => index + 1)
      return
    }
    setRescheduleOpen(false)
    setRescheduleQueue([])
    setRescheduleIndex(0)
    void refreshPreview()
  }

  const currentAppointmentId = rescheduleQueue[rescheduleIndex]

  return (
    <>
      <Dialog open={open && !rescheduleOpen} onOpenChange={requestClose}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{completed ? 'Período registrado' : 'Folgas e férias'}</DialogTitle>
            <DialogDescription>Informe o período de afastamento. A disponibilidade será atualizada depois da confirmação.</DialogDescription>
          </DialogHeader>

          {completed ?
            <div className="space-y-4">
              <p className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm" role="status">
                O afastamento foi registrado e os horários correspondentes saíram da disponibilidade.
              </p>
              <DialogFooter>
                <Button type="button" className="min-h-11" onClick={() => requestClose(false)}>
                  Fechar
                </Button>
              </DialogFooter>
            </div>
          : <Form {...form}>
              <form
                className="space-y-5"
                onChange={() => {
                  setPreview(null)
                  setReviewedInput(null)
                  setFormError('')
                }}
                onSubmit={form.handleSubmit(checkConflicts)}>
                <FormField
                  control={form.control}
                  name="barberIds"
                  render={() => (
                    <FormItem>
                      <FormLabel>Profissional</FormLabel>
                      {barbersPending ?
                        <div className="grid gap-2 sm:grid-cols-2" aria-label="Carregando profissionais">
                          <Skeleton className="h-12 rounded-lg" />
                          <Skeleton className="h-12 rounded-lg" />
                        </div>
                      : barbersError ?
                        <div className="space-y-2">
                          <p className="text-sm text-destructive" role="alert">
                            Não foi possível carregar os profissionais.
                          </p>
                          <Button type="button" variant="outline" className="min-h-11" onClick={onRetryBarbers}>
                            Tentar novamente
                          </Button>
                        </div>
                      : <div className="grid gap-2 sm:grid-cols-2">
                          {barbers.map(barber => {
                            const selected = form.getValues('barberIds').includes(barber.id)
                            return (
                              <label key={barber.id} className="flex min-h-11 items-center gap-3 rounded-lg border border-border px-3 text-sm">
                                <Checkbox
                                  checked={selected}
                                  onCheckedChange={checked => {
                                    const current = form.getValues('barberIds')
                                    form.setValue('barberIds', checked === true ? [...new Set([...current, barber.id])] : current.filter(id => id !== barber.id), {
                                      shouldDirty: true,
                                      shouldValidate: true
                                    })
                                  }}
                                />
                                <span>{barber.name}</span>
                                {!barber.active && <span className="text-xs text-muted-foreground">(inativo)</span>}
                              </label>
                            )
                          })}
                        </div>
                      }
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="fromDate"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Data inicial</FormLabel>
                        <FormControl>
                          <Input type="date" className="min-h-11" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="toDate"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Data final</FormLabel>
                        <FormControl>
                          <Input type="date" min={form.watch('fromDate')} className="min-h-11" {...field} />
                        </FormControl>
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
                      <FormLabel>Motivo</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="min-h-11 w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Folga">Folga</SelectItem>
                          <SelectItem value="Férias">Férias</SelectItem>
                          <SelectItem value="Atestado">Atestado</SelectItem>
                          <SelectItem value="Curso">Curso</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="allDay"
                  render={({field}) => (
                    <FormItem className="flex min-h-11 items-center gap-3">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={checked => field.onChange(checked === true)} />
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
                          <FormLabel>Horário inicial</FormLabel>
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
                          <FormLabel>Horário final</FormLabel>
                          <FormControl>
                            <Input type="time" className="min-h-11" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {form.watch('reason') === 'Atestado' && (
                  <p className="rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">Não informe CID nem detalhes clínicos. O sistema registra apenas o motivo “Atestado”.</p>
                )}

                {preview && (
                  <section className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4" aria-label="Resultado da conferência de agendamentos">
                    {preview.conflicts.length ?
                      <>
                        <div>
                          <p className="font-medium">{preview.conflicts.length} agendamento(s) precisam de remarcação</p>
                          <p className="text-sm text-muted-foreground">Nenhum bloqueio será criado enquanto houver conflito.</p>
                        </div>
                        <ul className="max-h-56 space-y-2 overflow-y-auto">
                          {preview.conflicts.map(appointment => (
                            <li key={appointment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-background p-3 text-sm">
                              <span>
                                {appointment.customerName} · {appointment.barberName} · {formatDateTime(appointment.start)}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {canReschedule ?
                          <Button type="button" className="min-h-11 w-full sm:w-auto" onClick={startMassReschedule}>
                            <CalendarOff className="size-4" aria-hidden="true" /> Remarcar em sequência ({preview.conflicts.length})
                          </Button>
                        : <p className="text-sm text-muted-foreground">Sua conta pode ver os conflitos, mas precisa da permissão de agenda para remarcar atendimentos.</p>}
                      </>
                    : <div className="space-y-3">
                        <p className="text-sm">Nenhum agendamento conflita com o período. {preview.count} bloqueio(s) serão registrados.</p>
                        <Button type="button" className="min-h-11" disabled={createMutation.isPending} onClick={() => void createBlocks()}>
                          {createMutation.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                          Confirmar afastamento
                        </Button>
                      </div>
                    }
                  </section>
                )}

                {formError && (
                  <p className="text-sm text-destructive" role="alert">
                    {formError}
                  </p>
                )}
                <DialogFooter>
                  <Button type="button" variant="outline" className="min-h-11" disabled={previewMutation.isPending || createMutation.isPending} onClick={() => requestClose(false)}>
                    Voltar
                  </Button>
                  {!preview && (
                    <Button type="submit" className="min-h-11" disabled={previewMutation.isPending || createMutation.isPending || barbersPending || barbersError}>
                      {previewMutation.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                      Conferir agendamentos
                    </Button>
                  )}
                </DialogFooter>
              </form>
            </Form>
          }
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Descartar afastamento?"
        description="As informações preenchidas ainda não foram salvas."
        confirmLabel="Descartar"
        destructive
        onConfirm={() => {
          setDiscardOpen(false)
          form.reset(emptyValues())
          setPreview(null)
          setReviewedInput(null)
          setFormError('')
          onOpenChange(false)
        }}
      />

      {currentAppointmentId !== undefined && (
        <RescheduleAppointmentDialog
          key={currentAppointmentId}
          appointmentId={String(currentAppointmentId)}
          open={rescheduleOpen}
          onOpenChange={nextOpen => {
            setRescheduleOpen(nextOpen)
            if (!nextOpen) {
              setRescheduleQueue([])
              setRescheduleIndex(0)
            }
          }}
          onCompleted={finishCurrentReschedule}
          completedActionLabel={rescheduleIndex + 1 < rescheduleQueue.length ? `Próximo atendimento (${rescheduleIndex + 2} de ${rescheduleQueue.length})` : 'Voltar às folgas'}
        />
      )}
    </>
  )
}
