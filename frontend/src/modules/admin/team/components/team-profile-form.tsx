import {useEffect, useState} from 'react'
import {zodResolver} from '@hookform/resolvers/zod'
import {useForm} from 'react-hook-form'
import {AlertCircle, Copy, LoaderCircle} from 'lucide-react'
import {teamProfileSchema, type TeamProfileValues} from '@/modules/admin/team/schemas/team-profile.schema'
import type {TeamProfile, TeamProfileInput, TeamServiceAssignment} from '@/modules/admin/team/api/team-management'
import {TeamPhotoField} from '@/modules/admin/team/components/team-photo-field'
import {formatBRL, formatDuration} from '@/shared/lib/format'
import {toast} from 'sonner'
import {Button} from '@/shared/ui/button'
import {Checkbox} from '@/shared/ui/checkbox'
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/shared/ui/form'
import {Input} from '@/shared/ui/input'
import {MoneyInput} from '@/shared/components/money-input'
import {Switch} from '@/shared/ui/switch'
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/shared/ui/tabs'
import {Textarea} from '@/shared/ui/textarea'

interface TeamProfileFormProps {
  profile: TeamProfile | null
  serviceCatalog: TeamServiceAssignment[]
  isCreating: boolean
  isPending: boolean
  inviteUrl: string | null
  inviteSent: boolean
  onSave: (input: TeamProfileInput) => Promise<void>
}

function createValues(profile: TeamProfile | null, services: TeamServiceAssignment[]): TeamProfileValues {
  return {
    name: profile?.user.name ?? '',
    email: profile?.user.email ?? '',
    phone: profile?.user.phone ?? '',
    cpf: profile?.user.cpf ?? '',
    bio: profile?.barber.bio ?? '',
    specialties: profile?.barber.specialties ?? [],
    photo: profile?.barber.photo ?? '',
    pixKey: profile?.barber.pixKey ?? '',
    commissionServicePct: profile?.barber.commissionServicePct ?? 45,
    commissionProductPct: profile?.barber.commissionProductPct ?? 10,
    active: profile?.barber.active ?? true,
    services: services.map(service => ({serviceId: service.serviceId, assigned: service.assigned, durationMin: service.durationMin, price: service.price, commissionPct: service.commissionPct}))
  }
}

export function TeamProfileForm({profile, serviceCatalog, isCreating, isPending, inviteUrl, inviteSent, onSave}: TeamProfileFormProps) {
  const [photoError, setPhotoError] = useState('')
  const form = useForm<TeamProfileValues>({resolver: zodResolver(teamProfileSchema), defaultValues: createValues(profile, profile?.services ?? serviceCatalog)})

  useEffect(() => {
    form.reset(createValues(profile, profile?.services ?? serviceCatalog))
  }, [form, profile, serviceCatalog])

  async function submit(values: TeamProfileValues) {
    form.clearErrors('root.server')
    try {
      await onSave({
        ...values,
        specialties: values.specialties.map(value => value.trim()).filter(Boolean),
        pixKey: values.pixKey.trim(),
        phone: values.phone.replace(/\D/g, ''),
        cpf: values.cpf.replace(/\D/g, ''),
        services: values.services
      })
    } catch (error) {
      form.setError('root.server', {type: 'server', message: error instanceof Error ? error.message : 'Não foi possível salvar o profissional.'})
    }
  }

  async function copyInvite() {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      toast.success('Link do convite copiado.')
    } catch {
      toast.error('Não foi possível copiar o link. Selecione e copie o endereço abaixo.')
    }
  }

  const serviceErrors = form.formState.errors.services

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
        <Tabs defaultValue="perfil" className="rounded-xl border border-border bg-card">
          <div className="border-b border-border p-3 sm:p-4">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4">
              <TabsTrigger className="min-h-11" value="perfil">
                Perfil
              </TabsTrigger>
              <TabsTrigger className="min-h-11" value="servicos">
                Serviços e preços
              </TabsTrigger>
              <TabsTrigger className="min-h-11" value="comissao">
                Comissão
              </TabsTrigger>
              <TabsTrigger className="min-h-11" value="acesso">
                Acesso
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="perfil" className="space-y-5 p-4 sm:p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Nome completo</FormLabel>
                    <FormControl>
                      <Input {...field} autoFocus className="min-h-11" autoComplete="name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input {...field} className="min-h-11" inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cpf"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>CPF</FormLabel>
                    <FormControl>
                      <Input {...field} className="min-h-11" inputMode="numeric" maxLength={14} placeholder="000.000.000-00" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pixKey"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Chave Pix</FormLabel>
                    <FormControl>
                      <Input {...field} className="min-h-11" autoComplete="off" placeholder="CPF, telefone, e-mail ou chave aleatória" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="photo"
              render={({field}) => (
                <FormItem>
                  <FormControl>
                    <TeamPhotoField
                      value={field.value}
                      onChange={value => {
                        field.onChange(value)
                        setPhotoError('')
                      }}
                      onError={message => setPhotoError(message || '')}
                    />
                  </FormControl>
                  {photoError && (
                    <p className="text-sm text-destructive" role="alert">
                      {photoError}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Biografia</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={4} maxLength={600} placeholder="Conte um pouco sobre a experiência e o atendimento." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specialties"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Especialidades</FormLabel>
                  <FormControl>
                    <Input
                      value={field.value.join(', ')}
                      onChange={event =>
                        field.onChange(
                          event.target.value
                            .split(',')
                            .map(value => value.trim())
                            .filter(Boolean)
                        )
                      }
                      className="min-h-11"
                      placeholder="Degradê, barba, corte clássico"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">Separe as especialidades por vírgula.</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="active"
              render={({field}) => (
                <FormItem className="flex min-h-14 items-center justify-between gap-4 rounded-lg border border-border p-4">
                  <div>
                    <FormLabel>Profissional ativo</FormLabel>
                    <p className="text-sm text-muted-foreground">Inativos deixam de aparecer no agendamento público, mas mantêm o histórico.</p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Profissional ativo" />
                  </FormControl>
                </FormItem>
              )}
            />
          </TabsContent>

          <TabsContent value="servicos" className="space-y-4 p-4 sm:p-6">
            <p className="text-sm text-muted-foreground">Escolha os serviços realizados. Campos sem valor específico usam o padrão do catálogo.</p>
            {form.watch('services').map((assignment, index) => {
              const service = profile?.services.find(item => item.serviceId === assignment.serviceId) ?? serviceCatalog.find(item => item.serviceId === assignment.serviceId)
              if (!service) return null
              return (
                <section key={assignment.serviceId} className="space-y-4 rounded-xl border border-border p-4">
                  <FormField
                    control={form.control}
                    name={`services.${index}.assigned`}
                    render={({field}) => (
                      <FormItem className="flex min-h-11 items-center gap-3">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={checked => field.onChange(checked === true)} aria-label={`Profissional realiza ${service.name}`} />
                        </FormControl>
                        <FormLabel className="cursor-pointer">{service.name}</FormLabel>
                      </FormItem>
                    )}
                  />
                  {assignment.assigned && (
                    <div className="grid gap-3 sm:grid-cols-3">
                      <FormField
                        control={form.control}
                        name={`services.${index}.durationMin`}
                        render={({field}) => (
                          <FormItem>
                            <FormLabel>Duração específica (min)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="5"
                                step="5"
                                className="min-h-11"
                                value={field.value ?? ''}
                                onChange={event => field.onChange(event.target.value === '' ? null : Number(event.target.value))}
                                placeholder={`${service.defaultDurationMin}`}
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">Padrão: {formatDuration(service.defaultDurationMin)}</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`services.${index}.price`}
                        render={({field}) => (
                          <FormItem>
                            <FormLabel>Preço específico</FormLabel>
                            <FormControl>
                              <MoneyInput
                                id={`team-service-price-${assignment.serviceId}`}
                                value={field.value ?? service.defaultPrice}
                                onValueChange={field.onChange}
                                aria-label={`Preço específico de ${service.name}`}
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">Padrão: {formatBRL(service.defaultPrice)}</p>
                            <Button type="button" variant="ghost" size="sm" className="min-h-11 px-0" onClick={() => field.onChange(null)}>
                              Usar preço padrão
                            </Button>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`services.${index}.commissionPct`}
                        render={({field}) => (
                          <FormItem>
                            <FormLabel>Comissão específica (%)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                className="min-h-11"
                                value={field.value ?? ''}
                                onChange={event => field.onChange(event.target.value === '' ? null : Number(event.target.value))}
                                placeholder={`${service.defaultCommissionPct}`}
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">Padrão do serviço: {service.defaultCommissionPct}%</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </section>
              )
            })}
            {typeof serviceErrors?.message === 'string' && (
              <p className="text-sm text-destructive" role="alert">
                {serviceErrors.message}
              </p>
            )}
          </TabsContent>

          <TabsContent value="comissao" className="space-y-5 p-4 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="commissionServicePct"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Comissão padrão de serviços (%)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="100" step="0.1" className="min-h-11" {...field} onChange={event => field.onChange(Number(event.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="commissionProductPct"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Comissão padrão de produtos (%)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="100" step="0.1" className="min-h-11" {...field} onChange={event => field.onChange(Number(event.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <p className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
              A comissão de cada atendimento é registrada no fechamento da comanda. Alterar estes percentuais não recalcula atendimentos nem comissões já fechados.
            </p>
          </TabsContent>

          <TabsContent value="acesso" className="space-y-5 p-4 sm:p-6">
            <FormField
              control={form.control}
              name="email"
              render={({field}) => (
                <FormItem>
                  <FormLabel>E-mail de acesso</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" className="min-h-11" autoComplete="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium">Papel</p>
                <p className="mt-1 text-sm text-muted-foreground">Barbeiro</p>
              </div>
              <div>
                <p className="text-sm font-medium">Situação do acesso</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isCreating ?
                    'Um convite local será gerado ao salvar.'
                  : profile?.user.hasPassword ?
                    'Conta com senha definida.'
                  : 'A conta ainda precisa definir uma senha.'}
                </p>
              </div>
            </div>
            {inviteUrl && (
              <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
                <div>
                  <p className="font-medium">{inviteSent ? 'Convite enviado por e-mail' : 'Convite pronto para compartilhar'}</p>
                  <p className="text-sm text-muted-foreground">
                    {inviteSent ? 'Também é possível copiar o link abaixo. Ele expira em 30 minutos.' : 'Compartilhe este link para definir uma senha. Ele expira em 30 minutos.'}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input readOnly value={inviteUrl} className="min-h-11" aria-label="Link do convite" />
                  <Button type="button" variant="outline" className="min-h-11 shrink-0" onClick={() => void copyInvite()}>
                    <Copy className="size-4" aria-hidden="true" /> Copiar link
                  </Button>
                </div>
              </div>
            )}
            {isCreating && (
              <p className="text-sm text-muted-foreground">O convite usa um link de definição de senha válido por 30 minutos. Em desenvolvimento, copie o link para compartilhar manualmente.</p>
            )}
          </TabsContent>
        </Tabs>

        {form.formState.errors.root?.server && (
          <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {form.formState.errors.root.server.message}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="submit" className="min-h-11" disabled={isPending || form.formState.isSubmitting || serviceCatalog.length === 0}>
            {(isPending || form.formState.isSubmitting) && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
            {isCreating ? 'Cadastrar profissional' : 'Salvar alterações'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
