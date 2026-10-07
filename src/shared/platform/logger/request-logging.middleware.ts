import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const logger = new Logger('HttpRequest');
const redactedValue = '[REDACTED]';
const sensitiveFieldPattern =
  /password|passwd|secret|token|authorization|cookie|api[-_]?key|otp|verification[-_]?code|one[-_]?time[-_]?password|(^|[^a-z])(code|state)([^a-z]|$)/i;

/**
 * Log every HTTP request as soon as it reaches Express, then record its parsed
 * body and outgoing response when the request finishes.
 */
export function requestLoggingMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const requestId = randomUUID();
  const startedAt = process.hrtime.bigint();
  let responseBody: unknown;
  const originalSend = response.send.bind(response);
  response.send = ((body?: unknown) => {
    responseBody = body;
    return originalSend(body);
  }) as Response['send'];

  const requestInfo = {
    requestId,
    method: request.method,
    url: redactUrl(request.originalUrl || request.url),
    ip: request.ip,
    remoteAddress: request.socket.remoteAddress,
    headers: redactHeaders(request.headers),
  };

  response.setHeader('x-request-id', requestId);
  logger.log(JSON.stringify({ event: 'request.received', ...requestInfo }));

  response.once('finish', () => {
    logger.log(
      JSON.stringify({
        event: 'request.completed',
        ...requestInfo,
        statusCode: response.statusCode,
        durationMs: getDurationMs(startedAt),
        body: redactBody(request.body),
      }),
    );

    logger.log(
      JSON.stringify({
        event: 'response.sent',
        requestId,
        method: request.method,
        url: requestInfo.url,
        statusCode: response.statusCode,
        headers: redactHeaders(response.getHeaders()),
        body: redactBody(responseBody),
        durationMs: getDurationMs(startedAt),
      }),
    );
  });

  response.once('close', () => {
    if (response.writableFinished) return;

    logger.warn(
      JSON.stringify({
        event: 'request.aborted',
        ...requestInfo,
        statusCode: response.statusCode,
        durationMs: getDurationMs(startedAt),
      }),
    );
  });

  next();
}

function redactHeaders(
  headers: Record<string, unknown>,
): Record<string, unknown> {
  const sanitizedHeaders: Record<string, unknown> = {};

  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    if (sensitiveFieldPattern.test(name)) {
      sanitizedHeaders[name] = redactedValue;
      continue;
    }

    if (
      (name === 'referer' || name === 'referrer') &&
      typeof value === 'string'
    ) {
      sanitizedHeaders[name] = redactUrl(value);
      continue;
    }

    if ((name === 'referer' || name === 'referrer') && Array.isArray(value)) {
      sanitizedHeaders[name] = value.map((item) =>
        typeof item === 'string' ? redactUrl(item) : item,
      );
      continue;
    }

    sanitizedHeaders[name] = value;
  }

  return sanitizedHeaders;
}

function redactUrl(url: string): string {
  const queryStart = url.indexOf('?');
  if (queryStart === -1) return url;

  const pathname = url.slice(0, queryStart);
  const query = url.slice(queryStart + 1);
  const params = new URLSearchParams(query);

  for (const key of params.keys()) {
    if (sensitiveFieldPattern.test(key)) params.set(key, redactedValue);
  }

  const sanitizedQuery = params.toString();
  return sanitizedQuery ? `${pathname}?${sanitizedQuery}` : pathname;
}

function redactBody(value: unknown, parentKey?: string): unknown {
  if (parentKey && sensitiveFieldPattern.test(parentKey)) return redactedValue;
  if (value === null || value === undefined) return value;
  if (Buffer.isBuffer(value)) return `[binary data: ${value.length} bytes]`;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return redactBody(JSON.parse(value));
      } catch {
        // Keep malformed JSON visible while masking common credential assignments.
      }
    }
    return redactAssignments(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactBody(item));
  }

  if (typeof value !== 'object') return value;

  const sanitizedBody: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    sanitizedBody[key] = redactBody(child, key);
  }
  return sanitizedBody;
}

function redactAssignments(value: string): string {
  return value.replace(
    /(["']?(?:password|passwd|secret|access[_-]?token|refresh[_-]?token|id[_-]?token|token|authorization|cookie|api[_-]?key|otp|verification[_-]?code|code|state)["']?\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^&\s,}]+)/gi,
    `$1"${redactedValue}"`,
  );
}

function getDurationMs(startedAt: bigint): number {
  return (
    Math.round(
      (Number(process.hrtime.bigint() - startedAt) / 1_000_000) * 100,
    ) / 100
  );
}
