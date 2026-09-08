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
   */
  error({ client, error, eventName }: ErrorParams): void {
    client.emit(eventName, {
      success: false,
      message: error?.message ?? 'Unknown error',
      error: error?.name ?? 'Error',
    });
  }
}
