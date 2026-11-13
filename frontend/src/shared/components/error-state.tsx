import { Button } from '@/shared/ui/button'

import { AlertTriangle } from 'lucide-react'

import { RenderComponent } from './render-component'

export interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  retryLabel?: string
}

export function ErrorState({
  title = 'Não foi possível carregar',
  description = 'Ocorreu um erro ao carregar estas informações. Tente novamente.',
  onRetry,
  retryLabel = 'Tentar novamente'
}: ErrorStateProps) {
  return (
    <section className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center" role="alert">
      <AlertTriangle className="mb-3 size-8 text-destructive" aria-hidden="true" />
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>

      <RenderComponent condition={onRetry}>
        <Button variant="outline" className="mt-4 min-h-11" onClick={onRetry}>
          {retryLabel}
        </Button>
      </RenderComponent>
    </section>
  )
}
