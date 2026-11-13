import { useEffect } from 'react'

import { Permission, UserRole } from '@/shared/types/domain'
import { Button } from '@/shared/ui/button'

import { ArrowRight, Construction } from 'lucide-react'
import { Link } from 'wouter'

export interface RouteMeta {
  id: string
  title: string
  description: string
  url: string
  access: string
  layout: 'site' | 'booking' | 'auth' | 'account' | 'admin' | 'bare'
  matchPath: string
  query?: { key: string; value?: string }
  permission?: Permission
  roles?: UserRole[]
}

interface RoutePlaceholderProps {
  route: RouteMeta
}

export default function RoutePlaceholder({ route }: RoutePlaceholderProps) {
  useEffect(() => {
    document.title = `${route.title} | Barbearia`
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!description) {
      description = document.createElement('meta')
      description.name = 'description'
      document.head.append(description)
    }
    description.content = route.description
  }, [route.description, route.title])

  if (route.id === 'S01') {
    return (
      <section className="relative isolate overflow-hidden rounded-3xl border border-border bg-card px-6 py-12 shadow-panel sm:px-10 sm:py-16 lg:px-16">
        <div className="absolute -right-20 -top-24 -z-10 size-80 rounded-full bg-primary/10 blur-3xl" />
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-primary">Barbearia • desde 2012</p>
        <h1 className="max-w-3xl text-5xl font-semibold uppercase leading-[0.98] sm:text-7xl">Seu próximo corte começa aqui.</h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
          Um espaço para desacelerar, cuidar do visual e sair se sentindo bem. Estamos preparando a nova experiência de agendamento online.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg" className="min-h-12 gap-2 px-6 shadow-gold">
            <Link href="/agendar">
              Agendar horário <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="min-h-12">
            <Link href="/servicos">Conheça os serviços</Link>
          </Button>
        </div>
        <div className="mt-12 grid gap-3 border-t border-border pt-6 text-sm text-muted-foreground sm:grid-cols-3">
          <p>Atendimento com hora marcada</p>
          <p>Profissionais experientes</p>
          <p>Pagamento presencial</p>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-panel sm:p-10">
      <div className="mb-6 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Construction aria-hidden="true" className="size-6" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{route.id} · Fundação</p>
      <h1 className="mt-3 text-3xl font-semibold">{route.title}</h1>
      <p className="mt-3 leading-7 text-muted-foreground">{route.description}</p>
      <div className="mt-7 rounded-xl border border-border bg-background/70 p-4 text-sm">
        <p>
          <span className="text-muted-foreground">Rota:</span> <code className="break-all text-foreground">{route.url}</code>
        </p>
        <p className="mt-2">
          <span className="text-muted-foreground">Acesso:</span> {route.access}
        </p>
      </div>
      <Button asChild variant="outline" className="mt-7 min-h-11 gap-2">
        <Link href="/">
          Voltar ao início <ArrowRight className="size-4" />
        </Link>
      </Button>
    </section>
  )
}
