import { ConfirmDialog } from '@/shared/components/confirm-dialog';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { RenderComponent } from '@/shared/components/render-component';
import { StatusBadge } from '@/shared/components/status-badge';
import { formatBRL, formatDateTime } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/shared/ui/sheet';
import { Skeleton } from '@/shared/ui/skeleton';

import { ArrowUpRight, CalendarClock, MessageCircle, Scissors, UserRound } from 'lucide-react';

interface Props {
  open: boolean;
  appointmentId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function AppointmentDetailDrawer(props: Props) {
  const { appointmentId, onOpenChange, open } = props;

  return (
    <>
      <Sheet open={open} onOpenChange={closeDrawer}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-2xl" aria-describedby="appointment-detail-description">
          <SheetHeader className="border-b border-border px-5 py-5 pr-14 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Detalhe do agendamento</p>
            <SheetTitle className="text-left text-2xl">{appointment ? `Agendamento ${appointment.code}` : 'Agendamento'}</SheetTitle>
            <SheetDescription id="appointment-detail-description">
              {appointment ? formatDateTime(appointment.start) : 'Dados do cliente, serviços e histórico do atendimento.'}
            </SheetDescription>
            <RenderComponent condition={appointment}>
              <StatusBadge kind="appointment" status={statusLabels[appointment.status] ?? appointment.status.replaceAll('_', ' ')} />
            </RenderComponent>
          </SheetHeader>

          <RenderComponent condition={!validId}>
            <div className="p-5">
              <ErrorState title="Agendamento inválido" description="Abra um cartão da agenda para ver os detalhes." />
            </div>
          </RenderComponent>

          <RenderComponent condition={validId}>
            <RenderComponent condition={detailQuery.isPending}>
              <div className="space-y-4 p-5 sm:p-6" aria-label="Carregando detalhes do agendamento">
                <Skeleton className="h-40 rounded-xl" />
                <Skeleton className="h-48 rounded-xl" />
                <Skeleton className="h-56 rounded-xl" />
              </div>
            </RenderComponent>

            <RenderComponent condition={detailQuery.isError || !detail || !appointment}>
              <div className="p-5">
                <ErrorState
                  title="Não foi possível carregar o agendamento"
                  description="Confira se ele ainda existe e tente novamente."
                  onRetry={() => void detailQuery.refetch()}
                />
              </div>
            </RenderComponent>

            <RenderComponent condition={!(detailQuery.isError || !detail || !appointment)}>
              <div className="space-y-4 px-5 py-5 pb-32 sm:px-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <UserRound className="size-4 text-primary" aria-hidden="true" />
                      Cliente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="font-semibold">{detail.customer.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {detail.customer.phone || 'Telefone não informado'}
                        {detail.customer.email ? ` · ${detail.customer.email}` : ''}
                      </p>
                    </div>
                    <div className="grid gap-3 rounded-lg bg-muted/40 p-3 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Aniversário</p>
                        <p className="font-medium">{birthdayLabel(detail.customer.birthDate)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Cadastro</p>
                        <p className="font-medium">{detail.customer.guest ? 'Cadastro rápido' : 'Cliente cadastrado'}</p>
                      </div>
                    </div>

                    <RenderComponent condition={whatsappHref}>
                      <Button asChild variant="outline" className="min-h-11 w-full">
                        <a href={whatsappHref} target="_blank" rel="noreferrer">
                          <MessageCircle className="size-4" aria-hidden="true" />
                          WhatsApp
                        </a>
                      </Button>
                    </RenderComponent>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CalendarClock className="size-4 text-primary" aria-hidden="true" />
                      Horário e valores
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Profissional</p>
                        <p className="font-medium">{detail.barber.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Duração</p>
                        <p className="font-medium">{formatDuration(elapsedMinutes(appointment))}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Origem</p>
                        <p className="font-medium">{appointment.origin === 'admin' ? 'Painel administrativo' : 'Agendamento online'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Pagamento previsto</p>
                        <p className="font-medium">
                          {appointment.expectedPaymentMethod ?
                            (paymentMethods[appointment.expectedPaymentMethod] ?? appointment.expectedPaymentMethod)
                          : 'Não informado'}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2 border-t border-border pt-3">
                      {appointment.items.map((item) => (
                        <div key={`${appointment.id}-${item.serviceId}`} className="flex justify-between gap-3">
                          <span>
                            {item.name} <span className="text-muted-foreground">· {formatDuration(item.durationMin)}</span>
                          </span>
                          <span className="font-medium">{formatBRL(item.price)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between border-t border-border pt-2 font-semibold">
                        <span>Total previsto</span>
                        <span>{formatBRL(appointment.total)}</span>
                      </div>
                    </div>

                    <RenderComponent condition={appointment.notes?.trim()}>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Observações</p>
                        <p className="mt-1 whitespace-pre-wrap">{appointment.notes}</p>
                      </div>
                    </RenderComponent>

                    <RenderComponent condition={appointment.canceledReason}>
                      <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive">
                        Motivo: {appointment.canceledReason}
                      </p>
                    </RenderComponent>
                  </CardContent>
                </Card>

                <RenderComponent condition={canEditServices}>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Scissors className="size-4 text-primary" aria-hidden="true" />
                        Serviços
                      </CardTitle>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11"
                        onClick={() => {
                          setServiceDraft(appointment.items.map((item) => item.serviceId));
                          setServiceError('');
                          setEditingServices((value) => !value);
                        }}
                      >
                        {editingServices ? 'Fechar edição' : 'Editar serviços'}
                      </Button>
                    </CardHeader>

                    <RenderComponent condition={editingServices}>
                      <CardContent className="space-y-3">
                        <RenderComponent condition={servicesQuery.isPending}>
                          <Skeleton className="h-28 rounded-lg" aria-label="Carregando serviços" />
                        </RenderComponent>

                        <RenderComponent condition={servicesQuery.isError}>
                          <ErrorState title="Não foi possível carregar os serviços" onRetry={() => void servicesQuery.refetch()} />
                        </RenderComponent>

                        <RenderComponent condition={servicesQuery.isSuccess}>
                          <div className="space-y-2">
                            {(servicesQuery.data ?? []).map((service) => {
                              const checked = serviceDraft.includes(service.id);
                              return (
                                <button
                                  key={service.id}
                                  type="button"
                                  aria-pressed={checked}
                                  onClick={() => toggleService(service.id)}
                                  className={`flex min-h-12 w-full items-center gap-3 rounded-md border p-3 text-left ${checked ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
                                >
                                  <Checkbox checked={checked} aria-hidden="true" tabIndex={-1} />
                                  <span className="flex-1 font-medium">{service.name}</span>
                                  <span className="text-sm text-muted-foreground">{formatBRL(service.price)}</span>
                                </button>
                              );
                            })}
                          </div>
                        </RenderComponent>

                        <RenderComponent condition={serviceError}>
                          <p role="alert" className="text-sm text-destructive">
                            {serviceError}
                          </p>
                        </RenderComponent>

                        <p className="text-xs text-muted-foreground">Ao salvar, o servidor recalcula valores, duração e conflitos com a agenda.</p>
                        <Button
                          type="button"
                          className="min-h-11 w-full"
                          disabled={itemsMutation.isPending || servicesQuery.isPending}
                          onClick={() => void saveServices()}
                        >
                          {itemsMutation.isPending ? 'Recalculando...' : 'Salvar serviços'}
                        </Button>
                      </CardContent>
                    </RenderComponent>
                  </Card>
                </RenderComponent>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Histórico do cliente</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RenderComponent condition={detail.history.length > 0}>
                      <ul className="space-y-2">
                        {detail.history.map((historyItem) => (
                          <li key={historyItem.id}>
                            <button
                              type="button"
                              className="flex min-h-12 w-full items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              onClick={() => setLocation(`/admin/agenda?ag=${historyItem.id}`)}
                            >
                              <span className="min-w-0">
                                <span className="block truncate font-medium">{formatDateTime(historyItem.start)}</span>
                                <span className="block text-xs text-muted-foreground">{historyItem.items.map((item) => item.name).join(', ')}</span>
                              </span>
                              <StatusBadge kind="appointment" status={statusLabels[historyItem.status] ?? historyItem.status.replaceAll('_', ' ')} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </RenderComponent>
                    <RenderComponent condition={detail.history.length === 0}>
                      <EmptyState title="Sem histórico" description="Os atendimentos anteriores deste cliente aparecerão aqui." />
                    </RenderComponent>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Pagamentos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RenderComponent condition={detail.payments.length}>
                      <ul className="space-y-2">
                        {detail.payments.map((payment) => (
                          <li key={payment.id} className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2 text-sm">
                            <span>
                              {paymentMethods[payment.method] ?? payment.method} · {payment.status === 'paid' ? 'Pago' : payment.status}
                            </span>
                            <span className="font-medium">{formatBRL(payment.amountCents)}</span>
                          </li>
                        ))}
                      </ul>
                    </RenderComponent>
                    <RenderComponent condition={detail.payments.length === 0}>
                      <p className="text-sm text-muted-foreground">Ainda não há pagamentos registrados.</p>
                    </RenderComponent>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Linha do tempo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RenderComponent condition={appointment.events.length}>
                      <ol className="space-y-3">
                        {[...appointment.events]
                          .sort((left, right) => left.at.localeCompare(right.at))
                          .map((event, index) => (
                            <li key={`${event.at}-${event.type}-${index}`} className="flex gap-3">
                              <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                              <span className="min-w-0">
                                <span className="block text-sm font-medium">{eventLabel(event)}</span>
                                {event.from && event.to && (
                                  <span className="block text-xs text-muted-foreground">
                                    {formatDateTime(event.from)} → {formatDateTime(event.to)}
                                  </span>
                                )}
                                <RenderComponent condition={event.reason}>
                                  <span className="block text-xs text-muted-foreground">Motivo: {event.reason}</span>
                                </RenderComponent>
                                <time className="text-xs text-muted-foreground" dateTime={event.at}>
                                  {formatDateTime(event.at)}
                                </time>
                              </span>
                            </li>
                          ))}
                      </ol>
                    </RenderComponent>
                    <RenderComponent condition={appointment.events.length === 0}>
                      <p className="text-sm text-muted-foreground">Nenhuma atualização registrada.</p>
                    </RenderComponent>
                  </CardContent>
                </Card>

                <RenderComponent condition={detailQuery.isFetching}>
                  <p role="status" className="text-xs text-muted-foreground">
                    Atualizando dados do agendamento…
                  </p>
                </RenderComponent>
              </div>
            </RenderComponent>
          </RenderComponent>

          <RenderComponent condition={appointment}>
            <SheetFooter className="fixed bottom-0 right-0 z-10 grid w-full grid-cols-2 gap-2 border-t border-border bg-background px-5 py-4 sm:max-w-2xl sm:px-6">
              <RenderComponent condition={nextAction && canWriteAgenda}>
                <Button type="button" className="min-h-11" disabled={busy} onClick={() => setConfirmation({ kind: 'status', ...nextAction })}>
                  {nextAction.label}
                </Button>
              </RenderComponent>

              <RenderComponent condition={canComplete && canOpenCash}>
                <Button type="button" className="min-h-11" disabled={busy} onClick={() => void openCommand()}>
                  Concluir
                </Button>
              </RenderComponent>

              <RenderComponent condition={canCancel}>
                <Button
                  type="button"
                  variant="destructive"
                  className="min-h-11"
                  disabled={busy}
                  onClick={() => setLocation(`/admin/agenda?cancelar=1&appointmentId=${appointment.id}`)}
                >
                  Cancelar
                </Button>
              </RenderComponent>

              <RenderComponent condition={canReportNoShow}>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  disabled={busy}
                  onClick={() => setLocation(`/admin/agenda?cancelar=1&type=no_show&appointmentId=${appointment.id}`)}
                >
                  No-show
                </Button>
              </RenderComponent>

              <RenderComponent condition={canReschedule}>
                <Button type="button" variant="outline" className="min-h-11" onClick={openReschedule}>
                  Remarcar
                </Button>
              </RenderComponent>

              <RenderComponent condition={canOpenCash}>
                <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => void openCommand()}>
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                  Abrir comanda
                </Button>
              </RenderComponent>

              <RenderComponent condition={canComplete && !canOpenCash}>
                <p className="col-span-2 text-xs text-muted-foreground">Conclua o atendimento ao fechar a comanda com acesso ao caixa.</p>
              </RenderComponent>

              <Button type="button" variant="ghost" className="col-span-2 min-h-11" onClick={() => closeDrawer(false)}>
                Fechar
              </Button>
            </SheetFooter>
          </RenderComponent>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmation !== null}
        onOpenChange={(open) => !open && !busy && setConfirmation(null)}
        title={confirmation ? `Confirmar ação: ${confirmation.label}?` : 'Confirmar ação?'}
        description="A alteração será registrada na linha do tempo e na auditoria."
        confirmLabel={confirmation?.label ?? 'Confirmar'}
        pending={busy}
        onConfirm={() => void confirmAction()}
      />
      <ConfirmDialog
        open={discardServicesOpen}
        onOpenChange={setDiscardServicesOpen}
        title="Descartar edição dos serviços?"
        description="As alterações ainda não foram salvas. Quer sair sem aplicar a edição?"
        confirmLabel="Descartar alterações"
        destructive
        onConfirm={discardServiceChanges}
      />
    </>
  );
}
