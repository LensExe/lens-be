import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { MediaProcessingQueue } from './media-processing.port';

/**
 * Tên hàng đợi (Queue Name) trên Redis lưu trữ và phân phối các tác vụ xử lý media.
 * Kết nối giữa Producer (@InjectQueue) và Consumer/Worker (@Processor).
 */
export const MEDIA_PROCESSING_QUEUE = 'media-processing';

/**
 * Tên loại công việc (Job Name) cụ thể: Tạo các biến thể ảnh (thumbnail, preview).
 */
export const MEDIA_VARIANTS_JOB = 'create-variants';

/**
 * Payload dữ liệu truyền kèm trong Job tạo biến thể ảnh.
 */
export interface MediaVariantsJob {
  media_id: string;
}

/**
 * Service đóng vai trò Producer, chịu trách nhiệm đưa các tác vụ xử lý media vào hàng đợi BullMQ.
 */
@Injectable()
export class MediaProcessingQueueService extends MediaProcessingQueue {
  constructor(
    @InjectQueue(MEDIA_PROCESSING_QUEUE)
    private readonly queue: Queue<MediaVariantsJob>,
  ) {
    super();
  }

  /**
   * Đẩy tác vụ tạo biến thể ảnh vào hàng đợi để Worker xử lý bất đồng bộ ở background.
   * - `jobId`: Định danh duy nhất theo mediaId, chống đẩy trùng lặp công việc.
   * - `attempts: 3`: Tự động thử lại tối đa 3 lần nếu xảy ra lỗi (ví dụ lỗi mạng S3).
   * - `backoff`: Thời gian giãn cách giữa các lần thử lại tăng theo hàm mũ (bắt đầu từ 5s).
   * - `removeOnComplete/removeOnFail`: Tự động dọn dẹp job sau khi hoàn thành hoặc thất bại để tiết kiệm bộ nhớ Redis.
   */
  async enqueueVariants(mediaId: string): Promise<void> {
    await this.queue.add(
      MEDIA_VARIANTS_JOB,
      { media_id: mediaId },
      {
        jobId: `media-variants-${mediaId}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }
}
