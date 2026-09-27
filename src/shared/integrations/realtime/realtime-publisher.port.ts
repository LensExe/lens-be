export abstract class RealtimePublisher {
  /** Gửi sự kiện tới người nhận. Ném lỗi (hoặc reject) khi gửi thất bại để outbox thử lại. */
  abstract publish(
    userIds: string[],
    topic: string,
    payload: unknown,
  ): Promise<void>;
}
