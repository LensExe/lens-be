import { Injectable } from '@nestjs/common';
import type {
  SuccessParams,
  SuccessToRoomParams,
  BroadcastParams,
  ErrorParams,
} from './types/response';

/**
 * Standard WebSocket response service providing unified message emit formats across gateways.
 */
@Injectable()
export class WsResponseService {
  /**
   * Emits a standardized success message to a specific room.
   *
   * @param param Object containing the Socket.IO response message, destination, and event name (`message`, `data`, `room`, `namespace`, `eventName`).
   * @returns No value is returned.
   */
  successToRoom<T = unknown>({
    message,
    data,
    room,
    namespace,
    eventName,
  }: SuccessToRoomParams<T>): void {
    namespace.to(room).emit(eventName, {
      success: true,
      message,
      data,
    });
  }

  /**
   * Broadcasts a standardized success message to all sockets in a namespace.
   *
   * @param param Object containing the Socket.IO response message, destination, and event name (`message`, `data`, `namespace`, `eventName`).
   * @returns No value is returned.
   */
  broadcast<T = unknown>({
    message,
    data,
    namespace,
    eventName,
  }: BroadcastParams<T>): void {
    namespace.emit(eventName, {
      success: true,
      message,
      data,
    });
  }

  /**
   * Emits a standardized success message directly to a single socket.
   *
   * @param param Input object containing the fields message, data, client, eventName cho success.
   * @returns No value is returned.
   */
  success<T = unknown>({
    message,
    data,
    client,
    eventName,
  }: SuccessParams<T>): void {
    client.emit(eventName, {
      success: true,
      message,
      data,
    });
  }

  /**
   * Emits a standardized error message directly to a single socket.
   *
   * @param param Input object containing the fields client, error, eventName cho error.
   * @returns No value is returned.
   */
  error({ client, error, eventName }: ErrorParams): void {
    client.emit(eventName, {
      success: false,
      message: error?.message ?? 'Unknown error',
      error: error?.name ?? 'Error',
    });
  }
}
