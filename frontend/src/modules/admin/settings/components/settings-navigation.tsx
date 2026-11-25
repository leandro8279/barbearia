import {Link} from 'wouter'
import {useCan} from '@/shared/hooks/use-can'

const links = [
  {href: '/admin/config', label: 'Dados do negócio', permission: 'settings.read'},
  {href: '/admin/config/horarios', label: 'Horários e feriados', permission: 'settings.write'},
  {href: '/admin/config/agendamento', label: 'Agendamento', permission: 'settings.write'},
  {href: '/admin/config/notificacoes', label: 'Notificações', permission: 'settings.write'}
] as const

export function SettingsNavigation({active}: {active: (typeof links)[number]['href']}) {
  const canRead = useCan('settings.read')
  const canWrite = useCan('settings.write')
  return (
    <nav aria-label="Configurações" className="flex flex-wrap gap-2 rounded-xl border border-border bg-card p-2">
      {links
        .filter(link => (link.permission === 'settings.read' ? canRead : canWrite))
        .map(link => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active === link.href ? 'page' : undefined}
            className={`flex min-h-11 items-center rounded-lg px-3 text-sm transition-colors ${active === link.href ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
            {link.label}
          </Link>
        ))}
    </nav>
  )
}
