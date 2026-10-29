import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Standard response structure used throughout the system.
 */
export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  data: T;
  timestamp: string;
}

/**
 * Wrap every Controller result in the standard response format:
 * {
 *   success: true,
 *   statusCode: 200,
 *   data: ...,
 *   timestamp: "2026-09-07T14:30:00.000Z"
 * }
 */
@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  /**
   * Forward the request to the handler and normalize the response shape.
   *
   * @param context context data of type ExecutionContext.
   * @param next next data of type CallHandler.
   * @returns Result returned by `pipe`.
   */
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const statusCode = response?.statusCode ?? 200;

    return next.handle().pipe(
      map((data) => ({
        success: true,
        statusCode,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
