import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { DomainError, ensure } from '@shared/platform/exceptions/domain.error';

export interface PayoutDestination {
  bank_code: string;
  account_number: string;
  account_name: string;
}

const algorithm = 'aes-256-gcm';

/**
 * Load and validate the key used to encrypt payout details.
 *
 * @returns Result returned by `digest`.
 */
function encryptionKey() {
  const secret = process.env.PAYOUT_DESTINATION_ENCRYPTION_KEY;
  if (!secret || secret.length < 32)
    throw new DomainError(
      'unavailable',
      'PAYOUT_DESTINATION_ENCRYPTION_KEY must contain at least 32 characters',
    );
  return createHash('sha256').update(secret).digest();
}

/**
 * Encrypt payout account details before storing them.
 *
 * @param destination Payout destination, of type `PayoutDestination`.
 * @returns Result returned by `join`.
 */
export function encryptPayoutDestination(destination: PayoutDestination) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(destination), 'utf8'),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((part) => part.toString('base64url'))
    .join('.');
}

/**
 * Decrypt stored payout account details.
 *
 * @param value Value used by the operation: value.
 * @returns Result returned by `parse`.
 * @throws {DomainError} Thrown when input is invalid or a business condition is not met.
 */
export function decryptPayoutDestination(value: string | null | undefined) {
  if (!value) return null;
  const [encodedIv, encodedTag, encodedBody] = value.split('.');
  ensure(
    encodedIv && encodedTag && encodedBody,
    'Invalid encrypted payout destination',
  );
  const decipher = createDecipheriv(
    algorithm,
    encryptionKey(),
    Buffer.from(encodedIv, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(encodedTag, 'base64url'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encodedBody, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
  return JSON.parse(plaintext) as PayoutDestination;
}
