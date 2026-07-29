import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SystemRole } from '../users/schemas/user.schema';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<SystemRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.role) {
      return false;
    }

    // SUPER_ADMIN implicitly has every ADMIN privilege — without this, adding
    // SUPER_ADMIN as a distinct role would 403 it out of every existing
    // @Roles(SystemRole.ADMIN) endpoint across the app (AdminController,
    // etc.), since those don't list SUPER_ADMIN explicitly. Endpoints that
    // require SUPER_ADMIN specifically (e.g. maintenance mode) are unaffected
    // by this — regular ADMIN still can't reach those.
    if (user.role === SystemRole.SUPER_ADMIN && requiredRoles.includes(SystemRole.ADMIN)) {
      return true;
    }

    return requiredRoles.includes(user.role);
  }
}