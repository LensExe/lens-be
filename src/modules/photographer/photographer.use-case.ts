import type { EntityManager } from 'typeorm';
import { EntitySchemas, updateEntity } from '@shared/database';
import type * as Inputs from '@shared/contracts/contracts';
import { Injectable } from '@nestjs/common';
import type { Actor } from '@shared/platform/auth/actor';
import {
  currentUser,
  required,
  photographer,
  page,
  role,
} from '@shared/common/access';
import { ensure } from '@shared/platform/exceptions/domain.error';

/** Application use cases for photographer profiles. */
@Injectable()
export class PhotographerUseCases {
  async create(
    s: EntityManager,
    a: Actor,
    input: Inputs.PhotographerCreateCommandInput,
  ) {
    const u = await currentUser(s, a);
    role(a, 'photographer');
    const p = await s.save(EntitySchemas.photographers, {
      ...input,
      user_id: u.id,
    });
    await s.save(EntitySchemas.ratings, { photographer_id: p.id });
    return this.details(s, p.id, true);
  }

  async details(s: EntityManager, id: string, privateView = false) {
    const p = await required(s, 'photographers', id),
      u = await required(s, 'users', p.user_id);
    if (!privateView)
      ensure(u.status === 'active', 'Photographer not found', 'missing');
    const [rating] = await s.findBy(EntitySchemas.ratings, {
      photographer_id: id,
    });
    const result = {
      id: p.id,
      fullname: u.fullname,
      avatar_url: u.avatar_url,
      styles: p.styles,
      started_career_at: p.started_career_at,
      is_verified: p.is_verified,
      verification_status: p.verification_status,
      location: p.location,
      is_available: p.is_available,
      description: p.description,
      rating,
    };
    return privateView
      ? { ...result, tax_code: p.tax_code, user_id: p.user_id }
      : result;
  }

  get(s: EntityManager, _a: Actor, input: Inputs.PhotographerGetQueryInput) {
    return this.details(s, input.id);
  }

  async me(s: EntityManager, a: Actor) {
    return this.details(s, (await photographer(s, a)).id, true);
  }

  async update(
    s: EntityManager,
    a: Actor,
    input: Inputs.PhotographerUpdateCommandInput,
  ) {
    const p = await photographer(s, a);
    if (Object.keys(input).length)
      await updateEntity(s, EntitySchemas.photographers, p.id, input);
    return this.details(s, p.id, true);
  }

  async status(
    s: EntityManager,
    a: Actor,
    input: Inputs.PhotographerStatusCommandInput,
  ) {
    const p = await photographer(s, a);
    await updateEntity(s, EntitySchemas.photographers, p.id, input);
    return this.details(s, p.id, true);
  }

  async location(
    s: EntityManager,
    a: Actor,
    input: Inputs.PhotographerLocationCommandInput,
  ) {
    const p = await photographer(s, a);
    await updateEntity(s, EntitySchemas.photographers, p.id, input);
    return this.details(s, p.id, true);
  }

  async search(
    s: EntityManager,
    _a: Actor,
    input: Inputs.PhotographerSearchQueryInput,
  ) {
    const results: any[] = [];
    for (const p of await s.find(EntitySchemas.photographers)) {
      const u = await required(s, 'users', p.user_id);
      if (u.status !== 'active') continue;
      const item = await this.details(s, p.id);
      if (
        input.location &&
        !p.location.toLowerCase().includes(input.location.toLowerCase())
      )
        continue;
      if (
        input.keyword &&
        ![u.fullname, ...p.styles]
          .join(' ')
          .toLowerCase()
          .includes(input.keyword.toLowerCase())
      )
        continue;
      if (
        input.min_rating &&
        (item.rating?.average_rating ?? 0) < input.min_rating
      )
        continue;
      results.push(item);
    }
    results.sort(
      (x, y) =>
        (y.rating?.average_rating ?? 0) - (x.rating?.average_rating ?? 0) ||
        x.id.localeCompare(y.id),
    );
    return page(results, input);
  }

  top(s: EntityManager, a: Actor, input: Inputs.PhotographerTopQueryInput) {
    return this.search(s, a, input);
  }

  async admin(
    s: EntityManager,
    a: Actor,
    input: Inputs.PhotographerAdminQueryInput,
  ) {
    role(a, 'admin');
    await currentUser(s, a);
    return page(await s.find(EntitySchemas.photographers), input);
  }
}
