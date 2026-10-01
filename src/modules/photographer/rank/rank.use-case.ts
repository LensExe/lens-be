import type { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { EntitySchemas, updateEntity } from '@shared/database';
import { currentUser, role } from '@shared/common/access';
import type { Actor } from '@shared/platform/auth/actor';
import { ensure } from '@shared/platform/exceptions/domain.error';
import type * as Inputs from '@shared/contracts/contracts';
import { Rank } from './rank.domain';

/** Photographer rank catalog (`ranks`): public users can view it; admins can edit names, thresholds, and commission rates. */
@Injectable()
export class RankUseCases {
  /**
   * List ranks for the frontend to display their names and thresholds.
   *
   * @param s EntityManager for the current transaction.
   * @returns `{ items }` containing ranks ordered by increasing booking threshold.
   */
  async list(s: EntityManager) {
    return {
      items: await s.find(EntitySchemas.ranks, {
        order: { min_completed: 'ASC' },
      }),
    };
  }

  /**
   * An admin edits a rank's name, session threshold, or commission percentage.
   * The updated catalog must still include a rank with a zero-session threshold; a threshold that duplicates another rank returns 409 (UNIQUE).
   *
   * @param s EntityManager for the current transaction.
   * @param a Admin actor making the request.
   * @param input Rank code and fields to update.
   * @returns Updated rank; throws HTTP 404 if the code does not exist.
   * @throws {DomainError} Thrown when required data is missing or a resource does not exist.
   */
  async update(
    s: EntityManager,
    a: Actor,
    input: Inputs.RankUpdateCommandInput,
  ) {
    role(a, 'admin');
    await currentUser(s, a);
    const { code, ...fields } = input;
    const rank = await s.findOneBy(EntitySchemas.ranks, { code });
    ensure(rank, 'Rank not found', 'missing');
    const updated = await updateEntity(s, EntitySchemas.ranks, rank.id, fields);
    Rank.assertCatalog(await s.find(EntitySchemas.ranks));
    return updated;
  }
}
