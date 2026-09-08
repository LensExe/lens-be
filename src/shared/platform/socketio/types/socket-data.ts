/**
 * Extensible data attached to authenticated or paired sockets.
 */
export interface SocketData {
  userId?: string;
  [key: string]: unknown;
}
