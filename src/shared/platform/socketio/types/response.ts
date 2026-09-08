/**
 * Minimal emitter contract satisfied by Socket.IO client, room, or namespace.
 */
export interface WsEmitter {
  emit(event: string, ...args: unknown[]): unknown;
}

/**
 * Minimal namespace contract with room targeting.
 */
export interface WsNamespace extends WsEmitter {
  to(room: string): WsEmitter;
}

/** Params for sending a success WS message. */
export interface SuccessParams<T = unknown> {
  message: string;
  data?: T;
  client: WsEmitter;
  eventName: string;
}

/** Params for sending a success WS message to a room. */
export interface SuccessToRoomParams<T = unknown> {
  message: string;
  data?: T;
  eventName: string;
  room: string;
  namespace: WsNamespace;
}

/** Params for broadcasting a success WS message to every client in a namespace. */
export interface BroadcastParams<T = unknown> {
  message: string;
  data?: T;
  eventName: string;
  namespace: WsEmitter;
}

/** Params for sending an error WS message. */
export interface ErrorParams {
  error: Error;
  client: WsEmitter;
  eventName: string;
}
