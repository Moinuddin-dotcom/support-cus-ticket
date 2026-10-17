import { Role } from '@prisma/client';

/** The authenticated principal attached to `request.user` by the JWT strategy. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface JwtPayload {
  sub: string;
  role: Role;
}
