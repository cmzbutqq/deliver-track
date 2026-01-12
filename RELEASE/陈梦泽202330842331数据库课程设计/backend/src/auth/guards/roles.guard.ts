import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../roles.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true; // 如果没有角色要求，允许访问
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // 检查用户角色（这里简化处理，假设user.role存在）
    // 实际实现中，需要从数据库查询用户的角色
    const userRole = user.role || UserRole.MERCHANT; // 默认为商家

    return requiredRoles.includes(userRole) || userRole === UserRole.ADMIN;
  }
}

