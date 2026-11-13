import { Component } from 'react'

import { setPageMetadata } from '@/shared/lib/page-meta'
import { Button } from '@/shared/ui/button'

import { Link } from 'wouter'

import type { ErrorInfo, ReactNode } from 'react'
interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  hasError: boolean
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erro não tratado na interface:', error, info.componentStack)
    setPageMetadata('Erro inesperado', 'Ocorreu um erro inesperado ao abrir esta tela.')
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-6 py-12 text-center" role="alert" aria-live="assertive">
        <p className="font-heading text-6xl font-semibold text-destructive">Ops</p>
        <h1 className="mt-3 text-3xl">Não foi possível abrir esta tela</h1>
        <p className="mt-3 text-muted-foreground">Ocorreu um erro inesperado. Tente novamente ou volte ao início.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button type="button" variant="outline" className="min-h-11" onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
          <Button asChild className="min-h-11">
            <Link href="/">Voltar ao início</Link>
          </Button>
        </div>
      </main>
    )
  }
}
