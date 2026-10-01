import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AbstractException } from '../errors/abstract';

@Catch(AbstractException)
export class AbstractExceptionHttpFilter implements ExceptionFilter {
  private readonly logger = new Logger(AbstractExceptionHttpFilter.name);

  /**
   * Convert an exception into an HTTP response appropriate for its error type.
   *
   * @param exception Exception to convert or log.
   * @param host host data of type ArgumentsHost.
   * @returns No value is returned.
   */
  catch(exception: AbstractException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.httpStatus ?? HttpStatus.INTERNAL_SERVER_ERROR;

    this.logger.warn(
      `[${exception.code}] ${exception.message} (status: ${status}, path: ${request.url})`,
    );

    response.status(status).json({
      statusCode: status,
      code: exception.code,
      message: exception.message,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(exception.metadata ? { details: exception.metadata } : {}),
    });
  }
}
