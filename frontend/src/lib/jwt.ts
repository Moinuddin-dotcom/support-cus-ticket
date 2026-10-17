import type { Role } from './types';

export interface TokenClaims {
  sub: string;
  role: Role;
  exp?: number;
}

/**
 * Reads (does NOT verify) the JWT payload. Used only for routing decisions in
 * middleware; every API call is still authorised by the backend, which verifies the signature.
 */
export function decodeToken(token: string | undefined): TokenClaims | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const claims = JSON.parse(json) as Partial<TokenClaims>;
    if (typeof claims.sub !== 'string' || !claims.role) return null;
    if (claims.exp && claims.exp * 1000 <= Date.now()) return null;
    return { sub: claims.sub, role: claims.role, exp: claims.exp };
  } catch {
    return null;
  }
}
