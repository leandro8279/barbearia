import {useEffect, useMemo} from 'react'
import {ArrowRight, ArrowUpRight, Clock3, MapPin, MessageCircle, Scissors} from 'lucide-react'
import {Link, useLocation} from 'wouter'
import {EmptyState} from '@/shared/components/empty-state'
import {ErrorState} from '@/shared/components/error-state'
import {ServiceCard} from '@/shared/components/service-card'
import {formatDate, formatDuration} from '@/shared/lib/format'
import {BUSINESS_TIME_ZONE} from '@/shared/lib/time'
import {useBookingDraftStore} from '@/shared/stores/booking-draft-store'
import {Badge} from '@/shared/ui/badge'
import {Button} from '@/shared/ui/button'
import {Card, CardContent, CardFooter} from '@/shared/ui/card'
import {Skeleton} from '@/shared/ui/skeleton'
import {usePublicBarberList} from '@/modules/site/hooks/use-public-barber-list'
import {usePublicServiceCatalog} from '@/modules/site/hooks/use-public-service-catalog'
import {usePublicUnit} from '@/modules/site/hooks/use-public-unit'
import type {PublicUnit, UnitHoliday, UnitHoursRange} from '@/modules/site/api/unit'

const weekdays = [
  {value: 1, label: 'Segunda-feira', shortLabel: 'Seg'},
  {value: 2, label: 'Terça-feira', shortLabel: 'Ter'},
  {value: 3, label: 'Quarta-feira', shortLabel: 'Qua'},
  {value: 4, label: 'Quinta-feira', shortLabel: 'Qui'},
  {value: 5, label: 'Sexta-feira', shortLabel: 'Sex'},
  {value: 6, label: 'Sábado', shortLabel: 'Sáb'},
  {value: 0, label: 'Domingo', shortLabel: 'Dom'}
]

const schemaWeekdays: Record<number, string> = {
  0: 'https://schema.org/Sunday',
  1: 'https://schema.org/Monday',
  2: 'https://schema.org/Tuesday',
  3: 'https://schema.org/Wednesday',
  4: 'https://schema.org/Thursday',
  5: 'https://schema.org/Friday',
  6: 'https://schema.org/Saturday'
}

function getRangeEdges(range: UnitHoursRange): {start: string; end: string} {
  return 'start' in range ? range : {start: range[0], end: range[1]}
}

function formatRanges(ranges?: UnitHoursRange[]): string {
  if (!ranges?.length) return 'Fechado'
  return ranges.map(range => {
    const {start, end} = getRangeEdges(range)
    return `${start}–${end}`
  }).join(' · ')
}

function getBusinessDate(value: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(value)
  const part = (type: string) => parts.find(item => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

function getUpcomingHolidays(holidays: UnitHoliday[] | undefined): UnitHoliday[] {
  const today = getBusinessDate(new Date())
  return (holidays ?? [])
    .filter(holiday => holiday.date >= today)
    .sort((left, right) => left.date.localeCompare(right.date))
}

function toWhatsAppUrl(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return `https://wa.me/${digits.startsWith('55') ? digits : `55${digits}`}`
}

function addBarberShopStructuredData(unit: PublicUnit) {
  const address = unit.address?.trim()
  const openingHoursSpecification = (unit.businessHours ?? []).flatMap(day =>
    (day.ranges ?? []).map(range => {
      const {start, end} = getRangeEdges(range)
      return {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: schemaWeekdays[Number(day.weekday)],
        opens: start,
        closes: end
      }
    })
  )
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BarberShop',
    name: unit.name?.trim() || 'Barbearia',
    url: window.location.origin,
    ...(address ? {address: {'@type': 'PostalAddress', streetAddress: address, addressCountry: 'BR'}} : {}),
    ...(unit.phone ? {telephone: unit.phone} : {}),
    ...(openingHoursSpecification.length ? {openingHoursSpecification} : {})
  }
  const current = document.getElementById('barbearia-json-ld')
  const script = current instanceof HTMLScriptElement ? current : document.createElement('script')
  script.id = 'barbearia-json-ld'
  script.type = 'application/ld+json'
  script.textContent = JSON.stringify(schema)
  if (!current) document.head.append(script)
}

function ContactAndHours({unit, isLoading, isError, retry}: {unit?: PublicUnit | null; isLoading: boolean; isError: boolean; retry: () => void}) {
  const address = unit?.address?.trim()
  const whatsapp = unit?.whatsapp?.trim() || unit?.phone?.trim()
  const mapUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${unit?.name ?? ''} ${address}`.trim())}` : null
  const upcomingHolidays = getUpcomingHolidays(unit?.holidays)

  return (
    <section id="visite" className="scroll-mt-24 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      <Card className="overflow-hidden border-border/80 bg-card">
        <CardContent className="p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Sua próxima visita</p>
          <h2 className="mt-2 text-3xl font-semibold">Estamos por aqui.</h2>
          <p className="mt-2 max-w-xl text-muted-foreground">Passe para renovar o visual ou fale com a gente para tirar suas dúvidas.</p>

          {isLoading ?
            <div className="mt-7 space-y-3" aria-label="Carregando endereço">
              <Skeleton className="h-6 w-4/5" />
              <Skeleton className="h-11 w-40" />
            </div>
          : isError ?
            <div className="mt-7">
              <ErrorState description="Não foi possível carregar o endereço." onRetry={retry} />
            </div>
          : <>
              <div className="mt-7 flex items-start gap-3">
                <MapPin className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <address className="not-italic leading-6">{address || 'Endereço não informado'}</address>
              </div>
              {mapUrl && (
                <Button asChild variant="outline" className="mt-4 min-h-11 gap-2">
                  <a href={mapUrl} target="_blank" rel="noreferrer">
                    Como chegar <ArrowUpRight className="size-4" aria-hidden="true" />
                  </a>
                </Button>
              )}
            </>
          }

          {whatsapp && (
            <div className="mt-6 border-t border-border pt-5">
              <Button asChild className="min-h-11 gap-2">
                <a href={toWhatsAppUrl(whatsapp)} target="_blank" rel="noreferrer">
                  <MessageCircle className="size-4" aria-hidden="true" /> Falar pelo WhatsApp
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card">
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Clock3 className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Funcionamento</p>
              <h2 className="mt-1 text-2xl font-semibold">Horários da semana</h2>
            </div>
          </div>
          {isLoading ?
            <div className="mt-6 space-y-3" aria-label="Carregando horários">
              {weekdays.slice(0, 5).map(day => <Skeleton key={day.value} className="h-5 w-full" />)}
            </div>
          : isError ?
            <p className="mt-6 text-sm text-muted-foreground">Horários indisponíveis no momento.</p>
          : unit?.businessHours?.length ?
            <ul className="mt-6 divide-y divide-border">
              {weekdays.map(day => {
                const hours = unit.businessHours?.find(item => Number(item.weekday) === day.value)?.ranges
                return (
                  <li key={day.value} className="flex items-center justify-between gap-4 py-3 text-sm">
                    <span className="text-muted-foreground">{day.label}</span>
                    <span className="text-right font-medium">{formatRanges(hours)}</span>
                  </li>
                )
              })}
            </ul>
          : <p className="mt-6 text-sm text-muted-foreground">Horários não informados.</p>}
          {upcomingHolidays.length > 0 && (
            <section aria-labelledby="special-hours-heading" className="mt-6 border-t border-border pt-5">
              <h3 id="special-hours-heading" className="text-base font-semibold">Feriados e datas especiais</h3>
              <p className="mt-1 text-sm text-muted-foreground">Confira as exceções aos horários semanais.</p>
              <ul className="mt-3 space-y-2">
                {upcomingHolidays.map(holiday => {
                  const isClosed = holiday.closed || !holiday.ranges?.length
                  return (
                    <li key={holiday.date} className="flex flex-col gap-1 rounded-lg bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <div className="min-w-0">
                        <time dateTime={holiday.date} className="text-sm text-muted-foreground">
                          {formatDate(holiday.date, "EEEE, dd 'de' MMMM 'de' yyyy")}
                        </time>
                        <p className="break-words font-medium">{holiday.name}</p>
                      </div>
                      <Badge variant={isClosed ? 'destructive' : 'secondary'} className="min-h-7 w-fit shrink-0 px-2.5">
                        {isClosed ? 'Fechado' : formatRanges(holiday.ranges)}
                      </Badge>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

export default function HomePage() {
  const [, navigate] = useLocation()
  const setServiceIds = useBookingDraftStore(state => state.setServiceIds)
  const setStep = useBookingDraftStore(state => state.setStep)
  const catalogQuery = usePublicServiceCatalog(true)
  const barbersQuery = usePublicBarberList()
  const unitQuery = usePublicUnit()

  const featuredServices = useMemo(() => (catalogQuery.data?.services ?? []).filter(service => service.featured).slice(0, 3), [catalogQuery.data?.services])
  const prices = useMemo(() => new Map(catalogQuery.data?.prices.map(item => [item.serviceId, item]) ?? []), [catalogQuery.data?.prices])
  const barbers = useMemo(() => (barbersQuery.data ?? []).slice(0, 3), [barbersQuery.data])

  useEffect(() => {
    const unit = unitQuery.data
    if (!unit) return
    const timeoutId = window.setTimeout(() => addBarberShopStructuredData(unit), 0)
    return () => window.clearTimeout(timeoutId)
  }, [unitQuery.data])

  function startBooking(serviceId?: number) {
    if (serviceId !== undefined) setServiceIds([String(serviceId)])
    else setServiceIds([])
    setStep('services')
    navigate(serviceId ? `/agendar?serviceId=${serviceId}` : '/agendar')
  }

  return (
    <div className="space-y-16 pb-8 sm:space-y-20">
      <section className="relative isolate overflow-hidden rounded-2xl border border-primary/15 bg-[#11110f] px-6 py-12 shadow-panel sm:px-10 sm:py-16 lg:px-16 lg:py-20">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_78%_18%,rgba(213,164,75,0.17),transparent_42%),linear-gradient(115deg,transparent_50%,rgba(255,255,255,0.025))]" />
        <div className="absolute -right-8 -top-12 -z-10 hidden size-80 rounded-full border border-primary/10 lg:block" />
        <div className="absolute -right-1 top-3 -z-10 hidden size-64 rounded-full border border-primary/10 lg:block" />
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-hero-accent">
            <Scissors className="size-3.5" aria-hidden="true" /> <span className="max-w-64 truncate">{unitQuery.data?.name?.trim() || 'Barbearia'}</span>
          </p>
          <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-[1.06] tracking-wide text-white sm:text-6xl lg:text-7xl">
            Seu estilo começa <span className="text-hero-accent">aqui.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-stone-300 sm:text-lg">
            Bons cortes, bons momentos e atendimento feito para você. Escolha seu serviço e reserve seu horário em poucos passos.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button onClick={() => startBooking()} className="min-h-12 gap-2 px-6 text-base shadow-gold">
              Agendar horário <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
            <Button asChild variant="outline" className="min-h-12 border-white/20 bg-white/5 px-6 text-white hover:bg-white/10 hover:text-white">
              <Link href="/servicos">Conhecer serviços</Link>
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-stone-300">
            <span className="inline-flex items-center gap-2"><span className="size-1.5 rounded-full bg-primary" />Agendamento online</span>
            <span className="inline-flex items-center gap-2"><span className="size-1.5 rounded-full bg-primary" />Atendimento com hora marcada</span>
          </div>
        </div>
      </section>

      <section aria-labelledby="services-heading">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Escolha o seu próximo visual</p>
            <h2 id="services-heading" className="mt-1 text-3xl font-semibold sm:text-4xl">Serviços em destaque</h2>
          </div>
          <Button asChild variant="ghost" className="min-h-11 gap-2">
            <Link href="/servicos">Ver todos <ArrowRight className="size-4" aria-hidden="true" /></Link>
          </Button>
        </div>
        {catalogQuery.isPending ?
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Carregando serviços em destaque">
            {Array.from({length: 3}, (_, index) => <Skeleton key={index} className="h-44 rounded-xl" />)}
          </div>
        : catalogQuery.isError ?
          <ErrorState description="Não foi possível carregar os serviços em destaque." onRetry={() => void catalogQuery.refetch()} />
        : featuredServices.length === 0 ?
          <EmptyState title="Serviços em destaque em breve" description="Enquanto isso, confira nosso menu completo." actionLabel="Ver serviços" onAction={() => navigate('/servicos')} />
        : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featuredServices.map(service => {
              const price = prices.get(service.id)
              return (
                <article key={service.id} className="h-full">
                  <ServiceCard
                    name={service.name}
                    description={service.description}
                    durationMinutes={service.durationMin}
                    priceCents={price?.price ?? service.price}
                    priceCaption={price?.variesByBarber ? 'A partir de' : undefined}
                    footer={
                      <>
                        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Clock3 className="size-4" aria-hidden="true" /> {formatDuration(service.durationMin)}
                        </span>
                        <Button onClick={() => startBooking(service.id)} className="min-h-11">Agendar</Button>
                      </>
                    }
                  />
                </article>
              )
            })}
          </div>
        }
      </section>

      <section aria-labelledby="team-heading">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Mãos experientes, atenção aos detalhes</p>
            <h2 id="team-heading" className="mt-1 text-3xl font-semibold sm:text-4xl">Quem cuida do seu estilo</h2>
          </div>
          <Button asChild variant="ghost" className="min-h-11 gap-2">
            <Link href="/barbeiros">Conhecer a equipe <ArrowRight className="size-4" aria-hidden="true" /></Link>
          </Button>
        </div>
        {barbersQuery.isPending ?
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Carregando profissionais">
            {Array.from({length: 3}, (_, index) => <Skeleton key={index} className="h-40 rounded-xl" />)}
          </div>
        : barbersQuery.isError ?
          <ErrorState description="Não foi possível carregar a equipe agora." onRetry={() => void barbersQuery.refetch()} />
        : barbers.length === 0 ?
          <EmptyState title="Equipe em atualização" description="Volte em breve para conhecer nossos profissionais." />
        : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {barbers.map(barber => (
              <article key={barber.id} className="h-full">
                <Card className="h-full overflow-hidden border-border/80 bg-card">
                  <div className="aspect-[16/10] overflow-hidden bg-secondary">
                    {barber.photo ?
                      <img src={barber.photo} alt={`Foto de ${barber.name}`} width={480} height={300} loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-300 hover:scale-[1.03]" />
                    : <div className="flex size-full items-center justify-center bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.16),transparent_58%)] text-primary">
                        <Scissors className="size-12" aria-hidden="true" />
                      </div>}
                  </div>
                  <CardContent className="space-y-3 pt-5">
                    <h3 className="text-xl font-semibold">{barber.name}</h3>
                    {barber.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1.5" aria-label={`Especialidades de ${barber.name}`}>
                        {barber.specialties.slice(0, 3).map(specialty => (
                          <Badge key={specialty} variant="secondary" className="rounded-full font-normal">{specialty}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="mt-auto justify-end border-t pt-4">
                    <Button asChild variant="outline" className="min-h-11 gap-2">
                      <Link href="/barbeiros">Ver equipe <ArrowRight className="size-4" aria-hidden="true" /></Link>
                    </Button>
                  </CardFooter>
                </Card>
              </article>
            ))}
          </div>
        }
      </section>

      <ContactAndHours unit={unitQuery.data} isLoading={unitQuery.isPending} isError={unitQuery.isError} retry={() => void unitQuery.refetch()} />
    </div>
  )
}
