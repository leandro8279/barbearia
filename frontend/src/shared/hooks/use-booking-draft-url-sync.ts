import { useEffect, useRef, useState } from 'react';

import { BookingStep, useBookingDraftStore } from '@/shared/stores/booking-draft-store';

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
  const step = useBookingDraftStore((state) => state.step);
  const setStep = useBookingDraftStore((state) => state.setStep);
  const [ready, setReady] = useState(false);
  const lastLocation = useRef(location);
  const lastStep = useRef(step);

  useEffect(() => {
    if (!ready) {
      const stepFromUrl = pathSteps[location];
      if (stepFromUrl) {
        setStep(stepFromUrl);
        lastStep.current = stepFromUrl;
      }
      lastLocation.current = location;
      setReady(true);
      return;
    }

    if (location !== lastLocation.current) {
      const stepFromUrl = pathSteps[location];
      lastLocation.current = location;
      if (stepFromUrl && stepFromUrl !== step) {
        setStep(stepFromUrl);
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
  }, [location, navigate, ready, setStep, step]);
}
