import { Button } from '@/shared/ui/button'

import { Link } from 'wouter'

import { usePageMeta } from '../hooks/use-page-meta'

export function NotFoundPage() {
  usePageMeta('Página não encontrada', 'A página solicitada não foi encontrada.')
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
      <p className="font-heading text-7xl font-semibold text-primary">404</p>
      <h1 className="mt-3 text-3xl">Página não encontrada</h1>
      <p className="mt-3 text-muted-foreground">Confira o endereço ou volte para a página inicial.</p>
      <Button asChild className="mt-7 min-h-11">
        <Link href="/">Voltar ao início</Link>
      </Button>
    </main>
  )
}
