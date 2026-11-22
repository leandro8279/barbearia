import type { Permission } from '@/shared/auth/permissions';

import type { StaffRole } from '@/modules/users';

export interface UpdateTeamMemberDTO {
  id: string;
  role?: StaffRole;
  active?: boolean;
  permissions?: Permission[];
  actorId: string;
}
