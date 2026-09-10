import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Actor } from '../../database/unit-of-work/unit-of-work.port';

/**
 * Inject the Keycloak user.
 */
export const KeycloakRestUser = createParamDecorator(
  (_: unknown, context: ExecutionContext): Actor | undefined =>
    context.switchToHttp().getRequest<{ actor?: Actor }>().actor,
);
