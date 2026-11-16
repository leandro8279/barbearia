import { ConfirmDialog } from '@/shared/components/confirm-dialog';
import { ErrorState } from '@/shared/components/error-state';
import { RenderComponent } from '@/shared/components/render-component';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';

import { MessageCircle } from 'lucide-react';

interface Props {
  open: boolean;
  appointmentId: string | null;
  initialType?: 'customer' | 'barbershop' | 'no_show';
  onOpenChange: (open: boolean) => void;
}

export function CancelAppointmentDialog(props: Props) {
  const { appointmentId, onOpenChange, open, initialType } = props;

  return (
    <>
      <Dialog open={open} onOpenChange={requestClose}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{completed ? 'Registro concluído' : title}</DialogTitle>
            <DialogDescription>
              {appointment ? `${customer?.name ?? 'Cliente'} · ${formatDateTime(appointment.start)}` : 'Registre o tipo de ocorrência e o motivo.'}
            </DialogDescription>
          </DialogHeader>
          <RenderComponent condition={!id}>
            <ErrorState title="Agendamento não informado" description="Abra esta ação a partir de um atendimento da agenda." />
          </RenderComponent>

          <RenderComponent condition={id}>
            <RenderComponent condition={detailQuery.isPending}>
              <Skeleton className="h-24 rounded-lg" aria-label="Carregando agendamento" />
            </RenderComponent>

            <RenderComponent condition={detailQuery.isError || !appointment}>
              <ErrorState title="Não foi possível carregar o agendamento" onRetry={() => void detailQuery.refetch()} />
            </RenderComponent>

            <RenderComponent condition={completed}>
              <div className="space-y-4">
                <p role="status" className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
                  {type === 'no_show' ? 'A ausência foi registrada e o horário foi liberado.' : 'O cancelamento foi registrado sem cobrança de taxa.'}
                </p>

                <RenderComponent condition={offerReschedule && type !== 'no_show' && whatsAppHref}>
                  <Button asChild className="min-h-11 w-full">
                    <a href={whatsAppHref} target="_blank" rel="noreferrer">
                      <MessageCircle className="size-4" aria-hidden="true" /> Oferecer novo horário pelo WhatsApp
                    </a>
                  </Button>
                </RenderComponent>

                <RenderComponent condition={offerReschedule && type !== 'no_show'}>
                  <p className="text-sm text-muted-foreground">O cliente não tem telefone cadastrado para abrir o WhatsApp.</p>
                </RenderComponent>
              </div>
            </RenderComponent>

            <RenderComponent condition={!completed}>
              <Form {...form}>
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

                  <RenderComponent condition={type !== 'no_show'}>
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
                  </RenderComponent>

                  <RenderComponent condition={type === 'barbershop'}>
                    <p className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">Cancelamentos pela barbearia não aplicam taxa.</p>
                  </RenderComponent>
                  <RenderComponent condition={formError}>
                    <p role="alert" className="text-sm text-destructive">
                      {formError}
                    </p>
                  </RenderComponent>

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
            </RenderComponent>
          </RenderComponent>

          <RenderComponent condition={completed}>
            <DialogFooter>
              <Button type="button" className="min-h-11" onClick={() => requestClose(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </RenderComponent>
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
