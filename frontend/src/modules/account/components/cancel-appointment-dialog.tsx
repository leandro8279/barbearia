import {useEffect, useState} from 'react'
import {zodResolver} from '@hookform/resolvers/zod'
import {useForm} from 'react-hook-form'
import {useMutation, useQueryClient} from '@tanstack/react-query'
import {toast} from 'sonner'
import {cancelMyAppointment, type CustomerAppointmentDetail} from '@/modules/account/api/appointments'
import {cancelAppointmentSchema, type CancelAppointmentValues} from '@/modules/account/schemas/cancel-appointment.schema'
import {useBookingPolicy} from '@/modules/booking/hooks/use-booking-data'
import {Button} from '@/shared/ui/button'
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/shared/ui/form'
import {RadioGroup, RadioGroupItem} from '@/shared/ui/radio-group'
import {Textarea} from '@/shared/ui/textarea'
import {ResponsiveAccountOverlay} from '@/modules/account/components/responsive-account-overlay'
import {ConfirmDialog} from '@/shared/components/confirm-dialog'

interface CancelAppointmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment?: CustomerAppointmentDetail
  loadingAppointment: boolean
  appointmentError: string | null
  onRetryAppointment: () => void
}

const reasons = [
  {value: 'change_of_plans', label: 'Mudança de planos'},
  {value: 'schedule_conflict', label: 'Conflito de horário'},
  {value: 'other', label: 'Outro motivo'}
] as const

export function CancelAppointmentDialog({open, onOpenChange, appointment, loadingAppointment, appointmentError, onRetryAppointment}: CancelAppointmentDialogProps) {
  const queryClient = useQueryClient()
  const policyQuery = useBookingPolicy()
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const form = useForm<CancelAppointmentValues>({resolver: zodResolver(cancelAppointmentSchema), defaultValues: {reason: 'change_of_plans', details: ''}})
  const cancelMutation = useMutation({
    mutationFn: async (values: CancelAppointmentValues) => {
      if (!appointment) throw new Error('Não foi possível localizar este agendamento.')
      const selectedReason = reasons.find(item => item.value === values.reason)?.label ?? 'Outro motivo'
      const reason = values.reason === 'other' ? values.details?.trim() : selectedReason
      return cancelMyAppointment(appointment.id, reason || selectedReason)
    },
    onSuccess: async () => {
      toast.success('Agendamento cancelado.')
      await queryClient.invalidateQueries({queryKey: ['appointments']})
      await queryClient.invalidateQueries({queryKey: ['availability-days']})
      await queryClient.invalidateQueries({queryKey: ['availability-slots']})
      form.reset({reason: 'change_of_plans', details: ''})
      onOpenChange(false)
    },
    onError: error => {
      form.setError('root.server', {type: 'server', message: error instanceof Error ? error.message : 'Não foi possível cancelar. Tente novamente.'})
    }
  })

  useEffect(() => {
    if (!open) return
    form.reset({reason: 'change_of_plans', details: ''})
  }, [form, open, appointment?.id])

  const canCancel = Boolean(appointment && ['pending', 'confirmed', 'checked_in'].includes(appointment.status) && new Date(appointment.start).getTime() > Date.now())
  const cancelBeforeHours = policyQuery.data?.cancelBeforeHours
  const isOutsideFreeWindow = Boolean(appointment && cancelBeforeHours !== undefined && (new Date(appointment.start).getTime() - Date.now()) / 3_600_000 < cancelBeforeHours)

  function requestClose() {
    if (form.formState.isDirty) {
      setConfirmDiscard(true)
      return
    }
    onOpenChange(false)
  }

  return (
    <>
      <ResponsiveAccountOverlay
        open={open}
        onOpenChange={next => {
          if (!cancelMutation.isPending) {
            if (next) onOpenChange(true)
            else requestClose()
          }
        }}
        title="Cancelar agendamento"
        description="Confira a política e informe o motivo antes de confirmar.">
        <div className="space-y-5">
          {!appointment ?
            loadingAppointment ?
              <p role="status" className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
                Carregando os dados do agendamento…
              </p>
            : <div className="space-y-3 rounded-lg border border-border p-4 text-sm text-muted-foreground">
                <p role={appointmentError ? 'alert' : 'status'}>{appointmentError ?? 'Selecione um agendamento para continuar.'}</p>
                {appointmentError && (
                  <Button type="button" variant="outline" className="min-h-11" onClick={onRetryAppointment}>
                    Tentar novamente
                  </Button>
                )}
              </div>

          : <>
              <div className={isOutsideFreeWindow ? 'rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm' : 'rounded-lg border border-border bg-muted/40 p-4 text-sm'}>
                {policyQuery.isPending ?
                  <p>Carregando a política de cancelamento…</p>
                : policyQuery.isError ?
                  <p>Não foi possível consultar a política agora. Nenhuma cobrança ou estorno será processado automaticamente por este MVP.</p>
                : isOutsideFreeWindow ?
                  <p>
                    Este pedido está fora do prazo de {cancelBeforeHours} horas para cancelamento sem custo. A equipe poderá orientar sobre sinal ou crédito; não há cobrança nem estorno automático
                    neste MVP.
                  </p>
                : <p>Cancelamento dentro do prazo da política, sem custo. Se houver sinal ou crédito, o estorno precisa ser tratado com a equipe; não é automático neste MVP.</p>}
              </div>

              {!canCancel && (
                <p role="alert" className="text-sm text-destructive">
                  Este agendamento não pode mais ser cancelado pela sua conta.
                </p>
              )}
              {form.formState.errors.root?.server?.message && (
                <p role="alert" className="text-sm text-destructive">
                  {form.formState.errors.root.server.message}
                </p>
              )}

              <Form {...form}>
                <form className="space-y-5" onSubmit={form.handleSubmit(values => cancelMutation.mutate(values))}>
                  <FormField
                    control={form.control}
                    name="reason"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Motivo do cancelamento</FormLabel>
                        <FormControl>
                          <RadioGroup value={field.value} onValueChange={field.onChange} className="gap-2">
                            {reasons.map(reason => (
                              <label key={reason.value} htmlFor={`cancel-reason-${reason.value}`} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2">
                                <RadioGroupItem id={`cancel-reason-${reason.value}`} value={reason.value} />
                                <span className="text-sm">{reason.label}</span>
                              </label>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch('reason') === 'other' && (
                    <FormField
                      control={form.control}
                      name="details"
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>Conte o motivo</FormLabel>
                          <FormControl>
                            <Textarea {...field} value={field.value ?? ''} maxLength={300} placeholder="Escreva uma breve observação" className="min-h-24" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button type="button" variant="outline" className="min-h-11" disabled={cancelMutation.isPending} onClick={requestClose}>
                      Voltar
                    </Button>
                    <Button type="submit" variant="destructive" className="min-h-11" disabled={!canCancel || cancelMutation.isPending}>
                      {cancelMutation.isPending ? 'Cancelando…' : 'Confirmar cancelamento'}
                    </Button>
                  </div>
                </form>
              </Form>
            </>
          }
        </div>
      </ResponsiveAccountOverlay>
      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Descartar o motivo informado?"
        description="As informações preenchidas neste cancelamento serão perdidas."
        confirmLabel="Descartar"
        destructive
        onConfirm={() => {
          setConfirmDiscard(false)
          form.reset({reason: 'change_of_plans', details: ''})
          onOpenChange(false)
        }}
      />
    </>
  )
}
