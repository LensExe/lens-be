import { Locale } from '@modules/databases/postgresql/primary/enums/locale';
/** Payload for sending a WS message. */
export interface SocketIoPayload<T = unknown> {
  /** The data to send */
  data: T;
  /** The locale of the user */
  locale: Locale;
}
