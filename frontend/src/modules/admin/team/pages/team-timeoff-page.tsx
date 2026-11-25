import { useEffect } from 'react';
import { TeamTimeOffDialog } from '@/modules/admin/team/components/team-timeoff-dialog';
import { useTeamTimeOffBarbers } from '@/modules/admin/team/hooks/use-team-management';
import TeamPage from '@/modules/admin/team/pages/team-page';
import { useOverlay } from '@/shared/hooks/use-overlay';

export default function TeamTimeOffPage() {
  const timeOffOverlay = useOverlay('folga');
  const barbersQuery = useTeamTimeOffBarbers();

  useEffect(() => {
    document.title = 'Folgas e férias | Painel administrativo';
  }, []);

  return (
    <>
      <TeamPage />
      <TeamTimeOffDialog
        open={timeOffOverlay.isOpen}
        onOpenChange={(open) => timeOffOverlay.setOpen(open)}
        barbers={barbersQuery.data ?? []}
        barbersPending={barbersQuery.isPending}
        barbersError={barbersQuery.isError}
        onRetryBarbers={() => void barbersQuery.refetch()}
      />
    </>
  );
}
