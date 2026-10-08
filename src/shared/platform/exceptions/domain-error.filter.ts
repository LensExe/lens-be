import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { DomainError } from '@shared/platform/exceptions/domain.error';

@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  /**
   * Convert an exception into an HTTP response appropriate for its error type.
   *
   * @param error Caught error to convert or log.
   * @param host host data of type ArgumentsHost.
   * @returns No value is returned.
   */
  catch(error: DomainError, host: ArgumentsHost) {
    const status = {
      invalid: 400,
      forbidden: 403,
      missing: 404,
      conflict: 409,
      unavailable: 503,
    }[error.code];
    host
      .switchToHttp()
      .getResponse()
      .status(status)
      .json({ statusCode: status, code: error.code, message: error.message });
  }
}
