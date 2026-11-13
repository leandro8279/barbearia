import { Button } from '@/shared/ui/button'

import { Link } from 'wouter'

import { usePageMeta } from '../hooks/use-page-meta'

export function ForbiddenPage() {
  usePageMeta('Acesso não permitido', 'Sua conta não tem permissão para abrir esta página.')
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
      <p className="font-heading text-7xl font-semibold text-primary">403</p>
      <h1 className="mt-3 text-3xl">Acesso não permitido</h1>
      <p className="mt-3 text-muted-foreground">Sua conta não tem permissão para abrir esta página.</p>
      <Button asChild className="mt-7 min-h-11">
        <Link href="/">Voltar ao início</Link>
      </Button>
    </main>
  )
}
