import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Actor } from '../../platform/auth/actor';

/**
 * Inject the Keycloak user.
 */
export const KeycloakRestUser = createParamDecorator(
  (_: unknown, context: ExecutionContext): Actor | undefined =>
    context.switchToHttp().getRequest<{ actor?: Actor }>().actor,
);
