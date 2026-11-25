import type {ReactNode} from 'react'
import {Inbox} from 'lucide-react'
import {Button} from '@/shared/ui/button'

export interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({title, description, icon, actionLabel, onAction}: EmptyStateProps) {
  return (
    <section className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-6 text-center" aria-live="polite">
      <span className="mb-3 text-muted-foreground" aria-hidden="true">
        {icon ?? <Inbox className="size-8" />}
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>}
      {actionLabel && onAction && (
        <Button className="mt-4 min-h-11" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </section>
  )
}
