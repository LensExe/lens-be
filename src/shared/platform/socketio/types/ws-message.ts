/** Message for sending a success or error WS message. */
export interface SocketIoMessage<T = unknown> {
  /** The message to send */
  message: string;
  /** The data to send */
  data?: T;
  /** Whether the message is a success */
  success: boolean;
  /** The error to send */
  error?: string;
}
