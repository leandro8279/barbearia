/* eslint-disable react-hooks/purity */
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { ColumnDef } from '@tanstack/react-table';

import { DataTable } from '@/shared/components/data-table';
import { DurationInput } from '@/shared/components/duration-input';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/shared/components/form-field';
import { MoneyInput } from '@/shared/components/money-input';
import { PageHeader } from '@/shared/components/page-header';
import { PhoneInput } from '@/shared/components/phone-input';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { useMediaQuery } from '@/shared/hooks/use-media-query';
import { useOverlay } from '@/shared/hooks/use-overlay';
import { useBookingDraftStore } from '@/shared/stores/booking-draft-store';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

import { BarberCard } from '../components/barber-card';
import { CalendarGrid } from '../components/calendar-grid';
import { CalendarPicker } from '../components/calendar-picker';
import { ConfirmDialog } from '../components/confirm-dialog';
import { Countdown } from '../components/countdown';
import { PriceTag } from '../components/price-tag';
import { Reveal } from '../components/reveal';
import { ServiceCard } from '../components/service-card';
import { SlotGrid } from '../components/slot-grid';
import { StatusBadge } from '../components/status-badge';
import { Stepper } from '../components/stepper';
import { Input } from '../ui/input';

interface DemoBooking {
  id: string;
  client: string;
  service: string;
  date: string;
}

const demoSlots = [
  { time: '09:00', available: true },
  { time: '09:30', available: false },
  { time: '10:00', available: true },
  { time: '10:30', available: true },
  { time: '14:00', available: true },
  { time: '15:30', available: true },
  { time: '19:00', available: false },
];

const bookingColumns: ColumnDef<DemoBooking>[] = [
  { accessorKey: 'client', header: 'Cliente', enableSorting: true },
  { accessorKey: 'service', header: 'Serviço', enableSorting: true },
  { accessorKey: 'date', header: 'Data', enableSorting: true },
];

const demoBookings: DemoBooking[] = [
  { id: 'ag-1001', client: 'Ana Souza', service: 'Corte', date: '09/11/2026' },
  { id: 'ag-1002', client: 'Bruno Lima', service: 'Barba', date: '09/11/2026' },
  { id: 'ag-1003', client: 'Caio Mendes', service: 'Corte e barba', date: '10/11/2026' },
];

export default function UiGalleryPage() {
  const [price, setPrice] = useState(6500);
  const [duration, setDuration] = useState(30);
  const [phone, setPhone] = useState('11987654321');
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>('10:00');
  const [slotSearch, setSlotSearch] = useState('');
  const debouncedSearch = useDebounce(slotSearch, 250);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const confirmOverlay = useOverlay('ui-confirm', '1');
  const bookingStep = useBookingDraftStore((state) => state.step);
  const form = useForm<{ nome: string }>({ defaultValues: { nome: '' } });
  const countdownExpiry = useMemo(() => Date.now() + 5 * 60_000, []);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Componentes compartilhados | Barbearia';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="Galeria de desenvolvimento"
        title="Componentes compartilhados"
        description="Exemplos interativos da biblioteca visual da Barbearia. Esta página existe apenas no ambiente de desenvolvimento."
        actions={
          <Button type="button" variant="outline" className="min-h-11" onClick={() => confirmOverlay.open()}>
            Abrir confirmação
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Estados de conteúdo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <EmptyState title="Nenhum agendamento" description="Os próximos horários aparecerão aqui." />
          <ErrorState title="Exemplo de erro" description="Use uma mensagem clara e permita tentar novamente." onRetry={() => undefined} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tabela com controle no servidor</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={bookingColumns} data={demoBookings} rowCount={demoBookings.length} enableRowSelection getRowId={(row) => row.id} searchPlaceholder="Buscar agendamentos..." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Campos de formulário</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-2">
            <span className="text-sm font-medium">Preço em centavos</span>
            <MoneyInput value={price} onValueChange={setPrice} />
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-medium">Duração em minutos, intervalos de 5</span>
            <DurationInput value={duration} onValueChange={setDuration} />
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-medium">Telefone brasileiro</span>
            <PhoneInput value={phone} onValueChange={setPhone} />
          </div>
          <div className="grid gap-2">
            <Form {...form}>
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} className="min-h-11" />
                    </FormControl>
                    <FormDescription>Campo acessível com validação do formulário.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Form>
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-medium">Data com dias indisponíveis</span>
            <CalendarPicker value={selectedDate} onValueChange={setSelectedDate} disabledDays={{ before: new Date() }} />
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-medium">Busca com debounce</span>
            <Input className="min-h-11" value={slotSearch} onChange={(event) => setSlotSearch(event.target.value)} placeholder="Digite para testar" />
            <p className="text-sm text-muted-foreground">Valor aplicado: {debouncedSearch || '—'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Serviços, equipe e preços</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <ServiceCard name="Corte clássico" description="Corte personalizado com acabamento." durationMinutes={duration} priceCents={price} selected />
          <BarberCard name="Rafael Oliveira" photoUrl="" specialties={['Corte', 'Barba']} nextAvailable="Hoje, 15:30" selected />
          <div className="flex min-h-36 items-center justify-center rounded-xl border border-border p-5">
            <PriceTag cents={price} label="A partir de" className="text-xl" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agendamento e status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Stepper
            currentStep={['services', 'barber', 'slot', 'details', 'review'].indexOf(bookingStep)}
            steps={[{ label: 'Serviço' }, { label: 'Profissional' }, { label: 'Horário' }, { label: 'Dados' }, { label: 'Revisão' }]}
          />
          <SlotGrid slots={demoSlots} selectedTime={selectedTime} onSelect={setSelectedTime} />
          <div className="flex flex-wrap gap-2">
            <StatusBadge kind="appointment" status="confirmado" />
            <StatusBadge kind="appointment" status="em_atendimento" />
            <StatusBadge kind="tab" status="paga" />
            <StatusBadge kind="tab" status="parcial" />
            <span className="rounded-md border border-border px-3 py-2 text-sm">
              <Countdown expiresAt={countdownExpiry} />
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agenda por profissional</CardTitle>
        </CardHeader>
        <CardContent>
          <CalendarGrid
            date={selectedDate ?? new Date()}
            barbers={[
              { id: 'barber-1', name: 'Rafael' },
              { id: 'barber-2', name: 'Lucas' },
            ]}
            appointments={[{ id: 'demo-1', barberId: 'barber-1', startsAt: new Date().toISOString(), durationMinutes: 30, customerName: 'Marina Costa', serviceName: 'Corte', status: 'confirmado' }]}
            view="day"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revelação ao entrar na tela</CardTitle>
        </CardHeader>
        <CardContent>
          <Reveal className="rounded-lg border border-border p-4">
            <p className="font-medium">Este conteúdo aparece quando entra na área visível.</p>
            <p className="mt-1 text-sm text-muted-foreground">O layout se ajusta a telas menores; modo desktop: {isDesktop ? 'sim' : 'não'}.</p>
          </Reveal>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOverlay.isOpen}
        onOpenChange={confirmOverlay.setOpen}
        title="Confirmar ação"
        description="Este exemplo demonstra a confirmação de uma ação importante."
        confirmLabel="Entendi"
        onConfirm={confirmOverlay.close}
      />
    </main>
  );
}
