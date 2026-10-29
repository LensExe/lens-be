import type { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { EntitySchemas, updateEntity } from '@shared/database';
import { currentUser, role } from '@shared/common/access';
import type { Actor } from '@shared/platform/auth/actor';
import { ensure } from '@shared/platform/exceptions/domain.error';
import type * as Inputs from '@shared/contracts/contracts';

/** Badge catalog (`badges`): public users can view it; admins can edit its content and thresholds. */
@Injectable()
export class BadgeUseCases {
  /**
   * List badges for the frontend to display their names, descriptions, and requirements.
   *
   * @param s EntityManager for the current transaction.
   * @returns `{ items }` containing badges in creation order.
   */
  async list(s: EntityManager) {
    return {
      items: await s.find(EntitySchemas.badges, {
        order: { created_at: 'ASC' },
      }),
    };
  }

  /**
   * Admin updates a badge's name, description, threshold, minimum review count, or enabled status.
   * Disabling a badge stops future awards; previously awarded badges remain.
   *
   * @param s EntityManager for the current transaction.
   * @param a Admin actor making the request.
   * @param input Badge code and fields to update.
   * @returns Updated badge; throws HTTP 404 if the code does not exist.
   * @throws {DomainError} Thrown when required data is missing or a resource does not exist.
   */
  async update(
    s: EntityManager,
    a: Actor,
    input: Inputs.BadgeUpdateCommandInput,
  ) {
    role(a, 'admin');
    await currentUser(s, a);
    const { code, ...fields } = input;
    const badge = await s.findOneBy(EntitySchemas.badges, { code });
    ensure(badge, 'Badge not found', 'missing');
    return updateEntity(s, EntitySchemas.badges, badge.id, fields);
  }
}
