import type { EntityManager } from 'typeorm';
import { EntitySchemas, updateEntity } from '@shared/database';
import { Review } from './review.domain';
import type * as Inputs from '@shared/contracts/contracts';
import { Injectable } from '@nestjs/common';
import type { Actor } from '@shared/platform/auth/actor';
import {
  bookingAccess,
  currentUser,
  required,
  page,
} from '@shared/common/access';
import { ensure } from '@shared/platform/exceptions/domain.error';
import type { RatingUpdaterPort } from '@modules/booking/ports/rating-updater.port';

@Injectable()
export class ReviewUseCases implements RatingUpdaterPort {
  async recalculate(s: EntityManager, pid: string) {
    const bookings = await s.findBy(EntitySchemas.bookings, {
        photographer_id: pid,
      }),
      ids = new Set(bookings.map((x) => x.id));
    const reviews = (
      await s.findBy(EntitySchemas.feedbacks, { is_visible: true })
    ).filter((r) => ids.has(r.booking_id));
    const completed = bookings.filter((b) => b.status === 'completed'),
      counts = new Map<string, number>();
    for (const b of completed)
      counts.set(b.customer_id, (counts.get(b.customer_id) ?? 0) + 1);
    const summary = Review.summary(reviews.map((r) => r.rating));
    const values = {
      average_rating: summary.average_rating,
      total_feedbacks: summary.total_feedbacks,
      total_bookings: completed.length,
      return_customers: [...counts.values()].filter((n) => n > 1).length,
    };
    const [rating] = await s.findBy(EntitySchemas.ratings, {
      photographer_id: pid,
    });
    if (rating) await updateEntity(s, EntitySchemas.ratings, rating.id, values);
    else
      await s.save(EntitySchemas.ratings, { photographer_id: pid, ...values });
  }

  async create(s: EntityManager, a: Actor, i: Inputs.ReviewCreateCommandInput) {
    const { id, ...values } = i,
      { booking: b } = await bookingAccess(s, a, id, 'customer');
    Review.requireCompletedBooking(b.status);
    const r = await s.save(EntitySchemas.feedbacks, {
      ...values,
      booking_id: b.id,
      customer_id: b.customer_id,
    });
    await this.recalculate(s, b.photographer_id);
    return r;
  }

  async visible(s: EntityManager, pid: string) {
    const p = await required(s, 'photographers', pid),
      u = await required(s, 'users', p.user_id);
    ensure(u.status === 'active', 'Photographer not found', 'missing');
    const ids = new Set(
      (await s.findBy(EntitySchemas.bookings, { photographer_id: pid })).map(
        (x) => x.id,
      ),
    );
    return (
      await s.find(EntitySchemas.feedbacks, {
        where: { is_visible: true },
        order: { created_at: 'DESC', id: 'ASC' },
      })
    ).filter((r) => ids.has(r.booking_id));
  }

  async list(s: EntityManager, _a: Actor, i: Inputs.ReviewListQueryInput) {
    return page(await this.visible(s, i.id), i);
  }

  async summary(
    s: EntityManager,
    _a: Actor,
    i: Inputs.ReviewSummaryQueryInput,
  ) {
    const reviews = await this.visible(s, i.id);
    return Review.summary(reviews.map((r) => r.rating));
  }

  async update(s: EntityManager, a: Actor, i: Inputs.ReviewUpdateCommandInput) {
    const { id, ...fields } = i,
      r = await required(s, 'feedbacks', id),
      { booking: b } = await bookingAccess(s, a, r.booking_id, 'customer');
    Review.requireEditWindow(r.created_at);
    const result = await updateEntity(s, EntitySchemas.feedbacks, id, {
      ...fields,
      is_edited: true,
    });
    await this.recalculate(s, b.photographer_id);
    return result;
  }

  async remove(s: EntityManager, a: Actor, i: Inputs.ReviewRemoveCommandInput) {
    await currentUser(s, a);
    const r = await required(s, 'feedbacks', i.id),
      { booking: b } = await bookingAccess(
        s,
        a,
        r.booking_id,
        a.roles.includes('admin') ? undefined : 'customer',
      );
    await updateEntity(s, EntitySchemas.feedbacks, r.id, { is_visible: false });
    await this.recalculate(s, b.photographer_id);
    return { deleted: true };
  }
}
