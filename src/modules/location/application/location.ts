import { Injectable } from '@nestjs/common';
import type {
  Actor,
  Session,
} from '@shared/database/unit-of-work/unit-of-work.port';
import { bookingAccess } from '@shared/common/access';
import { ensure } from '@shared/platform/exceptions/domain.error';
import { LocationSession } from '../domain/location-session';

@Injectable()
export class LocationUseCases {
  async permitted(s: Session, a: Actor, id: string) {
    const context = await bookingAccess(s, a, id, 'photographer'),
      b = context.booking;
    LocationSession.assertPermittedStatus(b.status);
    LocationSession.assertWithinWindow(b.from, b.to);
    return context;
  }
  async start(s: Session, a: Actor, i: { id: string }) {
    await this.permitted(s, a, i.id);
    const [session] = await s.find('location_sessions', { booking_id: i.id });
    return session
      ? s.update('location_sessions', session.id, {
          active: true,
          latitude: null,
          longitude: null,
        })
      : s.insert('location_sessions', { booking_id: i.id });
  }
  async update(
    s: Session,
    a: Actor,
    i: { id: string; latitude: number; longitude: number },
  ) {
    await this.permitted(s, a, i.id);
    const [session] = await s.find('location_sessions', { booking_id: i.id });
    ensure(session?.active, 'Start sharing first', 'conflict');
    return s.update('location_sessions', session.id, {
      latitude: i.latitude,
      longitude: i.longitude,
    });
  }
  async get(s: Session, a: Actor, i: { id: string }) {
    const { booking: b } = await bookingAccess(s, a, i.id, 'customer');
    LocationSession.assertPermittedStatus(b.status);
    LocationSession.assertWithinWindow(b.from, b.to);
    const [session] = await s.find('location_sessions', { booking_id: i.id });
    return {
      booking_id: i.id,
      active: !!session?.active,
      latitude: session?.active ? session.latitude : null,
      longitude: session?.active ? session.longitude : null,
      updated_at: session?.updated_at ?? null,
    };
  }
  async stop(s: Session, a: Actor, i: { id: string }) {
    await bookingAccess(
      s,
      a,
      i.id,
      a.roles.includes('system') ? undefined : 'photographer',
    );
    const [session] = await s.find('location_sessions', { booking_id: i.id });
    if (session)
      await s.update('location_sessions', session.id, {
        active: false,
        latitude: null,
        longitude: null,
      });
    return { active: false };
  }
}
