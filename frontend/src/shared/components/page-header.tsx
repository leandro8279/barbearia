import type { ReactNode } from 'react'
import { RenderComponent } from './render-component'

export interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  eyebrow?: string
}

export function PageHeader({ title, description, actions, eyebrow }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <RenderComponent condition={eyebrow}>
          <p className="mb-1 text-sm font-semibold text-primary">{eyebrow}</p>
        </RenderComponent>

        <h1 className="text-3xl font-semibold">{title}</h1>

        <RenderComponent condition={description}>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </RenderComponent>
      </div>
      <RenderComponent condition={actions}>
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      </RenderComponent>
    </header>
  )
}
