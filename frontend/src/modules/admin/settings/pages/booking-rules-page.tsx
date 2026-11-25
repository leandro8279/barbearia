import {useEffect} from 'react'
import {useForm} from 'react-hook-form'
import {zodResolver} from '@hookform/resolvers/zod'
import {Save, ShieldCheck} from 'lucide-react'
import {useBookingRules, useSaveBookingRules} from '@/modules/admin/settings/hooks/use-settings'
import type {BookingRules} from '@/modules/admin/settings/api/settings'
import {SettingsNavigation} from '@/modules/admin/settings/components/settings-navigation'
import {bookingSchema, type BookingFormValues} from '@/modules/admin/settings/schemas/booking.schema'
import {ErrorState} from '@/shared/components/error-state'
import {PageHeader} from '@/shared/components/page-header'
import {Button} from '@/shared/ui/button'
import {Card, CardContent, CardHeader, CardTitle} from '@/shared/ui/card'
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/shared/ui/form'
import {Input} from '@/shared/ui/input'
import {Skeleton} from '@/shared/ui/skeleton'

const defaults: BookingFormValues = {
  slotGranularityMin: 15,
  minAdvanceMin: 60,
  maxDays: 45,
  defaultBufferMin: 0,
  cancelBeforeHours: 4,
  rescheduleBeforeHours: 4,
  maxReschedules: 2,
  autoConfirm: true,
  maxFutureAppointments: 3
}

function durationLabel(minutes: number) {
  if (!minutes) return 'sem antecedência mínima'
  if (minutes < 60) return `${minutes} minutos`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours} h e ${remainder} min` : `${hours} h`
}

function NumberRuleField({
  control,
  name,
  label,
  min,
  max,
  suffix
}: {
  control: ReturnType<typeof useForm<BookingFormValues>>['control']
  name: Exclude<keyof BookingFormValues, 'slotGranularityMin' | 'autoConfirm'>
  label: string
  min: number
  max: number
  suffix: string
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({field}) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <div className="flex items-center gap-2">
            <FormControl>
              <Input
                type="number"
                min={min}
                max={max}
                step={name === 'defaultBufferMin' ? 5 : 1}
                value={Number.isFinite(field.value) ? field.value : ''}
                onChange={event => field.onChange(event.target.value === '' ? undefined : event.target.valueAsNumber)}
              />
            </FormControl>
            <span className="min-w-24 text-sm text-muted-foreground">{suffix}</span>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export default function BookingRulesPage() {
  const query = useBookingRules()
  const saveMutation = useSaveBookingRules()
  const form = useForm<BookingFormValues>({resolver: zodResolver(bookingSchema), defaultValues: defaults})

  useEffect(() => {
    document.title = 'Regras de agendamento | Configurações'
  }, [])

  useEffect(() => {
    if (query.data) form.reset(query.data as BookingRules)
  }, [form, query.data])

  const values = form.watch()
  const canSubmit = !saveMutation.isPending

  if (query.isPending)
    return (
      <div className="space-y-5">
        <Skeleton className="h-14" />
        <Skeleton className="h-72" />
        <Skeleton className="h-56" />
      </div>
    )
  if (query.isError || !query.data) return <ErrorState title="Não foi possível carregar as regras" description="Confira a conexão e tente novamente." onRetry={() => void query.refetch()} />

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Configurações" title="Regras de agendamento" description="Defina as condições para novos horários solicitados pelos clientes." />
      <SettingsNavigation active="/admin/config/agendamento" />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(input => saveMutation.mutate(input))} className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Disponibilidade</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="slotGranularityMin"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Intervalo da grade</FormLabel>
                    <FormControl>
                      <select className="min-h-11 w-full rounded-md border border-input bg-background px-3" value={field.value} onChange={event => field.onChange(Number(event.target.value))}>
                        <option value={15}>A cada 15 minutos</option>
                        <option value={30}>A cada 30 minutos</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <NumberRuleField control={form.control} name="minAdvanceMin" label="Antecedência mínima" min={0} max={10080} suffix="minutos" />
              <NumberRuleField control={form.control} name="maxDays" label="Agendar até" min={1} max={365} suffix="dias à frente" />
              <NumberRuleField control={form.control} name="defaultBufferMin" label="Intervalo padrão" min={0} max={120} suffix="minutos" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cancelamento e reagendamento</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <NumberRuleField control={form.control} name="cancelBeforeHours" label="Janela para cancelar" min={0} max={720} suffix="horas antes" />
              <NumberRuleField control={form.control} name="rescheduleBeforeHours" label="Janela para reagendar" min={0} max={720} suffix="horas antes" />
              <NumberRuleField control={form.control} name="maxReschedules" label="Limite de reagendamentos" min={0} max={20} suffix="por agendamento" />
              <NumberRuleField control={form.control} name="maxFutureAppointments" label="Limite por cliente" min={1} max={50} suffix="agendamentos futuros" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Confirmação</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="autoConfirm"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Como confirmar novos agendamentos</FormLabel>
                    <FormControl>
                      <select
                        className="min-h-11 w-full max-w-xl rounded-md border border-input bg-background px-3"
                        value={String(field.value)}
                        onChange={event => field.onChange(event.target.value === 'true')}>
                        <option value="true">Confirmar automaticamente</option>
                        <option value="false">Aguardar confirmação manual</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-primary" /> Prévia: como o cliente vê a política
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                Os horários aparecem em intervalos de {values.slotGranularityMin} minutos, com pelo menos {durationLabel(values.minAdvanceMin)} de antecedência e até {values.maxDays} dias à frente.
              </p>
              <p>{values.autoConfirm ? 'O agendamento é confirmado automaticamente.' : 'O agendamento fica aguardando confirmação da equipe.'}</p>
              <p>
                Cancelamento: até {values.cancelBeforeHours} horas antes. Reagendamento: até {values.rescheduleBeforeHours} horas antes, no máximo {values.maxReschedules} vez(es).
              </p>
              <p>
                O cliente pode manter até {values.maxFutureAppointments} agendamento(s) futuro(s). O intervalo padrão entre serviços é de {values.defaultBufferMin} minuto(s).
              </p>
            </CardContent>
          </Card>

          <p className="text-sm text-muted-foreground">As regras passam a valer para novas solicitações. Agendamentos já existentes não são alterados.</p>
          <div className="flex justify-end">
            <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={!canSubmit}>
              <Save className="size-4" /> {saveMutation.isPending ? 'Salvando…' : 'Salvar regras'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
