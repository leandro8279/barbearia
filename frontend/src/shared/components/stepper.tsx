import { cn } from '@/shared/lib/utils';

import { Check } from 'lucide-react';

import { RenderComponent } from './render-component';

export interface StepperStep {
  label: string;
  description?: string;
}

export interface StepperProps {
  steps: StepperStep[];
  currentStep: number;
  className?: string;
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <nav aria-label="Etapas" className={className}>
      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => {
          const complete = index < currentStep;
          const current = index === currentStep;
          return (
            <li key={`${step.label}-${index}`} className="min-w-0">
              <div
                aria-current={current ? 'step' : undefined}
                className={cn(
                  'flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2',
                  current ? 'border-primary bg-accent text-foreground'
                  : complete ? 'border-primary/40 text-foreground'
                  : 'border-border text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                    complete || current ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}
                >
                  <RenderComponent condition={complete}>
                    <Check className="size-4" aria-label="Concluída" />
                  </RenderComponent>

                  <RenderComponent condition={!complete}>{index + 1}</RenderComponent>
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{step.label}</span>
                  <RenderComponent condition={step.description}>
                    <span className="block text-xs text-muted-foreground">{step.description}</span>
                  </RenderComponent>
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
