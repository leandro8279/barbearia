import { useSearch } from 'wouter';
import { useAccountAppointment } from '@/modules/account/hooks/use-account-data';
import type { CustomerAppointmentDetail } from '@/modules/account/api/appointments';
import { useOverlay } from '@/shared/hooks/use-overlay';
import { CancelAppointmentDialog } from '@/modules/account/components/cancel-appointment-dialog';
import { RescheduleAppointmentDialog } from '@/modules/account/components/reschedule-appointment-dialog';

interface AppointmentActionOverlaysProps {
  appointment?: CustomerAppointmentDetail;
}

export function AppointmentActionOverlays({ appointment }: AppointmentActionOverlaysProps) {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const appointmentId = appointment ? String(appointment.id) : (params.get('appointmentId') ?? '');
  const appointmentQuery = useAccountAppointment(appointmentId, !appointment);
  const record = appointment ?? appointmentQuery.data;
  const loadingAppointment = Boolean(!record && appointmentId && appointmentQuery.isFetching);
  const appointmentError =
    !record && !appointmentId ? 'Não há um agendamento selecionado. Abra esta ação a partir de um agendamento da sua conta.'
    : appointmentQuery.isError ? 'Não foi possível carregar este agendamento.'
    : null;
  const rescheduleOverlay = useOverlay('reagendar');
  const cancelOverlay = useOverlay('cancelar');

  return (
    <>
      <RescheduleAppointmentDialog
        open={rescheduleOverlay.isOpen}
        onOpenChange={rescheduleOverlay.setOpen}
        appointment={record}
        loadingAppointment={loadingAppointment}
        appointmentError={appointmentError}
        onRetryAppointment={() => void appointmentQuery.refetch()}
      />
      <CancelAppointmentDialog
        open={cancelOverlay.isOpen}
        onOpenChange={cancelOverlay.setOpen}
        appointment={record}
        loadingAppointment={loadingAppointment}
        appointmentError={appointmentError}
        onRetryAppointment={() => void appointmentQuery.refetch()}
      />
    </>
  );
}
