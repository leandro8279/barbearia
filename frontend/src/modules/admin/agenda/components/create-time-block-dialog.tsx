interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRescheduleConflict: (appointmentId: number) => void;
}

export function CreateTimeBlockDialog(props: Props) {
  const { onOpenChange, onRescheduleConflict, open } = props;

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
                  render={({ field }) => (
                    <FormItem className="flex items-start gap-3 rounded-lg border p-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked === true);
                            if (checked === true) form.setValue('barberIds', [], { shouldDirty: true, shouldValidate: true });
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
                            {(barbersQuery.data ?? []).map((barber) => {
                              const checked = form.getValues('barberIds').includes(String(barber.id));
                              return (
                                <label key={barber.id} className="flex min-h-11 items-center gap-3 rounded-md border px-3 text-sm">
                                  <Checkbox checked={checked} onCheckedChange={(value) => toggleBarber(String(barber.id), value === true)} />
                                  {barber.name}
                                </label>
                              );
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
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data inicial</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            min={today()}
                            className="min-h-11"
                            {...field}
                            onChange={(event) => {
                              field.onChange(event);
                              setConflicts([]);
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
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Motivo</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue('type', value === 'Folga' ? 'timeoff' : 'block', { shouldDirty: true });
                          }}
                        >
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
                    render={({ field }) => (
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
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={(value) => field.onChange(value === true)} />
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
                      render={({ field }) => (
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
                      render={({ field }) => (
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
                  render={({ field }) => (
                    <FormItem className="flex items-start gap-3 rounded-lg border p-3">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={(value) => field.onChange(value === true)} />
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
                    render={({ field }) => (
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
                      {conflicts.map((appointment) => (
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
          setDiscardOpen(false);
          form.reset();
          onOpenChange(false);
        }}
      />
    </>
  );
}
