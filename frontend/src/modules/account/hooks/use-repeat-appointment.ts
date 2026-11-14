import { useState } from 'react';

class RepeatAppointmentStore {}

export const useRepeatAppointment = () => {
  const [store] = useState(() => new RepeatAppointmentStore());

  return store;
};
