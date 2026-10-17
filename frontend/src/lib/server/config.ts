import 'server-only';

/** Name of the httpOnly cookie that holds the API access token. */
export const TOKEN_COOKIE = 'st_token';

/**
 * Backend base URL (including /api). Read on the server only.
 * API_URL is a runtime override (docker-compose); NEXT_PUBLIC_API_URL is the documented Vercel variable.
 */
export function backendUrl(): string {
  const url = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  return url.replace(/\/+$/, '');
}
