import type * as Inputs from '@shared/contracts/contracts';
import { Injectable } from '@nestjs/common';
import type {
  Actor,
  Session,
} from '@shared/database/unit-of-work/unit-of-work.port';
import { currentUser, required, page, role } from '@shared/common/access';
import { ensure } from '@shared/platform/exceptions/domain.error';

@Injectable()
export class IdentityUseCases {
  async register(
    s: Session,
    a: Actor,
    input: { fullname: string; location?: string },
  ) {
    const [existing] = await s.find('users', { keycloak_id: a.sub });
    if (existing) {
      ensure(existing.status === 'active', 'Account suspended', 'forbidden');
      return existing;
    }
    ensure(a.email, 'Keycloak token must contain email');
    const user = await s.insert('users', {
      keycloak_id: a.sub,
      email: a.email,
      fullname: input.fullname,
    });
    await s.insert('customers', { user_id: user.id, location: input.location });
    await s.insert('wallets', { user_id: user.id });
    return user;
  }
  me(s: Session, a: Actor) {
    return currentUser(s, a);
  }
  async updateMe(
    s: Session,
    a: Actor,
    input: Inputs.IdentityUpdateMeCommandInput,
  ) {
    const u = await currentUser(s, a);
    return s.update('users', u.id, input);
  }
  async getUser(s: Session, a: Actor, input: { id: string }) {
    await currentUser(s, a);
    const u = await required(s, 'users', input.id);
    return { id: u.id, fullname: u.fullname, avatar_url: u.avatar_url };
  }
  async addDevice(
    s: Session,
    a: Actor,
    input: Inputs.IdentityAddDeviceCommandInput,
  ) {
    const u = await currentUser(s, a);
    const [existing] = await s.find('device_tokens', { token: input.token });
    if (existing) {
      ensure(
        existing.user_id === u.id,
        'Token belongs to another account',
        'conflict',
      );
      return s.update('device_tokens', existing.id, {
        platform: input.platform,
      });
    }
    return s.insert('device_tokens', { ...input, user_id: u.id });
  }
  async deleteDevice(s: Session, a: Actor, input: { tokenId: string }) {
    const u = await currentUser(s, a),
      row = await required(s, 'device_tokens', input.tokenId);
    ensure(row.user_id === u.id, 'Device access denied', 'forbidden');
    await s.delete('device_tokens', row.id);
    return { deleted: true };
  }
  async adminUsers(
    s: Session,
    a: Actor,
    input: Inputs.IdentityAdminUsersQueryInput,
  ) {
    role(a, 'admin');
    await currentUser(s, a);
    return page(
      (await s.find('users')).filter(
        (u) =>
          (!input.status || u.status === input.status) &&
          (!input.keyword ||
            [u.fullname, u.email]
              .join(' ')
              .toLowerCase()
              .includes(input.keyword.toLowerCase())),
      ),
      input,
    );
  }
  async adminUser(s: Session, a: Actor, input: { id: string }) {
    role(a, 'admin');
    await currentUser(s, a);
    return required(s, 'users', input.id);
  }
  async status(s: Session, a: Actor, input: { id: string; status: string }) {
    role(a, 'admin');
    const u = await currentUser(s, a);
    ensure(u.id !== input.id, 'Cannot change own admin status');
    await required(s, 'users', input.id);
    return s.update('users', input.id, { status: input.status });
  }
  suspend(s: Session, a: Actor, input: { id: string }) {
    return this.status(s, a, { ...input, status: 'suspended' });
  }
  unsuspend(s: Session, a: Actor, input: { id: string }) {
    return this.status(s, a, { ...input, status: 'active' });
  }
}
