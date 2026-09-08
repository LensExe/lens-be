import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { DEVICE_FINGERPRINT_HEADER } from '../constants';
import type { ClientContext } from '../types';

/**
 * Normalizes a possibly-array header value to its first string entry.
 */
function firstHeader(value: string | Array<string> | undefined): string | null {
  const resolved = Array.isArray(value) ? value[0] : value;
  return resolved ?? null;
}

/**
 * Injects ClientContext (IP, User-Agent, device fingerprint) extracted
 * from the request.
 *
 * @example
 * execute(@ClientContextParam() client: ClientContext) { ... }
 */
export const ClientContextParam = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ClientContext => {
    const request = context.switchToHttp().getRequest<Request>();

    const forwardedFor = firstHeader(request.headers['x-forwarded-for']);
    const ipAddress = forwardedFor
      ? (forwardedFor.split(',')[0]?.trim() ?? null)
      : (request.ip ?? null);

    const userAgent = firstHeader(request.headers['user-agent']);
    const fingerprint = firstHeader(request.headers[DEVICE_FINGERPRINT_HEADER]);

    return {
      ipAddress,
      userAgent,
      fingerprint,
    };
  },
);
