import { SetMetadata } from '@nestjs/common';
import { SystemRole } from '../users/schemas/user.schema';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: SystemRole[]) => SetMetadata(ROLES_KEY, roles);