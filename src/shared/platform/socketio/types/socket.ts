import type { SocketData } from './socket-data';
import type { WsEmitter } from './response';

/** Minimal typed socket contract for WebSocket gateways. */
export interface TypedSocket extends WsEmitter {
  id?: string;
  data?: SocketData;
  handshake?: {
    auth?: Record<string, unknown>;
    headers?: Record<string, unknown>;
    query?: Record<string, unknown>;
  };
}
