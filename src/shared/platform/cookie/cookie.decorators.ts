import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { CookieName } from './enums';

/**
 * Inject a cookie from the REST HTTP request.
 * @param data - The name of the cookie or CookieName enum.
 * @param context - The execution context.
 * @returns The cookie value from the request.
 */
export const ReqCookie = createParamDecorator(
  (
    data: CookieName | string,
    context: ExecutionContext,
  ): string | undefined => {
    const request = context.switchToHttp().getRequest<Request>();
    const cookies = request.cookies as Record<string, string> | undefined;
    return cookies?.[data.toString()];
  },
);
