import { useEffect } from 'react';

import { useBookingDraftStore } from '@/shared/stores/booking-draft-store';

import { useLocalObservable } from 'mobx-react-lite';
import { useLocation } from 'wouter';

import { usePublicServiceCatalog } from '../../hooks/use-public-service-catalog';

const categories = ['Cabelo', 'Barba', 'Corte + Barba', 'Estética', 'Infantil'] as const;
type DisplayCategory = (typeof categories)[number];

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getDisplayCategory(serviceName: string, categorySlug: string): DisplayCategory {
  const name = normalize(serviceName);
  const slug = normalize(categorySlug);

  if (slug.includes('infantil') || name.includes('infantil') || name.includes('crianca')) return 'Infantil';
  if (name.includes('corte + barba') || name.includes('corte e barba') || (slug.includes('combo') && name.includes('barba'))) return 'Corte + Barba';
  if (slug.includes('barba') || name.includes('barba')) return 'Barba';
  if (slug.includes('cuidado') || slug.includes('estetica') || name.includes('sobrancelha')) return 'Estética';
  return 'Cabelo';
}

export const useServicesPage = () => {
  const [, navigate] = useLocation();
  const catalogQuery = usePublicServiceCatalog();
  const bookingDraftStore = useBookingDraftStore();

  const store = useLocalObservable(() => ({
    search: '',
    activeCategory: 'Cabelo' as DisplayCategory,
    setSearch: (value: string) => (store.search = value),
    setActiveCategory: (value: DisplayCategory) => (store.activeCategory = value),
    get categoryNames() {
      return new Map(catalogQuery.categories.map((category) => [category.id, category.slug || category.name]) ?? []);
    },
    get counts() {
      const result = new Map<DisplayCategory, number>(categories.map((category) => [category, 0]));

      for (const service of catalogQuery.services) {
        const displayCategory = getDisplayCategory(service.name, this.categoryNames.get(service.categoryId) ?? '');
        result.set(displayCategory, (result.get(displayCategory) ?? 0) + 1);
      }
      return result;
    },

    get displayServices() {
      const query = normalize(this.search.trim());

      return catalogQuery.services.filter((service) => {
        const displayCategory = getDisplayCategory(service.name, this.categoryNames.get(service.categoryId) ?? '');
        if (displayCategory !== this.activeCategory) return false;
        return !query || normalize(`${service.name} ${service.description}`).includes(query);
      });
    },
  }));

  useEffect(() => {
    document.title = 'Serviços | Barbearia';
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) {
      description = document.createElement('meta');
      description.name = 'description';
      document.head.append(description);
    }
    description.content = 'Conheça os serviços, durações e valores da Barbearia.';
  }, []);

  function startBooking(serviceId: number) {
    bookingDraftStore.setServiceIds([String(serviceId)]);
    bookingDraftStore.setStep('services');
    navigate(`/agendar?serviceId=${serviceId}`);
  }

  return { store, startBooking };
};
