import { ConfirmDialog } from '@/shared/components/confirm-dialog';
import { ErrorState } from '@/shared/components/error-state';
import { RenderComponent } from '@/shared/components/render-component';
import { SlotGrid } from '@/shared/components/slot-grid';
import { formatBRL, formatDateTime, formatDuration } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';

import { ArrowRight, MessageCircle } from 'lucide-react';

interface Props {
  open: boolean;
  appointmentId: string | null;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
  completedActionLabel?: string;
}

export function RescheduleAppointmentDialog(props: Props) {
  const { appointmentId, onOpenChange, open, completedActionLabel, onCompleted } = props;

  return (
    <>
      <Dialog open={open} onOpenChange={requestClose}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Remarcar agendamento</DialogTitle>
            <DialogDescription>
              {appointment ? `${customer?.name ?? 'Cliente'} · ${formatDateTime(appointment.start)}` : 'Escolha profissional, data e horário.'}
            </DialogDescription>
          </DialogHeader>

          <RenderComponent condition={!id}>
            <ErrorState title="Agendamento não informado" description="Abra a remarcação a partir de um atendimento da agenda." />
          </RenderComponent>

          <RenderComponent condition={id}>
            <RenderComponent condition={detailQuery.isPending}>
              <div className="space-y-3">
                <Skeleton className="h-12 rounded-lg" />
                <Skeleton className="h-32 rounded-lg" />
              </div>
            </RenderComponent>
            <RenderComponent condition={detailQuery.isError || !appointment}>
              <ErrorState title="Não foi possível carregar o agendamento" onRetry={() => void detailQuery.refetch()} />
            </RenderComponent>

            <RenderComponent condition={completed}>
              <div className="space-y-4">
                <p role="status" className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
                  Novo horário salvo e registrado no histórico.
                </p>

                <RenderComponent condition={notifyCustomer && whatsAppHref}>
                  <Button asChild className="min-h-11 w-full">
                    <a href={whatsAppHref} target="_blank" rel="noreferrer">
                      <MessageCircle className="size-4" aria-hidden="true" /> Avisar cliente pelo WhatsApp
                    </a>
                  </Button>
                </RenderComponent>

                <RenderComponent condition={notifyCustomer && whatsAppHref && notifyCustomer}>
                  <p className="text-sm text-muted-foreground">
                    A notificação ficou registrada, mas o cliente não tem telefone cadastrado para abrir o WhatsApp.
                  </p>
                </RenderComponent>
              </div>
            </RenderComponent>

            <RenderComponent condition={!completed}>
              <Form {...form}>
                <form className="space-y-5" onSubmit={form.handleSubmit(submit)}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="barberId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Barbeiro</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              form.setValue('start', '', { shouldDirty: true });
                            }}
                          >
                            <FormControl>
                              <SelectTrigger className="min-h-11 w-full">
                                <SelectValue placeholder={barberQuery.isPending ? 'Carregando...' : 'Selecione'} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(barberQuery.data ?? []).map((barber) => (
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
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              min={today()}
                              className="min-h-11"
                              {...field}
                              onChange={(event) => {
                                field.onChange(event);
                                form.setValue('start', '', { shouldDirty: true });
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <RenderComponent condition={barberQuery.isError}>
                    <ErrorState title="Não foi possível carregar os barbeiros" onRetry={() => void barberQuery.refetch()} />
                  </RenderComponent>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Sugestões de horário</p>

                    <RenderComponent condition={slotsQuery.isPending}>
                      <Skeleton className="h-28 rounded-lg" aria-label="Buscando horários" />
                    </RenderComponent>
                    <RenderComponent condition={slotsQuery.isError}>
                      <ErrorState title="Não foi possível consultar horários" onRetry={() => void slotsQuery.refetch()} />
                    </RenderComponent>
                    <RenderComponent condition={slotsQuery.isSuccess}>
                      <SlotGrid
                        slots={slots.map((slot) => ({ time: timeOf(slot.start), available: true }))}
                        selectedTime={selectedSlot ? timeOf(selectedSlot.start) : null}
                        onSelect={(time) => {
                          const slot = slots.find((item) => timeOf(item.start) === time);
                          form.setValue('start', slot?.start ?? '', { shouldValidate: true, shouldDirty: true });
                        }}
                        emptyMessage="Não há horários disponíveis nessa data para este barbeiro."
                      />
                    </RenderComponent>

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
                    render={({ field }) => (
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
                    render={({ field }) => (
                      <FormItem className="flex items-start gap-3 rounded-lg border p-3">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={(value) => field.onChange(value === true)} />
                        </FormControl>
                        <div>
                          <FormLabel className="cursor-pointer">Avisar cliente por WhatsApp</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Registra a mudança e oferece um link para enviar o horário anterior e o novo.
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />

                  <RenderComponent condition={selectedSlot}>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 p-3 text-sm">
                      <span>
                        {formatDuration(selectedSlot.durationMin)} · {formatBRL(selectedSlot.subtotal)}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <ArrowRight className="size-4" aria-hidden="true" />
                        {formatDateTime(selectedSlot.start)}
                      </span>
                    </div>
                  </RenderComponent>

                  <RenderComponent condition={formError}>
                    <p role="alert" className="text-sm text-destructive">
                      {formError}
                    </p>
                  </RenderComponent>

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
            </RenderComponent>
          </RenderComponent>

          <RenderComponent condition={completed}>
            <DialogFooter>
              <Button type="button" className="min-h-11" onClick={() => (onCompleted ? onCompleted() : requestClose(false))}>
                {completedActionLabel}
              </Button>
            </DialogFooter>
          </RenderComponent>
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
          setDiscardOpen(false);
          form.reset();
          onOpenChange(false);
        }}
      />
    </>
  );
}
