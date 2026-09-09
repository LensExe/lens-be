export abstract class NotificationDelivery {
  abstract send(input: {
    eventId: string;
    userId: string;
    email: string;
    tokens: string[];
    title: string;
    body: string;
  }): Promise<{ invalidTokens: string[] }>;
}
