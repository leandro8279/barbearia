import {useEffect, useState} from 'react'
import {useForm} from 'react-hook-form'
import {zodResolver} from '@hookform/resolvers/zod'
import {BellRing, ExternalLink, Save} from 'lucide-react'
import {useMarkNotificationSent, useNotificationSettings, useResendNotification, useSaveNotificationSettings} from '@/modules/admin/settings/hooks/use-settings'
import type {NotificationLogRow} from '@/modules/admin/settings/api/settings'
import {SettingsField} from '@/modules/admin/settings/components/settings-form-fields'
import {SettingsNavigation} from '@/modules/admin/settings/components/settings-navigation'
import {notificationSchema, type NotificationFormValues} from '@/modules/admin/settings/schemas/notifications.schema'
import {ErrorState} from '@/shared/components/error-state'
import {EmptyState} from '@/shared/components/empty-state'
import {PageHeader} from '@/shared/components/page-header'
import {Button} from '@/shared/ui/button'
import {Card, CardContent, CardHeader, CardTitle} from '@/shared/ui/card'
import {Checkbox} from '@/shared/ui/checkbox'
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/shared/ui/form'
import {Input} from '@/shared/ui/input'
import {Skeleton} from '@/shared/ui/skeleton'
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/shared/ui/tabs'

const notificationTypes = [
  {key: 'confirmation', label: 'Confirmação do agendamento'},
  {key: 'reminder24', label: 'Lembrete 24 horas antes'},
  {key: 'reminder2', label: 'Lembrete 2 horas antes'},
  {key: 'post', label: 'Mensagem pós-atendimento'}
] as const

function dateTimeLabel(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR', {timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short'}).format(new Date(value))
}

function notificationTypeLabel(type: string) {
  return notificationTypes.find(item => item.key === type)?.label || (type === 'rescheduled' ? 'Remarcação' : type)
}

function notificationStatusLabel(status: string) {
  if (status === 'ready') return 'Pronta para envio'
  if (status === 'scheduled' || status === 'queued') return 'Pendente'
  if (status === 'sent') return 'Enviada'
  if (status === 'canceled') return 'Cancelada'
  if (status === 'failed') return 'Falhou'
  return status
}

function ChannelToggle({name, label, control}: {name: 'channels.whatsapp' | 'channels.email'; label: string; control: ReturnType<typeof useForm<NotificationFormValues>>['control']}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({field}) => (
        <FormItem className="flex min-h-12 items-center gap-3 rounded-lg border border-border px-3">
          <FormControl>
            <Checkbox checked={field.value === true} onCheckedChange={checked => field.onChange(checked === true)} />
          </FormControl>
          <FormLabel className="cursor-pointer">{label}</FormLabel>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function EventToggle({
  name,
  label,
  control
}: {
  name: 'events.confirmation' | 'events.reminder24' | 'events.reminder2' | 'events.post'
  label: string
  control: ReturnType<typeof useForm<NotificationFormValues>>['control']
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({field}) => (
        <FormItem className="flex min-h-12 items-center gap-3 rounded-lg border border-border px-3">
          <FormControl>
            <Checkbox checked={field.value === true} onCheckedChange={checked => field.onChange(checked === true)} />
          </FormControl>
          <FormLabel className="cursor-pointer">{label}</FormLabel>
        </FormItem>
      )}
    />
  )
}

export default function NotificationSettingsPage() {
  const query = useNotificationSettings()
  const saveMutation = useSaveNotificationSettings()
  const resendMutation = useResendNotification()
  const markSentMutation = useMarkNotificationSent()
  const [tab, setTab] = useState('config')
  const [prepared, setPrepared] = useState<{url: string; notification: NotificationLogRow} | null>(null)
  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      events: {confirmation: true, reminder24: true, reminder2: true, post: true},
      channels: {whatsapp: true, email: false},
      quietHours: {enabled: true, start: '22:00', end: '08:00'},
      retentionDays: 180,
      templates: {confirmation: '', reminder24: '', reminder2: '', post: ''}
    }
  })

  useEffect(() => {
    document.title = 'Notificações e lembretes | Configurações'
  }, [])

  useEffect(() => {
    if (!query.data) return
    form.reset({...query.data.settings, templates: query.data.templates})
  }, [form, query.data])

  function prepareResend(notification: NotificationLogRow) {
    resendMutation.mutate(notification.id, {
      onSuccess: result => {
        setPrepared({url: result.url, notification: result.notification})
      }
    })
  }

  if (query.isPending)
    return (
      <div className="space-y-5">
        <Skeleton className="h-14" />
        <Skeleton className="h-72" />
        <Skeleton className="h-64" />
      </div>
    )
  if (query.isError || !query.data) return <ErrorState title="Não foi possível carregar as notificações" description="Confira a conexão e tente novamente." onRetry={() => void query.refetch()} />

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Configurações" title="Notificações e lembretes" description="Defina quando avisar os clientes e consulte o histórico de mensagens." />
      <SettingsNavigation active="/admin/config/notificacoes" />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="config">Configurações</TabsTrigger>
          <TabsTrigger value="log">Log ({query.data.notifications.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="mt-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(input => saveMutation.mutate(input))} className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle>Quando avisar</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {notificationTypes.map(item => (
                    <EventToggle key={item.key} name={`events.${item.key}`} label={item.label} control={form.control} />
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Canais de envio</CardTitle>
                  <p className="text-sm text-muted-foreground">WhatsApp abre uma conversa pelo wa.me. E-mail abre o aplicativo configurado no dispositivo.</p>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <ChannelToggle name="channels.whatsapp" label="WhatsApp" control={form.control} />
                  <ChannelToggle name="channels.email" label="E-mail" control={form.control} />
                  {form.formState.errors.channels?.message && <p className="text-sm text-destructive">{form.formState.errors.channels.message}</p>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Horário silencioso</CardTitle>
                  <p className="text-sm text-muted-foreground">Notificações que vencerem nesse período ficam agendadas para o próximo horário permitido, no fuso de São Paulo.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="quietHours.enabled"
                    render={({field}) => (
                      <FormItem className="flex min-h-12 items-center gap-3">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={checked => field.onChange(checked === true)} />
                        </FormControl>
                        <FormLabel className="cursor-pointer">Respeitar horário silencioso</FormLabel>
                      </FormItem>
                    )}
                  />
                  <div className="grid max-w-lg gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="quietHours.start"
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>Início</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="quietHours.end"
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>Fim</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Texto das mensagens</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Variáveis disponíveis: {'{nome}'}, {'{barbeiro}'}, {'{horario}'}.
                  </p>
                </CardHeader>
                <CardContent className="grid gap-5 lg:grid-cols-2">
                  {notificationTypes.map(item => (
                    <SettingsField key={item.key} control={form.control} name={`templates.${item.key}`} label={item.label} multiline rows={4} />
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Retenção do log</CardTitle>
                  <p className="text-sm text-muted-foreground">Registros antigos são removidos automaticamente após o prazo configurado.</p>
                </CardHeader>
                <CardContent className="max-w-xs">
                  <FormField
                    control={form.control}
                    name="retentionDays"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Manter registros por</FormLabel>
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Input
                              type="number"
                              min={30}
                              max={730}
                              step={1}
                              value={Number.isFinite(field.value) ? field.value : ''}
                              onChange={event => field.onChange(event.target.value === '' ? undefined : event.target.valueAsNumber)}
                            />
                          </FormControl>
                          <span className="text-sm text-muted-foreground">dias</span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                O agendador prepara notificações pendentes e respeita o opt-out de marketing. Sem um provedor conectado, o envio é feito manualmente pelo WhatsApp ou pelo e-mail do dispositivo.
              </p>
              <div className="flex justify-end">
                <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={saveMutation.isPending}>
                  <Save className="size-4" /> {saveMutation.isPending ? 'Salvando…' : 'Salvar notificações'}
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="log" className="mt-5 space-y-4">
          {prepared && (
            <Card className="border-primary/40 bg-primary/5">
              <CardHeader>
                <CardTitle>Mensagem preparada</CardTitle>
                <p className="text-sm text-muted-foreground">O registro original não foi alterado. Abra o link para concluir o envio pelo canal selecionado.</p>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm">
                  {prepared.notification.customerName} · {prepared.notification.channel === 'whatsapp' ? 'WhatsApp' : 'E-mail'}
                </p>
                <a
                  href={prepared.url}
                  target={prepared.url.startsWith('http') ? '_blank' : undefined}
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
                  <ExternalLink className="size-4" /> Abrir canal
                </a>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  disabled={markSentMutation.isPending}
                  onClick={() => markSentMutation.mutate(prepared.notification.id, {onSuccess: () => setPrepared(null)})}>
                  Registrar envio concluído
                </Button>
              </CardContent>
            </Card>
          )}

          <p className="text-sm text-muted-foreground">O histórico é somente de consulta. Reenviar cria um novo registro e não sobrescreve o original.</p>
          {query.data.notifications.length ?
            <div className="space-y-3">
              {query.data.notifications.map(notification => (
                <Card key={notification.id}>
                  <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{notificationTypeLabel(notification.type)}</p>
                        <span className="rounded-full border border-border px-2 py-0.5 text-xs">{notificationStatusLabel(notification.status)}</span>
                        <span className="text-xs text-muted-foreground">{notification.channel === 'whatsapp' ? 'WhatsApp' : 'E-mail'}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {notification.customerName} · {notification.barberName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dateTimeLabel(notification.scheduledAt)}
                        {notification.appointmentStart ? ` · horário ${dateTimeLabel(notification.appointmentStart)}` : ''}
                      </p>
                      {notification.message && <p className="line-clamp-2 text-sm">{notification.message}</p>}
                    </div>
                    <Button type="button" variant="outline" className="min-h-11 shrink-0" disabled={resendMutation.isPending} onClick={() => prepareResend(notification)}>
                      <BellRing className="size-4" /> Reenviar
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          : <EmptyState title="O log está vazio" description="As notificações preparadas pelo agendador aparecerão aqui." />}
        </TabsContent>
      </Tabs>
    </div>
  )
}
