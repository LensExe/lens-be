export abstract class RealtimePublisher {
  abstract publish(userIds: string[], topic: string, payload: unknown): void;
}
