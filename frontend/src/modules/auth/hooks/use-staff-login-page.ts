import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import { staffLoginSchema, StaffLoginValues } from '@/modules/auth/schemas/staff-login.schema';
import { StaffLoginPageStore } from '@/modules/auth/stores/staff-login-page.store';

import { useLocation } from 'wouter';

export function useStaffLoginPage() {
  const [, navigate] = useLocation();
  const form = useForm<StaffLoginValues>({ resolver: zodResolver(staffLoginSchema), defaultValues: { email: '', password: '', rememberOnDevice: false } });
  const [store] = useState(() => new StaffLoginPageStore({ navigate, form }));

  return store;
}
