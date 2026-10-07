import type { EntityManager } from 'typeorm';
import { EntitySchemas, updateEntity } from '@shared/database';
import { Injectable } from '@nestjs/common';
import {
  photographer,
  publicPhotographer,
  required,
} from '@shared/common/access';
import type { Actor } from '@shared/platform/auth/actor';
import { ensure } from '@shared/platform/exceptions/domain.error';
import type * as Inputs from '@shared/contracts/contracts';
import { BookingPlan } from './booking-plan.domain';
import { PlanBookingsPort } from '../ports/plan-bookings.port';

/**
 * Booking plan operations: photographers create, edit, activate/deactivate, and delete plans; customers view plans currently on sale.
 */
@Injectable()
export class BookingPlanUseCases {
  constructor(private readonly planBookings: PlanBookingsPort) {}

  /**
   * Get a booking plan and ensure it belongs to the current caller's photographer profile.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor making the request, from the token.
   * @param id Booking plan ID (`booking_plans.id`).
   * @returns Booking plan record; throws HTTP 404 if it does not exist or HTTP 403 if it belongs to another photographer.
   * @throws {DomainError} Thrown when the actor is not authorized.
   */
  private async own(s: EntityManager, a: Actor, id: string) {
    const p = await photographer(s, a),
      plan = await required(s, 'booking_plans', id);
    ensure(
      plan.photographer_id === p.id,
      'Booking plan access denied',
      'forbidden',
    );
    return plan;
  }

  /**
   * Create a new booking plan for the photographer's own profile.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor making the request; must have a photographer profile.
   * @param i Plan details: name, price in VND, duration, photo count, retouched photo count, and benefits.
   * @returns New booking plan; throws HTTP 400 if the retouched photo count exceeds the delivery count.
   */
  async create(
    s: EntityManager,
    a: Actor,
    i: Inputs.BookingPlanCreateCommandInput,
  ) {
    const p = await photographer(s, a);
    BookingPlan.assertPhotoCounts(i.photo_count, i.retouched_photo_count);
    return s.save(EntitySchemas.booking_plans, {
      ...i,
      features: i.features ?? [],
      photographer_id: p.id,
    });
  }

  /**
   * Edit the photographer's own plan; activate or deactivate it with `is_active`.
   * If a field is omitted, keep its existing value, including when validating the retouch count.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor making the request; must own the plan.
   * @param i Plan ID and fields to update.
   * @returns Updated plan.
   */
  async update(
    s: EntityManager,
    a: Actor,
    i: Inputs.BookingPlanUpdateCommandInput,
  ) {
    const { booking_plan_id, ...fields } = i;
    const plan = await this.own(s, a, booking_plan_id);
    BookingPlan.assertPhotoCounts(
      fields.photo_count ?? plan.photo_count,
      fields.retouched_photo_count ?? plan.retouched_photo_count,
    );
    return updateEntity(
      s,
      EntitySchemas.booking_plans,
      booking_plan_id,
      fields,
    );
  }

  /**
   * A photographer may delete a plan only if it has no bookings. A plan with bookings can only be deactivated (409).
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor making the request; must own the plan.
   * @param i Plan ID to delete.
   * @returns `{ deleted: true }`
   */
  async remove(
    s: EntityManager,
    a: Actor,
    i: Inputs.BookingPlanRemoveCommandInput,
  ) {
    await this.own(s, a, i.booking_plan_id);
    BookingPlan.assertRemovable(
      await this.planBookings.bookingCountForPlan(s, i.booking_plan_id),
    );
    await s.delete(EntitySchemas.booking_plans, i.booking_plan_id);
    return { deleted: true };
  }

  /**
   * A photographer views all of their plans, including deactivated ones.
   *
   * @param s EntityManager for the current transaction.
   * @param a Actor making the request; must have a photographer profile.
   * @returns `{ items }` containing plans, oldest first.
   */
  async me(s: EntityManager, a: Actor) {
    const p = await photographer(s, a);
    const plans = await s.find(EntitySchemas.booking_plans, {
      where: { photographer_id: p.id },
      order: { created_at: 'ASC' },
    });
    return { items: plans };
  }

  /**
   * Customers view a photographer's plans that are currently on sale (public; authentication is not required).
   *
   * @param s EntityManager for the current transaction.
   * @param _a Caller provided for interface compatibility; unused because this API is public.
   * @param i Photographer profile ID (`photographers.id`).
   * @returns `{ items }` containing active plans, lowest price first; throws HTTP 404 if the photographer does not exist or is suspended.
   */
  async list(s: EntityManager, _a: Actor, i: Inputs.BookingPlanListQueryInput) {
    const { photographer: p } = await publicPhotographer(s, i.photographer_id);
    return {
      items: await s.find(EntitySchemas.booking_plans, {
        where: { photographer_id: p.id, is_active: true },
        order: { price: 'ASC' },
      }),
    };
  }
}
