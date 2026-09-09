import type * as Inputs from '@shared/contracts/contracts';
import { Injectable } from '@nestjs/common';
import type {
  Actor,
  Session,
} from '@shared/database/unit-of-work/unit-of-work.port';
import { currentUser, required, page } from '@shared/common/access';
import { ensure } from '@shared/platform/exceptions/domain.error';
import { MediaUseCases } from '@modules/media/application/media';

@Injectable()
export class ChatUseCases {
  constructor(private readonly media: MediaUseCases) {}
  async participant(s: Session, a: Actor, id: string) {
    const u = await currentUser(s, a),
      c = await required(s, 'conversations', id);
    ensure(
      [c.customer_user_id, c.photographer_user_id].includes(u.id),
      'Conversation access denied',
      'forbidden',
    );
    return { user: u, conversation: c };
  }
  async create(s: Session, a: Actor, i: { booking_id: string }) {
    const b = await required(s, 'bookings', i.booking_id),
      c = await required(s, 'customers', b.customer_id),
      p = await required(s, 'photographers', b.photographer_id);
    const [existing] = await s.find('conversations', { booking_id: b.id });
    return (
      existing ??
      s.insert('conversations', {
        booking_id: b.id,
        customer_user_id: c.user_id,
        photographer_user_id: p.user_id,
      })
    );
  }
  async list(s: Session, a: Actor, i: Inputs.ChatListQueryInput) {
    const u = await currentUser(s, a);
    return page(
      (await s.find('conversations')).filter((c) =>
        [c.customer_user_id, c.photographer_user_id].includes(u.id),
      ),
      i,
    );
  }
  async messages(s: Session, a: Actor, i: Inputs.ChatMessagesQueryInput) {
    await this.participant(s, a, i.id);
    return page(
      await s.find('messages', { conversation_id: i.id }, { descending: true }),
      i,
    );
  }
  async send(
    s: Session,
    a: Actor,
    i: {
      id: string;
      client_message_id: string;
      content?: string;
      media_id?: string;
    },
  ) {
    const { user } = await this.participant(s, a, i.id);
    if (i.media_id) await this.media.owned(s, a, i.media_id);
    ensure(i.content?.trim() || i.media_id, 'Message is empty');
    const [existing] = await s.find('messages', {
      sender_id: user.id,
      client_message_id: i.client_message_id,
    });
    if (existing) {
      ensure(
        existing.conversation_id === i.id &&
          existing.content === (i.content ?? null) &&
          existing.media_id === (i.media_id ?? null),
        'client_message_id reused with different content',
        'conflict',
      );
      return existing;
    }
    return s.insert('messages', {
      conversation_id: i.id,
      sender_id: user.id,
      client_message_id: i.client_message_id,
      content: i.content,
      media_id: i.media_id,
    });
  }
  attachment(s: Session, a: Actor, i: Inputs.ChatAttachmentCommandInput) {
    return this.send(s, a, i);
  }
  async read(s: Session, a: Actor, i: { id: string; message_id: string }) {
    const { user } = await this.participant(s, a, i.id),
      m = await required(s, 'messages', i.message_id);
    ensure(
      m.conversation_id === i.id,
      'Message does not belong to conversation',
      'forbidden',
    );
    const [existing] = await s.find('message_reads', {
      message_id: m.id,
      user_id: user.id,
    });
    return (
      existing ??
      s.insert('message_reads', { message_id: m.id, user_id: user.id })
    );
  }
  async signal(s: Session, a: Actor, i: { id: string; active: boolean }) {
    const { user } = await this.participant(s, a, i.id);
    return { conversation_id: i.id, user_id: user.id, active: i.active };
  }
}
