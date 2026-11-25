import { useEffect, useState } from 'react';
import { Clock3, ExternalLink, MapPin, MessageCircle, Navigation, Phone } from 'lucide-react';
import { Link } from 'wouter';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { HttpError } from '@/shared/lib/http';
import { BUSINESS_TIME_ZONE } from '@/shared/lib/time';
import { usePublicUnit } from '@/modules/site/hooks/use-public-unit';
import type { PublicUnit, UnitHoursRange } from '@/modules/site/api/unit';

const weekDays = [
  { weekday: 1, label: 'Segunda-feira' },
  { weekday: 2, label: 'Terça-feira' },
  { weekday: 3, label: 'Quarta-feira' },
  { weekday: 4, label: 'Quinta-feira' },
  { weekday: 5, label: 'Sexta-feira' },
  { weekday: 6, label: 'Sábado' },
  { weekday: 0, label: 'Domingo' },
];

interface SaoPauloClock {
  date: string;
  weekday: number;
  minuteOfDay: number;
}

function getSaoPauloClock(value: Date): SaoPauloClock {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  return { date: `${part('year')}-${part('month')}-${part('day')}`, weekday: weekdays[part('weekday')] ?? 0, minuteOfDay: Number(part('hour')) * 60 + Number(part('minute')) };
}

function getRangeEdges(range: UnitHoursRange): { start: string; end: string } {
  return 'start' in range ? range : { start: range[0], end: range[1] };
}

function parseMinutes(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function formatRanges(ranges?: UnitHoursRange[]): string {
  if (!ranges?.length) return 'Fechado';
  return ranges
    .map((range) => {
      const { start, end } = getRangeEdges(range);
      return `${start}–${end}`;
    })
    .join(' · ');
}

function getHoursForDay(unit: PublicUnit, weekday: number, date: string, isToday: boolean): string {
  const holiday = isToday ? unit.holidays?.find((item) => item.date === date) : undefined;
  if (holiday?.closed) return holiday.name ? `Fechado · ${holiday.name}` : 'Fechado';
  if (holiday && holiday.ranges !== undefined) {
    const specialHours = formatRanges(holiday.ranges);
    if (specialHours === 'Fechado') return holiday.name ? `Fechado · ${holiday.name}` : specialHours;
    return holiday.name ? `${specialHours} · ${holiday.name}` : specialHours;
  }

  return formatRanges(unit.businessHours?.find((item) => Number(item.weekday) === weekday)?.ranges);
}

function isOpenAt(unit: PublicUnit, clock: SaoPauloClock): boolean {
  const holiday = unit.holidays?.find((item) => item.date === clock.date);
  if (holiday?.closed) return false;
  const ranges = holiday && holiday.ranges !== undefined ? holiday.ranges : unit.businessHours?.find((item) => Number(item.weekday) === clock.weekday)?.ranges;

  return Boolean(
    ranges?.some((range) => {
      const { start, end } = getRangeEdges(range);
      const startMinutes = parseMinutes(start);
      const endMinutes = parseMinutes(end);
      return startMinutes !== null && endMinutes !== null && clock.minuteOfDay >= startMinutes && clock.minuteOfDay < endMinutes;
    }),
  );
}

function toBrazilianPhoneHref(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `tel:+${digits.startsWith('55') ? digits : `55${digits}`}`;
}

function toWhatsAppUrl(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits.startsWith('55') ? digits : `55${digits}`}`;
}

export default function ContactPage() {
  const unitQuery = usePublicUnit();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    document.title = 'Contato e horários | Barbearia';
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) {
      description = document.createElement('meta');
      description.name = 'description';
      document.head.append(description);
    }
    description.content = 'Encontre a Barbearia, confira os horários de funcionamento e fale com a equipe.';
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const unit = unitQuery.data;
  const unitNotFound = unitQuery.error instanceof HttpError && unitQuery.error.status === 404;
  const clock = unit ? getSaoPauloClock(now) : null;
  const openNow = unit && clock ? isOpenAt(unit, clock) : false;
  const address = unit?.address?.trim();
  const phone = unit?.phone?.trim();
  const whatsapp = unit?.whatsapp?.trim() || phone;
  const mapsUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${unit?.name ?? ''} ${address}`.trim())}` : null;

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Estamos por aqui" title="Contato e horários" description="Planeje sua visita, fale com a equipe ou veja como chegar até a unidade." />

      {unitQuery.isPending ?
        <div className="grid gap-5 lg:grid-cols-2" aria-label="Carregando informações de contato">
          <Skeleton className="h-[26rem] rounded-xl" />
          <Skeleton className="h-[26rem] rounded-xl" />
        </div>
      : unitQuery.isError && !unitNotFound ?
        <ErrorState description="Não foi possível carregar os dados da unidade agora." onRetry={() => void unitQuery.refetch()} />
      : unitNotFound || !unit ?
        <EmptyState title="Dados da unidade indisponíveis" description="As informações de contato ainda não foram cadastradas." />
      : <>
          <div className="grid items-start gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-xl">Onde estamos</CardTitle>
                <CardDescription>{unit.name || 'Barbearia'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                  <address className="not-italic leading-6">{address || 'Endereço não informado'}</address>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {phone ?
                    <Button asChild variant="outline" className="min-h-11 justify-start">
                      <a href={toBrazilianPhoneHref(phone)}>
                        <Phone aria-hidden="true" /> {phone}
                      </a>
                    </Button>
                  : <p className="text-sm text-muted-foreground">Telefone não informado</p>}

                  {whatsapp ?
                    <Button asChild variant="outline" className="min-h-11 justify-start">
                      <a href={toWhatsAppUrl(whatsapp)} target="_blank" rel="noreferrer">
                        <MessageCircle aria-hidden="true" /> WhatsApp
                      </a>
                    </Button>
                  : <p className="text-sm text-muted-foreground">WhatsApp não informado</p>}
                </div>

                <div className="flex flex-wrap gap-2 border-t border-border pt-5">
                  {mapsUrl ?
                    <Button asChild className="min-h-11 gap-2">
                      <a href={mapsUrl} target="_blank" rel="noreferrer">
                        <Navigation aria-hidden="true" /> Como chegar <ExternalLink aria-hidden="true" />
                      </a>
                    </Button>
                  : <Button type="button" className="min-h-11 gap-2" disabled>
                      <Navigation aria-hidden="true" /> Endereço não informado
                    </Button>
                  }
                  <Button asChild variant="outline" className="min-h-11">
                    <Link href="/agendar">Agendar</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Clock3 className="size-5 text-primary" aria-hidden="true" /> Horários da semana
                  </CardTitle>
                  <CardDescription className="mt-2">Confira quando a unidade está aberta.</CardDescription>
                </div>
                {clock && (
                  <Badge variant={openNow ? 'default' : 'secondary'} className="min-h-7 shrink-0 gap-1.5 px-2.5">
                    <span className={`size-2 rounded-full ${openNow ? 'bg-current' : 'bg-muted-foreground'}`} aria-hidden="true" />
                    {openNow ? 'Aberto agora' : 'Fechado agora'}
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border">
                  {weekDays.map((day) => {
                    const isToday = clock?.weekday === day.weekday;
                    return (
                      <li
                        key={day.weekday}
                        aria-current={isToday ? 'date' : undefined}
                        className={`flex flex-wrap items-center justify-between gap-2 py-3 text-sm ${isToday ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}
                      >
                        <span className="flex items-center gap-2">
                          {day.label}
                          {isToday && (
                            <Badge variant="outline" className="text-[10px]">
                              Hoje
                            </Badge>
                          )}
                        </span>
                        <span className="text-right">{getHoursForDay(unit, day.weekday, clock?.date ?? '', isToday)}</span>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Comodidades</CardTitle>
              <CardDescription>O que você encontra durante a visita.</CardDescription>
            </CardHeader>
            <CardContent>
              {unit.amenities?.length ?
                <div className="flex flex-wrap gap-2">
                  {unit.amenities.map((amenity) => (
                    <Badge key={amenity} variant="secondary" className="min-h-8 px-3">
                      {amenity}
                    </Badge>
                  ))}
                </div>
              : <p className="text-sm text-muted-foreground">Comodidades não informadas.</p>}
            </CardContent>
          </Card>
        </>
      }
    </div>
  );
}
