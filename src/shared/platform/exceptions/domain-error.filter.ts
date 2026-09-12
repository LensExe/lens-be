import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { DomainError } from '@shared/platform/exceptions/domain.error';

@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
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
