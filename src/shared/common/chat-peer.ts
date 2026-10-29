import type { EntityManager } from 'typeorm';
import { EntitySchemas } from '@shared/database';
import { ensure } from '@shared/platform/exceptions/domain.error';
import { required } from './access';

/** Minimal profile data the portal needs to label a Chat Service participant. */
export interface ChatPeer {
  peer_id: string;
  profile_id: string;
  fullname: string;
  avatar_url: string | null;
  role: 'customer' | 'photographer';
}

/** Resolve a Lens database user to the Keycloak subject used by Chat Service. */
export async function chatPeerForUser(
  s: EntityManager,
  userId: string,
): Promise<ChatPeer> {
  const user = await required(s, 'users', userId);
  const [photographer, customer] = await Promise.all([
    s.findOneBy(EntitySchemas.photographers, { user_id: user.id }),
    s.findOneBy(EntitySchemas.customers, { user_id: user.id }),
  ]);

  if (photographer) {
    return {
      peer_id: user.keycloak_id,
      profile_id: photographer.id,
      fullname: user.fullname,
      avatar_url: user.avatar_url,
      role: 'photographer',
    };
  }

  ensure(customer, 'Chat participant profile not found', 'missing');
  return {
    peer_id: user.keycloak_id,
    profile_id: customer.id,
    fullname: user.fullname,
    avatar_url: user.avatar_url,
    role: 'customer',
  };
}

/** Resolve the peer identifier returned by Chat Service to a display profile. */
export async function chatPeerByKeycloakId(
  s: EntityManager,
  peerId: string,
): Promise<ChatPeer> {
  ensure(peerId.trim() === peerId && peerId.length > 0, 'Invalid peer ID');
  const [user] = await s.findBy(EntitySchemas.users, { keycloak_id: peerId });
  ensure(user, 'Chat participant not found', 'missing');
  return chatPeerForUser(s, user.id);
}
