import { useState } from 'react';

import { login, LoginInput, LoginResponse } from '@/modules/auth/api/auth';

import { MobxMutation } from '@/shared/lib/mutation';
import { sessionStore } from '@/shared/stores/session-store';

export const useLoginMutation = () => {
  const [store] = useState(
    () =>
      new MobxMutation<LoginResponse, Error, LoginInput>({
        mutationFn: (variables) => login(variables),
        onSuccess: (data) => sessionStore.setSession(data.user, data.token),
      }),
  );

  return store;
};
