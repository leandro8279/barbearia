import { useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import { AgendaCustomer } from '@/modules/admin/agenda/api/agenda';
import {
  useAgendaAvailabilitySlots,
  useAgendaBarbers,
  useAgendaCustomerSuggestions,
  useAgendaEligibleBarbers,
  useAgendaServices,
  useCreateAgendaAppointment,
} from '@/modules/admin/agenda/hooks/use-agenda';
import { todayInBusinessTimeZone } from '@/modules/admin/agenda/lib/format';
import { createAppointmentSchema, CreateAppointmentValues } from '@/modules/admin/agenda/schemas/create-appointment.schema';

import { localTime } from '@/shared/lib/format';
import { BUSINESS_TIME_ZONE } from '@/shared/lib/time';
import { sessionStore } from '@/shared/stores/session-store';

import { useLocalObservable } from 'mobx-react-lite';
import { useLocation, useSearch } from 'wouter';

function dateTimeParts(value: string | null) {
  if (!value) return { date: '', time: '' };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: '', time: '' };
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  const time = new Intl.DateTimeFormat('pt-BR', { timeZone: BUSINESS_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
  return { date: parts, time };
}

const stepTitles = ['Cliente', 'Serviços', 'Horário', 'Revisão'];

export const useCreateAppointmentDrawer = (onOpenChange: (open: boolean) => void) => {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const prefillStart = params.get('start');
  const initialDateTime = dateTimeParts(prefillStart);
  const prefillBarberId = params.get('barberId') ?? '';

  const form = useForm<CreateAppointmentValues>({
    resolver: zodResolver(createAppointmentSchema),
    defaultValues: {
      start: '',
      notes: '',
      serviceIds: [],
      customerId: '',
      bypassAdvance: false,
      allowOutOfHours: false,
      expectedPaymentMethod: '',
      barberId: prefillBarberId,
      date: initialDateTime.date || todayInBusinessTimeZone(),
    },
  });

  const servicesQuery = useAgendaServices();
  const createMutation = useCreateAgendaAppointment();
  const serviceIds = useWatch({ control: form.control, name: 'serviceIds' });
  const barberProfiles = useAgendaBarbers(sessionStore.isBarber ? Number(sessionStore.user?.id) : undefined);
  const barberOptions = useAgendaEligibleBarbers(() => ({ serviceIds: serviceIds.map(Number) }));
  const availability = useAgendaAvailabilitySlots(() => ({ serviceIds: serviceIds.map(Number), barberId: barberId ? Number(barberId) : null, date, bypassAdvance, allowOutOfHours }));
  const customerSuggestions = useAgendaCustomerSuggestions(() => ({ searchTerm: store.searchTerm }));

  const date = useWatch({ control: form.control, name: 'date' });
  const serviceError = form.formState.errors.serviceIds?.message;
  const selectedStart = useWatch({ control: form.control, name: 'start' });
  const barberId = useWatch({ control: form.control, name: 'barberId' });
  const customerId = useWatch({ control: form.control, name: 'customerId' });
  const bypassAdvance = useWatch({ control: form.control, name: 'bypassAdvance' });
  const allowOutOfHours = useWatch({ control: form.control, name: 'allowOutOfHours' });
  const expectedPaymentMethod = useWatch({ control: form.control, name: 'expectedPaymentMethod' });
  const queryClientId = String(customerId || '');

  const store = useLocalObservable(() => ({
    step: 0,
    formError: '',
    searchTerm: '',
    discardOpen: false,
    quickCustomerName: '',
    quickCustomerPhone: '',
    quickCustomerError: '',
    selectedCustomer: null as null | AgendaCustomer,
    setStep: (value: number) => (store.step = value),
    setFormError: (value: string) => (store.formError = value),
    setSearchTerm: (value: string) => (store.searchTerm = value),
    setDiscardOpen: (value: boolean) => (store.discardOpen = value),
    setQuickCustomerName: (value: string) => (store.quickCustomerName = value),
    setQuickCustomerPhone: (value: string) => (store.quickCustomerPhone = value),
    setQuickCustomerError: (value: string) => (store.quickCustomerError = value),
    setSelectedCustomer: (value: null | AgendaCustomer) => (store.selectedCustomer = value),
    get slots() {
      return availability.data ?? [];
    },
    get eligibleBarbers() {
      return sessionStore.isBarber ? (barberOptions.data?.filter((barber) => barber.id === barberProfiles.barbers[0]?.id) ?? []) : (barberOptions.data ?? []);
    },
    get canManage() {
      return Boolean(
        sessionStore.user &&
        (sessionStore.user.role === 'admin' || sessionStore.user.role === 'manager' || sessionStore.user.role === 'reception' || sessionStore.user.permissions.includes('agenda.manage')),
      );
    },
    get timeSlots() {
      return this.slots.map((slot) => ({ time: localTime(slot.start), available: true }));
    },
    get selectedSlot() {
      return this.slots.find((slot) => slot.start === selectedStart);
    },
    get selectedBarber() {
      return this.eligibleBarbers.find((barber) => barber.id === Number(barberId));
    },
    get estimatedDuration() {
      return this.selectedSlot?.durationMin ?? this.selectedBarber?.durationMin;
    },
    get estimatedTotal() {
      return this.selectedSlot?.subtotal ?? this.selectedBarber?.subtotal;
    },
    get selectedServices() {
      return (servicesQuery.data ?? []).filter((service) => serviceIds.includes(String(service.id)));
    },
  }));

  function closeDrawer(nextOpen: boolean) {
    if (!nextOpen) {
      if (form.formState.isDirty || store.quickCustomerName.trim() || store.quickCustomerPhone.trim()) {
        store.setDiscardOpen(true);
        return;
      }
      onOpenChange(false);
      setLocation('/admin/agenda');
      return;
    }
    onOpenChange(true);
  }

  function chooseCustomer(customer: AgendaCustomer) {
    store.setSelectedCustomer(customer);
    store.setSearchTerm('');
    store.setQuickCustomerError('');
    form.setValue('customerId', String(customer.id), { shouldValidate: true, shouldDirty: true });
  }

  function selectService(serviceId: number) {
    const id = String(serviceId);
    const current = form.getValues('serviceIds');
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    if (next.length > 4) {
      store.setFormError('Selecione no máximo quatro serviços.');
      return;
    }
    store.setFormError('');
    form.setValue('serviceIds', next, { shouldValidate: true, shouldDirty: true });
    form.setValue('start', '', { shouldDirty: true });
    form.setValue('barberId', sessionStore.isBarber ? String(barberProfiles.barbers[0]?.id ?? '') : '', { shouldValidate: true, shouldDirty: true });
  }

  function selectBarber(value: string) {
    form.setValue('barberId', value, { shouldValidate: true, shouldDirty: true });
    form.setValue('start', '', { shouldDirty: true });
  }

  function selectDate(value: string) {
    form.setValue('date', value, { shouldValidate: true, shouldDirty: true });
    form.setValue('start', '', { shouldDirty: true });
  }

  async function submit(_values: CreateAppointmentValues) {
    // setFormError('');
    // try {
    //   await createMutation.mutateAsync({
    //     customerId: Number(values.customerId),
    //     serviceIds: values.serviceIds.map(Number),
    //     barberId: Number(values.barberId),
    //     start: values.start,
    //     notes: values.notes,
    //     expectedPaymentMethod: values.expectedPaymentMethod || null,
    //     bypassAdvance: values.bypassAdvance,
    //     allowOutOfHours: values.allowOutOfHours,
    //   });
    //   form.reset(values);
    //   onOpenChange(false);
    //   setLocation('/admin/agenda');
    // } catch (error) {
    //   setFormError(error instanceof Error ? error.message : 'Não foi possível criar o agendamento.');
    // }
  }

  async function registerQuickCustomer() {
    store.setQuickCustomerError('');
    const name = store.quickCustomerName.trim();
    const phone = store.quickCustomerPhone.replace(/\D/g, '');
    if (name.length < 2) return store.setQuickCustomerError('Informe o nome completo do cliente.');

    if (phone.length < 10) return store.setQuickCustomerError('Informe um telefone com DDD.');

    // try {
    //   const customer = await createQuickAgendaCustomer({ name, phone });
    //   chooseCustomer(customer);
    //   await queryClient.invalidateQueries({ queryKey: ['admin-agenda-customer-suggestions'] });
    //   toast.success('Cadastro rápido criado.');
    // } catch (error) {
    //   setQuickCustomerError(error instanceof Error ? error.message : 'Não foi possível cadastrar o cliente.');
    // }
  }

  async function continueStep() {
    store.setFormError('');
    const fields: Array<keyof CreateAppointmentValues> =
      store.step === 0 ? ['customerId']
      : store.step === 1 ? ['serviceIds']
      : store.step === 2 ? ['barberId', 'date', 'start']
      : [];
    const valid = fields.length ? await form.trigger(fields) : true;
    if (!valid) return;
    if (store.step < stepTitles.length - 1) store.setStep(store.step + 1);
  }

  return {
    store,
    form,
    date,
    submit,
    barberId,
    serviceIds,
    availability,
    serviceError,
    queryClientId,
    servicesQuery,
    bypassAdvance,
    barberOptions,
    prefillBarberId,
    allowOutOfHours,
    createMutation,
    customerSuggestions,
    expectedPaymentMethod,
    selectDate,
    closeDrawer,
    selectBarber,
    continueStep,
    selectService,
    chooseCustomer,
    registerQuickCustomer,
  };
};
