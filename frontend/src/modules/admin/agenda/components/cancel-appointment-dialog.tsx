import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { MessageCircle } from 'lucide-react';
import { useAgendaAppointmentDetail, useCancelAgendaAppointment, useMarkAgendaAppointmentNoShow } from '@/modules/admin/agenda/hooks/use-agenda';
import { cancelAppointmentSchema, type CancelAppointmentValues } from '@/modules/admin/agenda/schemas/agenda-overlays.schema';
import { formatDateTime } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Textarea } from '@/shared/ui/textarea';
import { ConfirmDialog } from '@/shared/components/confirm-dialog';
import { ErrorState } from '@/shared/components/error-state';
import { Skeleton } from '@/shared/ui/skeleton';

interface CancelAppointmentDialogProps {
  open: boolean;
  appointmentId: string | null;
  initialType?: 'customer' | 'barbershop' | 'no_show';
  onOpenChange: (open: boolean) => void;
}

export function CancelAppointmentDialog({ open, appointmentId, initialType = 'barbershop', onOpenChange }: CancelAppointmentDialogProps) {
  const id = appointmentId && /^\d+$/.test(appointmentId) ? Number(appointmentId) : null;
  const detailQuery = useAgendaAppointmentDetail(id);
  const appointment = detailQuery.data?.appointment;
  const customer = detailQuery.data?.customer;
  const cancelMutation = useCancelAgendaAppointment();
  const noShowMutation = useMarkAgendaAppointmentNoShow();
  const form = useForm<CancelAppointmentValues>({ resolver: zodResolver(cancelAppointmentSchema), defaultValues: { type: initialType, reason: '', offerReschedule: false } });
  const type = form.watch('type');
  const offerReschedule = form.watch('offerReschedule');
  const [formError, setFormError] = useState('');
  const [whatsAppHref, setWhatsAppHref] = useState('');
  const [completed, setCompleted] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const busy = cancelMutation.isPending || noShowMutation.isPending;

  useEffect(() => {
    if (!open) {
      form.reset({ type: initialType, reason: '', offerReschedule: false });
      setFormError('');
      setWhatsAppHref('');
      setCompleted(false);
    }
  }, [form, initialType, open]);

  function requestClose(nextOpen: boolean) {
    if (!nextOpen && form.formState.isDirty && !completed) {
      setDiscardOpen(true);
      return;
    }
    onOpenChange(nextOpen);
  }

  async function submit(values: CancelAppointmentValues) {
    if (!appointment) return;
    setFormError('');
    try {
      if (values.type === 'no_show') {
        await noShowMutation.mutateAsync({ id: appointment.id, reason: values.reason });
      } else {
        await cancelMutation.mutateAsync({ id: appointment.id, reason: values.reason, cancellationType: values.type, offerReschedule: values.offerReschedule });
      }
      if (values.offerReschedule && values.type !== 'no_show') {
        const phone = (customer?.phone ?? '').replace(/\D/g, '');
        if (phone.length >= 10) {
          const text = `Olá, ${customer?.name}. Seu agendamento de ${formatDateTime(appointment.start)} foi cancelado. Se quiser, podemos ajudar a escolher um novo horário.`;
          setWhatsAppHref(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`);
        }
      }
      setCompleted(true);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Não foi possível atualizar o agendamento.');
    }
  }

  const title =
    type === 'no_show' ? 'Registrar no-show'
    : type === 'customer' ? 'Cancelar a pedido do cliente'
    : 'Cancelar pela barbearia';

  return (
    <>
      <Dialog open={open} onOpenChange={requestClose}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{completed ? 'Registro concluído' : title}</DialogTitle>
            <DialogDescription>{appointment ? `${customer?.name ?? 'Cliente'} · ${formatDateTime(appointment.start)}` : 'Registre o tipo de ocorrência e o motivo.'}</DialogDescription>
          </DialogHeader>
          {!id ?
            <ErrorState title="Agendamento não informado" description="Abra esta ação a partir de um atendimento da agenda." />
          : detailQuery.isPending ?
            <Skeleton className="h-24 rounded-lg" aria-label="Carregando agendamento" />
          : detailQuery.isError || !appointment ?
            <ErrorState title="Não foi possível carregar o agendamento" onRetry={() => void detailQuery.refetch()} />
          : completed ?
            <div className="space-y-4">
              <p role="status" className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
                {type === 'no_show' ? 'A ausência foi registrada e o horário foi liberado.' : 'O cancelamento foi registrado sem cobrança de taxa.'}
              </p>
              {offerReschedule && type !== 'no_show' && whatsAppHref ?
                <Button asChild className="min-h-11 w-full">
                  <a href={whatsAppHref} target="_blank" rel="noreferrer">
                    <MessageCircle className="size-4" aria-hidden="true" /> Oferecer novo horário pelo WhatsApp
                  </a>
                </Button>
              : offerReschedule && type !== 'no_show' ?
                <p className="text-sm text-muted-foreground">O cliente não tem telefone cadastrado para abrir o WhatsApp.</p>
              : null}
            </div>
          : <Form {...form}>
              <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de ocorrência</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="min-h-11 w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="customer">Cancelado pelo cliente</SelectItem>
                          <SelectItem value="barbershop">Cancelado pela barbearia</SelectItem>
                          <SelectItem value="no_show">Cliente não compareceu</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivo</FormLabel>
                      <FormControl>
                        <Textarea rows={3} maxLength={300} placeholder="Descreva o que aconteceu" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {type !== 'no_show' && (
                  <FormField
                    control={form.control}
                    name="offerReschedule"
                    render={({ field }) => (
                      <FormItem className="flex items-start gap-3 rounded-lg border p-3">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={(value) => field.onChange(value === true)} />
                        </FormControl>
                        <div>
                          <FormLabel className="cursor-pointer">Oferecer reagendamento</FormLabel>
                          <p className="text-sm text-muted-foreground">Ao concluir, será possível enviar uma mensagem pronta pelo WhatsApp.</p>
                        </div>
                      </FormItem>
                    )}
                  />
                )}
                {type === 'barbershop' && <p className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">Cancelamentos pela barbearia não aplicam taxa.</p>}
                {formError && (
                  <p role="alert" className="text-sm text-destructive">
                    {formError}
                  </p>
                )}
                <DialogFooter>
                  <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => requestClose(false)}>
                    Voltar
                  </Button>
                  <Button type="submit" variant="destructive" className="min-h-11" disabled={busy}>
                    {busy ?
                      'Salvando...'
                    : type === 'no_show' ?
                      'Registrar ausência'
                    : 'Confirmar cancelamento'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          }
          {completed && (
            <DialogFooter>
              <Button type="button" className="min-h-11" onClick={() => requestClose(false)}>
                Fechar
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Descartar registro?"
        description="As informações ainda não foram salvas."
        confirmLabel="Descartar"
        destructive
        onConfirm={() => {
          setDiscardOpen(false);
          form.reset();
          onOpenChange(false);
        }}
      />
    </>
  );
}
