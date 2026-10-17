import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthUser } from '../types/auth-user';

/**
 * Rate limits per authenticated user when possible, otherwise per client IP.
 * Registered after JwtAuthGuard, so `req.user` is populated on protected routes.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req.user as AuthUser | undefined;
    if (user?.id) {
      return Promise.resolve(`user:${user.id}`);
    }
    const ip = typeof req.ip === 'string' ? req.ip : 'unknown';
    return Promise.resolve(`ip:${ip}`);
  }
}
