import { VerificationStatus } from '@shared/domain/values/photographer.values';
import { ensure } from '@shared/domain/domain.error';
import {
  isPhotographyStyle,
  type PhotographyStyle,
} from '@shared/domain/values/photography-style.values';

/**
 * Photographer profile review flow: an authenticated applicant submits a profile, which enters `pending`; an admin approves it as `verified` or rejects it as `rejected`.
 */
export class PhotographerApplication {
  /**
   * Check whether an applicant may submit or resubmit an application to become a photographer.
   *
   * @param current Existing user profile status; `undefined` if no application has been submitted.
   * @returns Returns no value; throws `conflict` (HTTP 409) if the profile is pending review or already approved.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
   */
  static assertCanSubmit(current: VerificationStatus | undefined) {
    ensure(
      current !== VerificationStatus.PENDING,
      'Photographer application is pending review',
      'conflict',
    );
    ensure(
      current !== VerificationStatus.VERIFIED,
      'User is already a verified photographer',
      'conflict',
    );
  }

  /**
   * An admin cannot approve or reject their own photographer application.
   *
   * @param applicantUserId User ID of the applicant.
   * @param reviewerUserId User ID of the admin reviewer.
   * @returns Returns no value; throws HTTP 403 if the applicant and reviewer are the same person.
   * @throws {DomainError} Thrown when the actor is not authorized.
   */
  static assertNotOwnApplication(
    applicantUserId: string,
    reviewerUserId: string,
  ) {
    ensure(
      applicantUserId !== reviewerUserId,
      'Cannot review your own application',
      'forbidden',
    );
  }

  /**
   * Check whether an admin may review an application. Only `pending` applications can be processed.
   *
   * @param current Current profile status.
   * @returns Returns no value; throws `conflict` (HTTP 409) if the profile is not pending.
   * @throws {DomainError} Thrown when the current state or data conflicts with the operation.
   */
  static assertReviewable(current: VerificationStatus) {
    ensure(
      current === VerificationStatus.PENDING,
      `Cannot review photographer application in ${current}`,
      'conflict',
    );
  }
}

/** Rules for editing a photographer profile after submission. */
export class PhotographerProfile {
  static readonly MAX_STYLES = 200;

  /**
   * Normalize and validate styles before saving them to the photographer profile.
   *
   * @param styles Photography styles to process.
   * @returns Processed normalized value.
   * @throws {DomainError} Thrown when input is invalid, a business condition is not met, or the current state or data conflicts with the operation.
   */
  static normalizeStyles(styles: string[]): PhotographyStyle[] {
    ensure(
      styles.length <= PhotographerProfile.MAX_STYLES,
      `Maximum ${PhotographerProfile.MAX_STYLES} styles allowed`,
      'conflict',
    );

    const normalized = styles.map((style) => style.trim().toLowerCase());
    ensure(
      normalized.every(Boolean),
      'Photographer styles must not be empty',
      'invalid',
    );
    ensure(
      normalized.every(isPhotographyStyle),
      'Unsupported photography style',
      'invalid',
    );
    ensure(
      new Set(normalized).size === normalized.length,
      'Photographer styles must be unique',
      'invalid',
    );

    return normalized;
  }

  /**
   * The tax ID is locked after profile approval because it affects taxes and photographer payouts; changes must go through an admin.
   * Descriptions, styles, and service areas remain editable.
   *
   * @param status Current verification status.
   * @param current Tax ID currently stored.
   * @param next Submitted tax ID; `undefined` if unchanged.
   * @returns Returns no value; throws HTTP 400 if the tax ID changes after approval.
   * @throws {DomainError} Thrown when input is invalid or a business condition is not met.
   */
  static assertTaxCodeEditable(
    status: VerificationStatus,
    current: string | null,
    next: string | undefined,
  ) {
    ensure(
      status !== VerificationStatus.VERIFIED ||
        next === undefined ||
        next === current,
      'Tax code cannot be changed after approval; contact support',
    );
  }
}
