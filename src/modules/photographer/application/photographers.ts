import type * as Inputs from '@shared/contracts/contracts';
import { Injectable } from '@nestjs/common';
import type {
  Actor,
  Session,
} from '@shared/database/unit-of-work/unit-of-work.port';
import {
  currentUser,
  required,
  photographer,
  page,
  role,
} from '@shared/common/access';
import { ensure } from '@shared/platform/exceptions/domain.error';

@Injectable()
export class PhotographerUseCases {
  async create(
    s: Session,
    a: Actor,
    input: Inputs.PhotographerCreateCommandInput,
  ) {
    const u = await currentUser(s, a);
    role(a, 'photographer');
    const { description, ...fields } = input;
    const p = await s.insert('photographers', { ...fields, user_id: u.id });
    await s.insert('profiles', {
      photographer_id: p.id,
      description: description ?? '',
    });
    await s.insert('ratings', { photographer_id: p.id });
    return this.details(s, p.id, true);
  }
  async details(s: Session, id: string, privateView = false) {
    const p = await required(s, 'photographers', id),
      u = await required(s, 'users', p.user_id);
    if (!privateView)
      ensure(u.status === 'active', 'Photographer not found', 'missing');
    const [profile] = await s.find('profiles', { photographer_id: id });
    const [rating] = await s.find('ratings', { photographer_id: id });
    const result = {
      id: p.id,
      fullname: u.fullname,
      avatar_url: u.avatar_url,
      styles: p.styles,
      experience: p.experience,
      is_verified: p.is_verified,
      location: p.location,
      is_available: p.is_available,
      profile,
      rating,
    };
    return privateView
      ? { ...result, tax_code: p.tax_code, user_id: p.user_id }
      : result;
  }
  get(s: Session, _a: Actor, input: { id: string }) {
    return this.details(s, input.id);
  }
  async me(s: Session, a: Actor) {
    return this.details(s, (await photographer(s, a)).id, true);
  }
  async update(
    s: Session,
    a: Actor,
    input: Inputs.PhotographerUpdateCommandInput,
  ) {
    const p = await photographer(s, a),
      { description, ...fields } = input;
    if (Object.keys(fields).length)
      await s.update('photographers', p.id, fields);
    if (description !== undefined) {
      const [profile] = await s.find('profiles', { photographer_id: p.id });
      await s.update('profiles', profile.id, { description });
    }
    return this.details(s, p.id, true);
  }
  async status(s: Session, a: Actor, input: { is_available: boolean }) {
    const p = await photographer(s, a);
    await s.update('photographers', p.id, input);
    return this.details(s, p.id, true);
  }
  async location(s: Session, a: Actor, input: { location: string }) {
    const p = await photographer(s, a);
    await s.update('photographers', p.id, input);
    return this.details(s, p.id, true);
  }
  async search(
    s: Session,
    _a: Actor,
    input: Inputs.PhotographerSearchQueryInput,
  ) {
    const results: any[] = [];
    for (const p of await s.find('photographers')) {
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
  top(s: Session, a: Actor, input: Inputs.PhotographerTopQueryInput) {
    return this.search(s, a, input);
  }
  async admin(s: Session, a: Actor, input: Inputs.PhotographerAdminQueryInput) {
    role(a, 'admin');
    await currentUser(s, a);
    return page(await s.find('photographers'), input);
  }
}
