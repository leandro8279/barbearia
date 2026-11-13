import { usePublicUnit } from '@/modules/site/hooks/use-public-unit';

import { ErrorState } from '@/shared/components/error-state';
import { RenderComponent } from '@/shared/components/render-component';
import { formatDate, formatRanges, getUpcomingHolidays, toWhatsAppUrl } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';

import { ArrowUpRight, Clock3, MapPin, MessageCircle } from 'lucide-react';
import { observer } from 'mobx-react-lite';

const weekdays = [
  { value: 1, label: 'Segunda-feira', shortLabel: 'Seg' },
  { value: 2, label: 'Terça-feira', shortLabel: 'Ter' },
  { value: 3, label: 'Quarta-feira', shortLabel: 'Qua' },
  { value: 4, label: 'Quinta-feira', shortLabel: 'Qui' },
  { value: 5, label: 'Sexta-feira', shortLabel: 'Sex' },
  { value: 6, label: 'Sábado', shortLabel: 'Sáb' },
  { value: 0, label: 'Domingo', shortLabel: 'Dom' },
];

export const ContactAndHours = observer(() => {
  const { unit, result } = usePublicUnit();

  const address = unit?.address?.trim();
  const whatsapp = unit?.whatsapp?.trim() || unit?.phone?.trim();
  const mapUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${unit?.name ?? ''} ${address}`.trim())}` : null;
  const upcomingHolidays = getUpcomingHolidays(unit?.holidays);

  return (
    <section id="visite" className="scroll-mt-24 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      <Card className="overflow-hidden border-border/80 bg-card">
        <CardContent className="p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Sua próxima visita</p>
          <h2 className="mt-2 text-3xl font-semibold">Estamos por aqui.</h2>
          <p className="mt-2 max-w-xl text-muted-foreground">Passe para renovar o visual ou fale com a gente para tirar suas dúvidas.</p>

          <RenderComponent condition={result.isPending}>
            <div className="mt-7 space-y-3" aria-label="Carregando endereço">
              <Skeleton className="h-6 w-4/5" />
              <Skeleton className="h-11 w-40" />
            </div>
          </RenderComponent>
          <RenderComponent condition={result.isError}>
            <div className="mt-7">
              <ErrorState description="Não foi possível carregar o endereço." onRetry={() => result.refetch()} />
            </div>
          </RenderComponent>
          <RenderComponent condition={result.isSuccess}>
            <div className="mt-7 flex items-start gap-3">
              <MapPin className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <address className="not-italic leading-6">{address || 'Endereço não informado'}</address>
            </div>
            <RenderComponent condition={mapUrl}>
              <Button asChild variant="outline" className="mt-4 min-h-11 gap-2">
                <a href={mapUrl || ''} target="_blank" rel="noreferrer">
                  Como chegar <ArrowUpRight className="size-4" aria-hidden="true" />
                </a>
              </Button>
            </RenderComponent>
          </RenderComponent>

          <RenderComponent condition={whatsapp}>
            <div className="mt-6 border-t border-border pt-5">
              <Button asChild className="min-h-11 gap-2">
                <a href={toWhatsAppUrl(whatsapp)} target="_blank" rel="noreferrer">
                  <MessageCircle className="size-4" aria-hidden="true" /> Falar pelo WhatsApp
                </a>
              </Button>
            </div>
          </RenderComponent>
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

          <RenderComponent condition={result.isPending}>
            <div className="mt-6 space-y-3" aria-label="Carregando horários">
              {weekdays.slice(0, 5).map((day) => (
                <Skeleton key={day.value} className="h-5 w-full" />
              ))}
            </div>
          </RenderComponent>

          <RenderComponent condition={result.isError}>
            <p className="mt-6 text-sm text-muted-foreground">Horários indisponíveis no momento.</p>
          </RenderComponent>

          <RenderComponent condition={result.isSuccess}>
            <RenderComponent condition={unit?.businessHours?.length}>
              <ul className="mt-6 divide-y divide-border">
                {weekdays.map((day) => {
                  const hours = unit?.businessHours?.find((item) => Number(item.weekday) === day.value)?.ranges;
                  return (
                    <li key={day.value} className="flex items-center justify-between gap-4 py-3 text-sm">
                      <span className="text-muted-foreground">{day.label}</span>
                      <span className="text-right font-medium">{formatRanges(hours)}</span>
                    </li>
                  );
                })}
              </ul>
            </RenderComponent>

            <RenderComponent condition={unit?.businessHours?.length === 0}>
              <p className="mt-6 text-sm text-muted-foreground">Horários não informados.</p>
            </RenderComponent>
          </RenderComponent>

          <RenderComponent condition={upcomingHolidays.length > 0}>
            <section aria-labelledby="special-hours-heading" className="mt-6 border-t border-border pt-5">
              <h3 id="special-hours-heading" className="text-base font-semibold">
                Feriados e datas especiais
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">Confira as exceções aos horários semanais.</p>
              <ul className="mt-3 space-y-2">
                {upcomingHolidays.map((holiday) => {
                  const isClosed = holiday.closed || !holiday.ranges?.length;
                  return (
                    <li
                      key={holiday.date}
                      className="flex flex-col gap-1 rounded-lg bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                    >
                      <div className="min-w-0">
                        <time dateTime={holiday.date} className="text-sm text-muted-foreground">
                          {formatDate(holiday.date, "EEEE, dd 'de' MMMM 'de' yyyy")}
                        </time>
                        <p className="wrap-break-word font-medium">{holiday.name}</p>
                      </div>
                      <Badge variant={isClosed ? 'destructive' : 'secondary'} className="min-h-7 w-fit shrink-0 px-2.5">
                        {isClosed ? 'Fechado' : formatRanges(holiday.ranges)}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            </section>
          </RenderComponent>
        </CardContent>
      </Card>
    </section>
  );
});
