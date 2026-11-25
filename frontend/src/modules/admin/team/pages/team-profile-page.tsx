import {useEffect, useState} from 'react'
import {Link, useLocation, useRoute} from 'wouter'
import {ArrowLeft, CalendarDays} from 'lucide-react'
import {TeamProfileForm} from '@/modules/admin/team/components/team-profile-form'
import {useSaveTeamProfile, useTeamProfile, useTeamServiceCatalog} from '@/modules/admin/team/hooks/use-team-management'
import type {TeamProfileInput} from '@/modules/admin/team/api/team-management'
import {ErrorState} from '@/shared/components/error-state'
import {PageHeader} from '@/shared/components/page-header'
import {Button} from '@/shared/ui/button'
import {Skeleton} from '@/shared/ui/skeleton'

export default function TeamProfilePage() {
  const [, params] = useRoute('/admin/equipe/:id')
  const [, setLocation] = useLocation()
  const routeId = params?.id ?? ''
  const isCreating = routeId === 'novo'
  const profileId = isCreating ? null : routeId || null
  const profileQuery = useTeamProfile(profileId)
  const servicesQuery = useTeamServiceCatalog()
  const saveMutation = useSaveTeamProfile()
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [inviteSent, setInviteSent] = useState(false)

  useEffect(() => {
    document.title = `${isCreating ? 'Novo profissional' : 'Profissional'} | Painel administrativo`
  }, [isCreating])

  async function save(input: TeamProfileInput) {
    const result = await saveMutation.mutateAsync({id: profileId, input})
    setInviteSent(result.inviteSent)
    if (result.inviteToken) {
      setInviteUrl(`${window.location.origin}/redefinir-senha/${encodeURIComponent(result.inviteToken)}`)
    }
    if (isCreating) setLocation(`/admin/equipe/${result.barber.id}`)
  }

  const services = servicesQuery.data ?? []
  const profile = profileQuery.data

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Equipe"
        title={isCreating ? 'Novo profissional' : (profile?.user.name ?? 'Profissional')}
        description={isCreating ? 'Cadastre o perfil, serviços e acesso à equipe.' : 'Atualize os dados, serviços, comissão e acesso deste profissional.'}
        actions={
          <div className="flex flex-col gap-2 sm:flex-row">
            {!isCreating && (
              <Button asChild variant="outline" className="min-h-11">
                <Link href={`/admin/equipe/${routeId}/escala`}>
                  <CalendarDays className="size-4" aria-hidden="true" /> Escala semanal
                </Link>
              </Button>
            )}
            <Button asChild variant="ghost" className="min-h-11">
              <Link href="/admin/equipe">
                <ArrowLeft className="size-4" aria-hidden="true" /> Voltar à equipe
              </Link>
            </Button>
          </div>
        }
      />

      {!isCreating && profileQuery.isPending ?
        <div className="space-y-4" aria-label="Carregando perfil do profissional">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      : !isCreating && (profileQuery.isError || !profile) ?
        <ErrorState title="Não foi possível carregar o profissional" description="Confira o endereço e tente novamente." onRetry={() => void profileQuery.refetch()} />
      : servicesQuery.isPending ?
        <div className="space-y-4" aria-label="Carregando serviços">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      : servicesQuery.isError ?
        <ErrorState title="Não foi possível carregar os serviços" onRetry={() => void servicesQuery.refetch()} />
      : <TeamProfileForm
          key={profile?.barber.id ?? 'novo'}
          profile={profile ?? null}
          serviceCatalog={profile?.services ?? services}
          isCreating={isCreating}
          isPending={saveMutation.isPending}
          inviteUrl={inviteUrl}
          inviteSent={inviteSent}
          onSave={save}
        />
      }
    </div>
  )
}
