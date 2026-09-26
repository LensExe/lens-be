import type { EntityManager } from 'typeorm';
import {
  EntitySchemas,
  updateEntity,
  MediaStatus,
  MediaVisibility,
} from '@shared/database';
import type * as Inputs from '@shared/contracts/contracts';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ObjectStorage } from '@shared/integrations/s3/storage.port';
import {
  MediaVariantType,
  type MediaVariantEntity,
} from '@shared/database/entities/media-variant.entity';
import type { Actor } from '@shared/platform/auth/actor';
import {
  currentUser,
  required,
  bookingAccess,
  emit,
} from '@shared/common/access';
import { ensure } from '@shared/platform/exceptions/domain.error';
import { Media } from './media.domain';
import type { MediaOwnershipPort } from '@modules/photographer/ports/media-ownership.port';

@Injectable()
export class MediaUseCases implements MediaOwnershipPort {
  constructor(private readonly storage: ObjectStorage) {}

  /**
   * Khởi tạo quá trình tải lên (upload) media mới.
   * - Kiểm tra định dạng (MIME type) và dung lượng file hợp lệ theo quy định domain.
   * - Xác định quyền hiển thị (PUBLIC hoặc PRIVATE) và sinh file_key lưu trữ: `{visibility}/{user_id}/{uuid}`.
   * - Tạo Presigned Upload URL từ Object Storage để Client/Frontend tải file trực tiếp lên S3/MinIO.
   * - Lưu bản ghi media ban đầu vào database (trạng thái pending/chờ hoàn tất).
   * - Trả về thông tin media, `upload_url` và thời hạn hết hạn của URL (`expires_in: 900` giây).
   */
  async upload(s: EntityManager, a: Actor, i: Inputs.MediaUploadCommandInput) {
    // kiểm tra Content-Type
    Media.assertAllowedContentType(i.content_type);
    // kiểm tra dung lượng
    Media.assertFileSize(i.file_size);
    const u = await currentUser(s, a),
      visibility = i.visibility ?? MediaVisibility.PRIVATE,
      key = `${visibility}/${u.id}/${randomUUID()}`;
    // tạo presigned upload URL
    const upload_url = await this.storage.uploadUrl(
      key,
      i.content_type,
      i.file_size,
    );
    const media = await s.save(EntitySchemas.media, {
      ...i,
      visibility,
      user_id: u.id,
      file_key: key,
    });
    return { media, upload_url, expires_in: 900 };
  }

  /**
   * Kiểm tra quyền sở hữu và tính hợp lệ của media đối với người dùng hiện tại.
   * - Xác thực người dùng hiện tại là chủ nhân tạo ra media (`media.user_id === user.id`).
   * - Đảm bảo media chưa bị xóa (khác trạng thái `DELETED`).
   * - Nếu `ready = true` (mặc định), yêu cầu media phải ở trạng thái sẵn sàng (`READY`).
   * - Trả về entity media nếu đáp ứng đầy đủ điều kiện.
   */
  async owned(s: EntityManager, a: Actor, id: string, ready = true) {
    const u = await currentUser(s, a),
      m = await required(s, 'media', id);
    ensure(m.user_id === u.id, 'Media access denied', 'forbidden');
    Media.assertNotDeleted(m.status);
    if (ready) Media.assertReady(m.status);
    return m;
  }

  /**
   * Xác nhận hoàn tất upload sau khi client đã tải file lên S3 thành công.
   * - Kiểm tra quyền sở hữu media của người dùng.
   * - Nếu media đã ở trạng thái `READY` trước đó, trả về luôn (đảm bảo tính idempotent).
   * - Gọi storage kiểm tra thực tế (HeadObject) xem file đã lên S3 chưa, đúng Content-Type và dung lượng không.
   * - Chỉ verify object và chuyển sang `UPLOADED`.
   * - Worker sẽ xử lý thumbnail/preview sau khi transaction này commit.
   */
  async complete(
    s: EntityManager,
    a: Actor,
    i: Inputs.MediaCompleteCommandInput,
  ) {
    const m = await this.owned(s, a, i.media_id, false);
    if (m.status === MediaStatus.READY || m.status === MediaStatus.PROCESSING)
      return m;
    // verify file on s3
    await this.storage.verify(m.file_key, m.content_type, Number(m.file_size));
    return updateEntity(s, EntitySchemas.media, m.id, {
      status: MediaStatus.UPLOADED,
    });
  }

  /**
   * Lấy chi tiết thông tin media kèm các đường dẫn URL (thumbnail, preview, download).
   * - Kiểm tra quyền truy cập (Access Control) đa tầng:
   *   1. Người yêu cầu là chủ sở hữu file.
   *   2. Hoặc file được dùng làm ảnh bìa (cover) hay item trong Portfolio của một photographer đang active.
   *   3. Hoặc file nằm trong bộ ảnh bàn giao (Booking Delivery) mà người dùng là photographer hoặc customer (đã publish).
   * - Truy vấn các biến thể ảnh `THUMBNAIL` và `PREVIEW`.
   * - Sinh URL tương ứng cho từng loại (tự động xử lý public URL hoặc presigned URL 15 phút nếu private).
   */
  async get(s: EntityManager, a: Actor, i: Inputs.MediaGetQueryInput) {
    const u = await currentUser(s, a),
      m = await required(s, 'media', i.media_id);
    Media.assertNotDeleted(m.status);
    let allowed = m.user_id === u.id;
    if (!allowed)
      for (const album of await s.findBy(EntitySchemas.portfolios, {
        cover_media_id: m.id,
      })) {
        const p = await required(s, 'photographers', album.photographer_id),
          owner = await required(s, 'users', p.user_id);
        if (owner.status === 'active') allowed = true;
      }
    if (!allowed)
      for (const portfolio of await s.find(EntitySchemas.portfolios)) {
        if (!portfolio.items.includes(m.id)) continue;
        const p = await required(s, 'photographers', portfolio.photographer_id),
          owner = await required(s, 'users', p.user_id);
        if (owner.status === 'active') allowed = true;
      }
    if (!allowed)
      for (const delivery of await s.find(EntitySchemas.booking_deliveries)) {
        if (!delivery.media_ids.includes(m.id)) continue;
        const b = await required(s, 'bookings', delivery.booking_id),
          c = await required(s, 'customers', b.customer_id),
          p = await required(s, 'photographers', b.photographer_id);
        if (
          p.user_id === u.id ||
          (c.user_id === u.id && !!b.gallery_published_at)
        )
          allowed = true;
      }
    ensure(allowed, 'Media access denied', 'forbidden');
    if (m.status !== MediaStatus.READY) {
      return {
        id: m.id,
        status: m.status,
        content_type: m.content_type,
        file_size: m.file_size,
        visibility: m.visibility,
        thumbnail_url: null,
        preview_url: null,
        download_url: null,
        expires_in: null,
      };
    }
    const thumbnail = await this.findVariant(
      s,
      m.id,
      MediaVariantType.THUMBNAIL,
    );
    const preview = await this.findVariant(s, m.id, MediaVariantType.PREVIEW);
    return {
      id: m.id,
      content_type: m.content_type,
      file_size: m.file_size,
      visibility: m.visibility,
      thumbnail_url: await this.storage.getUrl(
        thumbnail?.file_key ?? m.file_key,
        m.visibility,
      ),
      preview_url: await this.storage.getUrl(
        preview?.file_key ?? m.file_key,
        m.visibility,
      ),
      download_url: await this.storage.getUrl(m.file_key, m.visibility),
      expires_in: m.visibility === MediaVisibility.PRIVATE ? 900 : null,
    };
  }

  /**
   * Xóa file media và dọn dẹp các tài nguyên liên quan.
   * - Xác thực quyền sở hữu của người dùng đối với media.
   * - Kiểm tra ràng buộc dữ liệu: Media không được đang sử dụng trong bất kỳ Booking Delivery hoặc Portfolio nào.
   * - Xóa toàn bộ file biến thể (thumbnail, preview...) và file gốc trên S3 Storage.
   * - Xóa bản ghi các biến thể trong bảng `media_variants`.
   * - Cập nhật trạng thái media thành `DELETED` (soft-delete).
   */
  async remove(s: EntityManager, a: Actor, i: Inputs.MediaRemoveCommandInput) {
    const m = await this.owned(s, a, i.media_id, false);
    ensure(
      !(await s.find(EntitySchemas.booking_deliveries)).some((delivery) =>
        delivery.media_ids.includes(m.id),
      ) &&
        !(await s.find(EntitySchemas.portfolios)).some((portfolio) =>
          portfolio.items.includes(m.id),
        ) &&
        !(await s.findBy(EntitySchemas.portfolios, { cover_media_id: m.id }))
          .length,
      'Media is still referenced',
      'conflict',
    );
    // get variants by media_id
    const variants = await s.findBy(EntitySchemas.media_variants, {
      media_id: m.id,
    });
    await this.storage.deleteMany([
      m.file_key,
      ...variants.map((variant) => variant.file_key),
    ]);
    await s.delete(EntitySchemas.media_variants, { media_id: m.id });
    await updateEntity(s, EntitySchemas.media, m.id, {
      status: MediaStatus.DELETED,
    });
    return { deleted: true };
  }

  /**
   * Khởi tạo bộ sưu tập ảnh bàn giao (Gallery / Delivery) cho một đơn Booking.
   * - Xác thực quyền: Người gọi phải là Photographer được phân công cho đơn booking này.
   * - Kiểm tra nếu delivery đã tồn tại thì trả về luôn; nếu chưa có thì tạo mới bản ghi `booking_deliveries` với danh sách ảnh rỗng (`media_ids: []`).
   */
  async createGallery(
    s: EntityManager,
    a: Actor,
    i: Inputs.MediaCreateGalleryCommandInput,
  ) {
    await bookingAccess(s, a, i.booking_id, 'photographer');
    const [existing] = await s.findBy(EntitySchemas.booking_deliveries, {
      booking_id: i.booking_id,
    });
    return (
      existing ??
      s.save(EntitySchemas.booking_deliveries, {
        booking_id: i.booking_id,
        media_ids: [],
      })
    );
  }

  /**
   * Thêm một ảnh đã upload vào bộ sưu tập bàn giao của đơn Booking.
   * - Xác thực quyền photographer và đảm bảo gallery chưa được công bố (`gallery_published_at` chưa set).
   * - Đảm bảo gallery đã được khởi tạo trước đó.
   * - Đảm bảo photographer là chủ sở hữu của ảnh và ảnh chưa có trong gallery.
   * - Bổ sung `media_id` vào mảng `media_ids` của bảng `booking_deliveries`.
   */
  async addToGallery(
    s: EntityManager,
    a: Actor,
    i: Inputs.MediaAddGalleryCommandInput,
  ) {
    // quyền photographer của booking
    const { booking: b } = await bookingAccess(
      s,
      a,
      i.booking_id,
      'photographer',
    );
    // gallery chưa được công bố
    Media.assertGalleryMutable(b.gallery_published_at);
    // lấy delivery của booking
    const [delivery] = await s.findBy(EntitySchemas.booking_deliveries, {
      booking_id: i.booking_id,
    });
    ensure(delivery, 'Create gallery first', 'conflict');
    // đảm bảo photographer là chủ sở hữu của ảnh
    const m = await this.owned(s, a, i.media_id);
    // đảm bảo ảnh chưa có trong gallery
    ensure(
      !delivery.media_ids.includes(m.id),
      'Media already added to gallery',
    );
    return updateEntity(s, EntitySchemas.booking_deliveries, delivery.id, {
      media_ids: [...delivery.media_ids, m.id],
    });
  }

  /**
   * Lấy danh sách ảnh trong bộ sưu tập (Gallery) của đơn Booking.
   * - Xác thực quyền xem: Chỉ Photographer của đơn booking hoặc Khách hàng (sau khi gallery đã được publish) mới có quyền xem.
   * - Hỗ trợ 2 chế độ hiển thị (`mode`):
   *   - `'thumbnail'`: Lấy URL ảnh thu nhỏ và kích thước (width/height) để hiển thị lưới ảnh mượt mà trên web/app.
   *   - `'original'`: Lấy URL tải ảnh gốc độ phân giải cao.
   * - Tự động thiết lập thời gian hết hạn (`expires_in`) nếu trong bộ ảnh có chứa ảnh private.
   */
  async gallery(
    s: EntityManager,
    a: Actor,
    i: Inputs.MediaGalleryQueryInput,
    mode: 'thumbnail' | 'original' = 'thumbnail',
  ) {
    const {
      booking: b,
      user,
      photographer: p,
    } = await bookingAccess(s, a, i.booking_id);
    ensure(
      user.id === p.user_id || !!b.gallery_published_at,
      'Gallery not published',
      'forbidden',
    );

    const [delivery] = await s.findBy(EntitySchemas.booking_deliveries, {
      booking_id: i.booking_id,
    });
    ensure(delivery, 'Gallery not found', 'missing');

    const items = [] as Record<string, unknown>[];
    let hasPrivateMedia = false;
    for (const mediaId of delivery.media_ids) {
      const media = await required(s, 'media', mediaId);
      if (media.visibility !== MediaVisibility.PUBLIC) {
        hasPrivateMedia = true;
      }
      const item: Record<string, unknown> = {
        id: media.id,
        media_id: media.id,
        file_size: media.file_size,
        content_type: media.content_type,
      };
      if (mode === 'original') {
        item.download_url = await this.storage.getUrl(
          media.file_key,
          media.visibility,
        );
      } else {
        const thumbnail = await this.findVariant(
          s,
          media.id,
          MediaVariantType.THUMBNAIL,
        );
        item.thumbnail_url = await this.storage.getUrl(
          thumbnail?.file_key ?? media.file_key,
          media.visibility,
        );
        item.width = thumbnail?.width ?? null;
        item.height = thumbnail?.height ?? null;
      }
      items.push(item);
    }
    return {
      ...delivery,
      published_at: b.gallery_published_at,
      items,
      expires_in: hasPrivateMedia ? 900 : null,
    };
  }

  /**
   * Công bố bộ sưu tập ảnh (Publish Gallery) cho khách hàng của đơn Booking.
   * - Xác thực quyền: Người thực hiện phải là Photographer của đơn booking.
   * - Kiểm tra đơn booking đã ở trạng thái cho phép bàn giao ảnh chưa.
   * - Đảm bảo bộ sưu tập có ít nhất 1 ảnh trước khi công bố.
   * - Cập nhật mốc thời gian `gallery_published_at` của booking.
   * - Bắn sự kiện (event) `'gallery.ready'` để hệ thống gửi thông báo cho khách hàng.
   * - Trả về dữ liệu gallery đã công bố.
   */
  async publishGallery(
    s: EntityManager,
    a: Actor,
    i: Inputs.MediaPublishCommandInput,
  ) {
    const { booking: b, recipients } = await bookingAccess(
      s,
      a,
      i.booking_id,
      'photographer',
    );
    Media.assertBookingReadyForPublish(b.status);
    const [delivery] = await s.findBy(EntitySchemas.booking_deliveries, {
      booking_id: i.booking_id,
    });
    ensure(delivery, 'Gallery not found', 'missing');
    Media.assertGalleryNotEmpty(delivery.media_ids.length);
    if (!b.gallery_published_at) {
      await updateEntity(s, EntitySchemas.bookings, b.id, {
        gallery_published_at: new Date().toISOString(),
      });
      await emit(s, 'gallery.ready', recipients, { booking_id: b.id });
    }
    return this.gallery(s, a, { booking_id: i.booking_id });
  }

  /**
   * Customer hoặc photographer tải toàn bộ ảnh gốc trong gallery của booking.
   * `bookingAccess` vẫn kiểm tra người gọi phải thuộc đúng booking đó.
   */
  async downloadGallery(
    s: EntityManager,
    a: Actor,
    i: Inputs.MediaDownloadQueryInput,
  ) {
    await bookingAccess(s, a, i.booking_id);
    return this.gallery(s, a, { booking_id: i.booking_id }, 'original');
  }

  /**
   * Tìm kiếm biến thể ảnh (THUMBNAIL, PREVIEW...) theo `mediaId` và loại biến thể trong bảng `media_variants`.
   */
  private findVariant(
    s: EntityManager,
    mediaId: string,
    variant: MediaVariantType,
  ): Promise<MediaVariantEntity | null> {
    return s.findOneBy(EntitySchemas.media_variants, {
      media_id: mediaId,
      variant,
    });
  }
}
