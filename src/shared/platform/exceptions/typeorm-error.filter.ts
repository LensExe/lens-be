import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

@Catch(QueryFailedError)
export class TypeOrmErrorFilter implements ExceptionFilter {
  /**
   * Convert an exception into an HTTP response appropriate for its error type.
   *
   * @param error Caught error to convert or log.
   * @param host host data of type ArgumentsHost.
   * @returns No value is returned.
   */
  catch(error: QueryFailedError, host: ArgumentsHost) {
    const code = (error.driverError as { code?: string }).code;
    const mapped =
      code === '23505'
        ? {
            status: 409,
            type: 'conflict',
            message: 'Resource already exists',
          }
        : code === '23503'
          ? {
              status: 409,
              type: 'conflict',
              message: 'Referenced resource is missing or still in use',
            }
          : ['23514', '22P02'].includes(code ?? '')
            ? {
                status: 400,
                type: 'invalid',
                message: 'Database constraint rejected the value',
              }
            : {
                status: 500,
                type: 'database_error',
                message: 'Database operation failed',
              };

    host.switchToHttp().getResponse().status(mapped.status).json({
      statusCode: mapped.status,
      code: mapped.type,
      message: mapped.message,
    });
  }
}
