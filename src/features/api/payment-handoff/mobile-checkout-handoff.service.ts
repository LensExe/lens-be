import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { Actor } from '@shared/platform/auth/actor';
import { RedisService } from '@shared/database/redis/redis.service';

export type MobileCheckoutPurpose = 'deposit' | 'remaining';

export interface MobileCheckoutSession {
  actor: Actor;
  booking_id: string;
  payment_purpose: MobileCheckoutPurpose;
  return_target: 'mobile';
  payment_id?: string;
  expires_at: number;
}

const HANDOFF_TTL_SECONDS = 90;
const SESSION_TTL_SECONDS = 45 * 60;

@Injectable()
export class MobileCheckoutHandoffService {
  constructor(private readonly redis: RedisService) {}

  async create(
    actor: Actor,
    bookingId: string,
    purpose: MobileCheckoutPurpose,
  ) {
    const code = randomBytes(32).toString('base64url');
    await this.redis.setJson(
      this.handoffKey(code),
      {
        actor,
        booking_id: bookingId,
        payment_purpose: purpose,
        return_target: 'mobile',
      } satisfies Omit<MobileCheckoutSession, 'expires_at' | 'payment_id'>,
      HANDOFF_TTL_SECONDS,
    );
    return { code, expires_in: HANDOFF_TTL_SECONDS };
  }

  async exchange(
    code: string,
  ): Promise<{ token: string; session: MobileCheckoutSession }> {
    const raw = await this.redis.getAndDelete(this.handoffKey(code));
    if (!raw)
      throw new UnauthorizedException('Checkout handoff is invalid or expired');

    let payload: Omit<MobileCheckoutSession, 'expires_at' | 'payment_id'>;
    try {
      payload = JSON.parse(raw) as Omit<
        MobileCheckoutSession,
        'expires_at' | 'payment_id'
      >;
    } catch {
      throw new UnauthorizedException('Checkout handoff is invalid');
    }
    if (
      !payload.actor?.sub ||
      !payload.actor.roles?.includes('customer') ||
      !payload.booking_id ||
      !['deposit', 'remaining'].includes(payload.payment_purpose) ||
      payload.return_target !== 'mobile'
    ) {
      throw new UnauthorizedException('Checkout handoff is invalid');
    }

    const token = randomBytes(32).toString('base64url');
    const session: MobileCheckoutSession = {
      ...payload,
      expires_at: Date.now() + SESSION_TTL_SECONDS * 1000,
    };
    await this.redis.setJson(
      this.sessionKey(token),
      session,
      SESSION_TTL_SECONDS,
    );
    return { token, session };
  }

  async getSession(
    token: string | undefined,
  ): Promise<MobileCheckoutSession | null> {
    if (!token) return null;
    const session = await this.redis.getJson<MobileCheckoutSession>(
      this.sessionKey(token),
    );
    if (!session || session.expires_at <= Date.now()) return null;
    return session;
  }

  async rememberPayment(token: string, paymentId: string): Promise<void> {
    const session = await this.getSession(token);
    if (!session)
      throw new UnauthorizedException('Checkout session has expired');
    const ttl = Math.max(
      1,
      Math.ceil((session.expires_at - Date.now()) / 1000),
    );
    await this.redis.setJson(
      this.sessionKey(token),
      { ...session, payment_id: paymentId },
      ttl,
    );
  }

  private handoffKey(code: string): string {
    return `payment:mobile-checkout:handoff:${this.digest(code)}`;
  }

  private sessionKey(token: string): string {
    return `payment:mobile-checkout:session:${this.digest(token)}`;
  }

  private digest(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
