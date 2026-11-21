import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../entities/user.entity';

export const ROLES_KEY = 'roles';
export const ALLOW_PENDING_KEY = 'allowPending';

/** Limit a route to some roles, e.g. @Roles('owner', 'manager'). No decorator = every role. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/** Let a restaurant that is still waiting for approval use this route (e.g. /auth/me). */
export const AllowPending = () => SetMetadata(ALLOW_PENDING_KEY, true);