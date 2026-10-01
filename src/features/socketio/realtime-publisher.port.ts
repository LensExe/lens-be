export abstract class RealtimePublisher {
  /**
   * Emit a real-time event to the specified users.
   *
   * @param userIds List of user IDs to process.
   * @param topic String value used by the operation: topic.
   * @param payload Event payload.
   * @returns Result of the operation described above.
   */
  abstract publish(userIds: string[], topic: string, payload: unknown): void;
}
