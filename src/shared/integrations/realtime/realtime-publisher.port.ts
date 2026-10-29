export abstract class RealtimePublisher {
  /**
   * Send an event to its recipients. Throw or reject on failure so the outbox can retry.
   *
   * @param userIds List of user IDs to process.
   * @param topic String value used by the operation: topic.
   * @param payload Event payload.
   * @returns Result of the operation described above.
   */
  abstract publish(
    userIds: string[],
    topic: string,
    payload: unknown,
  ): Promise<void>;
}
