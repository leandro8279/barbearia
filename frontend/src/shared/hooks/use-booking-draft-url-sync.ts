import { useEffect, useRef, useState } from 'react';

import { BookingStep, useBookingDraftStore } from '@/shared/stores/booking-draft-store';

import { reaction } from 'mobx';
import { useLocation } from 'wouter';

const stepPaths: Record<BookingStep, string> = {
  services: '/agendar',
  barber: '/agendar/profissional',
  slot: '/agendar/horario',
  details: '/agendar/dados',
  review: '/agendar/revisao',
};

const pathSteps = Object.fromEntries(Object.entries(stepPaths).map(([step, path]) => [path, step as BookingStep])) as Record<string, BookingStep>;

export function useBookingDraftUrlSync(): void {
  const [location, navigate] = useLocation();
  const lastLocation = useRef(location);
  const [ready, setReady] = useState(false);
  const bookingDraftStore = useBookingDraftStore();
  const lastStep = useRef(bookingDraftStore.step);

  useEffect(() => {
    if (!ready) {
      const stepFromUrl = pathSteps[location];
      if (stepFromUrl) {
        bookingDraftStore.setStep(stepFromUrl);
        lastStep.current = stepFromUrl;
      }
      lastLocation.current = location;
      setReady(true);
      return;
    }

    const dispose = reaction(
      () => bookingDraftStore.step,
      (step) => {
        if (location !== lastLocation.current) {
          const stepFromUrl = pathSteps[location];
          lastLocation.current = location;
          if (stepFromUrl && stepFromUrl !== step) {
            bookingDraftStore.setStep(stepFromUrl);
            lastStep.current = stepFromUrl;
          }
          return;
        }

        if (step !== lastStep.current) {
          const nextLocation = stepPaths[step];
          lastStep.current = step;
          lastLocation.current = nextLocation;
          navigate(nextLocation, { replace: true });
        }
      },
    );

    return () => dispose();
  }, [location, navigate, ready, bookingDraftStore]);
}
