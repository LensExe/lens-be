import type { SchemaObject } from '@nestjs/swagger';
import { recordSchemas as records } from './record-schemas';

const str: SchemaObject = { type: 'string' },
  num: SchemaObject = { type: 'number' },
  bool: SchemaObject = { type: 'boolean' };

const obj = (properties: Record<string, SchemaObject>): SchemaObject => ({
  type: 'object',
  properties,
});

const array = (items: SchemaObject): SchemaObject => ({ type: 'array', items });

const items = (record: SchemaObject) => obj({ items: array(record) });

const paged = (record: SchemaObject) =>
  obj({ items: array(record), total: num, limit: num, offset: num });

const deleted = obj({ deleted: bool });

const planFeature = obj({ code: str, name: str, value: str });

const portfolioItem = obj({
  id: str,
  portfolio_id: str,
  media_id: str,
  position: num,
  download_url: str,
});

const photographer = obj({
  id: str,
  fullname: str,
  avatar_url: { ...str, nullable: true },
  styles: array(str),
  started_career_at: { ...num, nullable: true },
  is_verified: bool,
  verification_status: str,
  location: str,
  is_available: bool,
  description: str,
  rating: records.ratings,
});

const privatePhotographer = obj({
  ...photographer.properties,
  tax_code: { ...str, nullable: true },
  user_id: str,
});

const gallery = obj({
  ...records.booking_deliveries.properties,
  published_at: { ...str, nullable: true },
  items: array(
    obj({ id: str, media_id: str, file_size: num, download_url: str }),
  ),
  expires_in: num,
});

const portfolio = obj({
  ...records.portfolios.properties,
  cover_url: { ...str, nullable: true },
  items: array(portfolioItem),
  expires_in: num,
});

const subscription = obj({
  subscription: { ...records.subscriptions, nullable: true },
  features: array(planFeature),
});

const webhook = obj({ received: bool, duplicate: bool });

const schemas: Record<string, SchemaObject> = {
  'AUTH-001': records.users,
  'AUTH-002': records.users,
  'AUTH-003': records.users,
  'AUTH-004': obj({
    id: str,
    fullname: str,
    avatar_url: { ...str, nullable: true },
  }),
  'AUTH-007': obj({ authorization_url: str }),
  'AUTH-008': obj({
    access_token: str,
    expires_in: num,
    refresh_token: str,
    scope: str,
    token_type: str,
    user: records.users,
  }),
  'PHO-001': privatePhotographer,
  'PHO-002': photographer,
  'PHO-003': privatePhotographer,
  'PHO-004': privatePhotographer,
  'PHO-005': paged(photographer),
  'PHO-006': paged(photographer),
  'PHO-007': privatePhotographer,
  'PHO-008': privatePhotographer,
  'PORT-001': records.portfolios,
  'PORT-002': paged(records.portfolios),
  'PORT-003': portfolio,
  'PORT-004': records.portfolios,
  'PORT-005': deleted,
  'PORT-006': portfolioItem,
  'PORT-007': deleted,
  'PORT-008': portfolio,
  'CAL-001': items(obj({ from: str, to: str })),
  'CAL-002': obj({
    blocked: array(records.offline_slots),
    bookings: array(records.bookings),
  }),
  'CAL-006': records.offline_slots,
  'CAL-007': deleted,
  'BOOK-001': records.bookings,
  'BOOK-002': records.bookings,
  'BOOK-003': paged(records.bookings),
  'BOOK-004': records.bookings,
  'BOOK-005': records.bookings,
  'BOOK-006': records.bookings,
  'BOOK-007': records.bookings,
  'BOOK-008': records.bookings,
  'BOOK-009': records.bookings,
  'BOOK-010': items(
    obj({ booking_id: str, status: str, created_at: str, updated_at: str }),
  ),
  'BOOK-011': records.reports,
  'PAY-001': records.transactions,
  'PAY-002': records.transactions,
  'PAY-003': items(records.transactions),
  'PAY-004': records.transactions,
  'PAY-005': obj({
    id: str,
    status: str,
    qr_code: { ...str, nullable: true },
    checkout_url: { ...str, nullable: true },
  }),
  'PAY-006': webhook,
  'PAY-007': records.refund_requests,
  'PAY-008': items(records.refund_requests),
  'MEDIA-001': obj({ media: records.media, upload_url: str, expires_in: num }),
  'MEDIA-002': records.media,
  'MEDIA-003': obj({
    id: str,
    content_type: str,
    file_size: num,
    download_url: str,
    expires_in: num,
  }),
  'MEDIA-004': deleted,
  'MEDIA-005': records.booking_deliveries,
  'MEDIA-006': records.booking_deliveries,
  'MEDIA-007': gallery,
  'MEDIA-008': gallery,
  'MEDIA-009': gallery,
  'REV-001': records.feedbacks,
  'REV-002': paged(records.feedbacks),
  'REV-003': obj({
    average_rating: num,
    total_feedbacks: num,
    distribution: obj({ '1': num, '2': num, '3': num, '4': num, '5': num }),
  }),
  'REV-004': records.feedbacks,
  'REV-005': deleted,
  'SUB-001': obj({
    items: array(
      obj({
        ...records.photographer_plans.properties,
        features: array(planFeature),
      }),
    ),
    booking_plans: array(records.booking_plans),
  }),
  'SUB-002': obj({
    subscription: records.subscriptions,
    payment: records.transactions,
  }),
  'SUB-003': subscription,
  'SUB-004': records.subscriptions,
  'SUB-005': obj({ ...subscription.properties, storage_bytes: num }),
  'SUB-006': webhook,
  'MOD-001': records.reports,
  'MOD-002': paged(records.reports),
  'MOD-003': paged(records.reports),
  'MOD-004': records.reports,
  'MOD-005': records.reports,
  'MOD-006': records.users,
  'MOD-007': records.users,
  'ADM-001': obj({
    users: num,
    bookings: num,
    photographers: num,
    open_reports: num,
    paid_volume_vnd: num,
  }),
  'ADM-002': paged(records.users),
  'ADM-003': records.users,
  'ADM-004': records.users,
  'ADM-005': paged(records.bookings),
  'ADM-006': paged(records.transactions),
  'ADM-007': paged(records.photographers),
  'ADM-008': records.users,
};
export function responseSchema(id: string): SchemaObject {
  const schema = schemas[id];
  if (!schema) throw new Error(`Missing response schema: ${id}`);
  return schema;
}
