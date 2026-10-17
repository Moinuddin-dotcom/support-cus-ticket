import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { AuthUser } from '../types/auth-user';
import { RolesGuard } from './roles.guard';

function contextFor(user: AuthUser | undefined): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

const userWith = (role: Role): AuthUser => ({ id: 'u1', email: 'u@x.io', name: 'U', role });

describe('RolesGuard', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  afterEach(() => jest.restoreAllMocks());

  const requireRoles = (roles: Role[] | undefined) =>
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);

  it('allows any authenticated user when no roles are required', () => {
    requireRoles(undefined);
    expect(guard.canActivate(contextFor(userWith(Role.CUSTOMER)))).toBe(true);
  });

  it('allows a user whose role is listed', () => {
    requireRoles([Role.AGENT, Role.ADMIN]);
    expect(guard.canActivate(contextFor(userWith(Role.AGENT)))).toBe(true);
    expect(guard.canActivate(contextFor(userWith(Role.ADMIN)))).toBe(true);
  });

  it.each([
    [[Role.ADMIN], Role.CUSTOMER],
    [[Role.ADMIN], Role.AGENT],
    [[Role.AGENT, Role.ADMIN], Role.CUSTOMER],
    [[Role.CUSTOMER], Role.AGENT],
  ])('rejects when %j is required and the user is %s', (roles, role) => {
    requireRoles(roles);
    expect(() => guard.canActivate(contextFor(userWith(role)))).toThrow(ForbiddenException);
  });

  it('rejects when there is no user on the request', () => {
    requireRoles([Role.ADMIN]);
    expect(() => guard.canActivate(contextFor(undefined))).toThrow(ForbiddenException);
  });
});
