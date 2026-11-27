import { useState } from 'react';

import { AccountProfilePageStore } from '@/modules/account/stores/account-profile-page.store';

export function useAccountProfilePage() {
  const [store] = useState(() => new AccountProfilePageStore());

  return store;
}
