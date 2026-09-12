import type { EntityManager, EntityTarget, FindOptionsWhere } from 'typeorm';
import { EntitySchemas } from '@shared/database';
import type { Actor } from '../platform/auth/actor';
import { ensure } from '../platform/exceptions/domain.error';
import type { EntityFor, TableName } from '../database/entities';

/**
 * Tìm kiếm một bản ghi theo `id` trong bảng chỉ định.
 * Nếu không tìm thấy, lập tức throw exception 404 Not Found (`table not found`).
 *
 * @param s EntityManager của TypeORM (có thể nằm trong transaction)
 * @param table Tên bảng / schema được định nghĩa trong EntitySchemas (ví dụ: 'users', 'bookings')
 * @param id ID (UUID) của bản ghi cần tìm
 * @returns Bản ghi tìm được với kiểu Type tương ứng của Entity
 */
export async function required<K extends TableName>(
  s: EntityManager,
  table: K,
  id: string,
): Promise<EntityFor<K>> {
  const target = EntitySchemas[table] as EntityTarget<EntityFor<K>>;
  const row = await s.findOneBy(target, { id } as unknown as FindOptionsWhere<
    EntityFor<K>
  >);
  ensure(row, `${table} not found`, 'missing');
  return row;
}

/**
 * Lấy thông tin User hiện tại từ Token xác thực (Actor).
 * Đồng thời kiểm tra 2 điều kiện tiên quyết:
 * 1. User đã tồn tại trong database backend (nếu chưa ➔ lỗi 403 yêu cầu đăng ký hồ sơ).
 * 2. User phải ở trạng thái 'active' (nếu là 'suspended' ➔ lỗi 403 tài khoản bị khóa).
 *
 * @param s EntityManager của TypeORM
 * @param actor Chủ thể đang gửi request (lấy từ JWT token Keycloak)
 * @returns Bản ghi UserEntity của người dùng đang đăng nhập
 */
export async function currentUser(s: EntityManager, actor: Actor) {
  const [user] = await s.findBy(EntitySchemas.users, {
    keycloak_id: actor.sub,
  });
  ensure(user, 'Register your user profile first', 'forbidden');
  ensure(user.status === 'active', 'Account suspended', 'forbidden');
  return user;
}

/**
 * Kiểm tra phân quyền theo vai trò (RBAC).
 * Đảm bảo Actor sở hữu ít nhất một trong các vai trò được yêu cầu.
 * Nếu không thỏa mãn ➔ throw exception 403 Forbidden.
 *
 * @param actor Chủ thể đang gửi request
 * @param roles Danh sách các vai trò được phép truy cập (ví dụ: 'admin', 'photographer')
 */
export function role(actor: Actor, ...roles: string[]) {
  ensure(
    roles.some((r) => actor.roles.includes(r)),
    'Role is not authorized',
    'forbidden',
  );
}

/**
 * Kiểm tra và lấy hồ sơ Nhiếp ảnh gia (Photographer profile) của User hiện tại.
 * Đảm bảo User đã đăng ký thành công hồ sơ Photographer.
 *
 * @param s EntityManager của TypeORM
 * @param actor Chủ thể đang gửi request
 * @returns Bản ghi PhotographerEntity tương ứng với user
 */
export async function photographer(s: EntityManager, actor: Actor) {
  const user = await currentUser(s, actor);
  const [p] = await s.findBy(EntitySchemas.photographers, { user_id: user.id });
  ensure(p, 'Photographer profile required', 'forbidden');
  return p;
}

/**
 * Kiểm tra quyền truy cập vào một đơn đặt lịch (Booking).
 * Xác thực xem người dùng hiện tại có phải là Khách hàng (Customer) hoặc Thợ chụp (Photographer) của đơn đó không,
 * hoặc có phải là Admin/Hệ thống hay không.
 *
 * @param s EntityManager của TypeORM
 * @param actor Chủ thể gửi request
 * @param id ID của booking
 * @param side Tùy chọn giới hạn vai trò cụ thể:
 *             - 'customer': bắt buộc phải là khách hàng tạo đơn booking này.
 *             - 'photographer': bắt buộc phải là thợ chụp nhận đơn booking này.
 *             - undefined: là 1 trong 2 bên (hoặc admin/system) đều hợp lệ.
 * @returns Đối tượng chứa thông tin booking, user, customer, photographer và danh sách recipient_ids để thông báo.
 */
export async function bookingAccess(
  s: EntityManager,
  actor: Actor,
  id: string,
  side?: 'customer' | 'photographer',
) {
  const user = await currentUser(s, actor),
    booking = await required(s, 'bookings', id);
  const c = await required(s, 'customers', booking.customer_id),
    p = await required(s, 'photographers', booking.photographer_id);
  const owner =
    side === 'customer'
      ? c.user_id === user.id
      : side === 'photographer'
        ? p.user_id === user.id
        : [c.user_id, p.user_id].includes(user.id);
  ensure(
    owner ||
      (!side && actor.roles.some((r) => ['admin', 'system'].includes(r))),
    'Booking access denied',
    'forbidden',
  );
  return {
    booking,
    user,
    customer: c,
    photographer: p,
    recipients: [c.user_id, p.user_id],
  };
}

/**
 * Lưu sự kiện vào bảng Outbox (`outbox_events`) trong cùng transaction với nghiệp vụ chính (Outbox Pattern).
 * Các worker ngầm (OutboxWorker) sẽ quét bảng này để đẩy thông báo realtime / push notification / webhook sau đó.
 *
 * @param s EntityManager của TypeORM (chạy trong transaction hiện tại)
 * @param topic Tên chủ đề / loại sự kiện (ví dụ: 'booking.created', 'payment.success')
 * @param recipient_ids Danh sách user_id của những người nhận sự kiện (sẽ được khử trùng lặp)
 * @param payload Dữ liệu chi tiết của sự kiện đi kèm
 */
export async function emit(
  s: EntityManager,
  topic: string,
  recipient_ids: string[],
  payload: Record<string, unknown>,
) {
  await s.save(EntitySchemas.outbox_events, {
    topic,
    recipient_ids: [...new Set(recipient_ids)],
    payload,
  });
}

/**
 * Tiện ích phân trang (Pagination) in-memory cho mảng dữ liệu.
 *
 * @param rows Mảng danh sách các phần tử cần phân trang
 * @param query Đối tượng chứa `limit` (số lượng mỗi trang) và `offset` (vị trí bắt đầu)
 * @returns Đối tượng kết quả chuẩn gồm: items (danh sách trang hiện tại), total, offset, limit
 */
export function page<T>(rows: T[], query: { limit?: number; offset?: number }) {
  const offset = query.offset ?? 0,
    limit = query.limit ?? 20;
  return {
    items: rows.slice(offset, offset + limit),
    total: rows.length,
    offset,
    limit,
  };
}
