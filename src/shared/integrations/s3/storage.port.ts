export interface PresignedUploadUrl {
  url: string;
  expiresIn: number;
}

export abstract class ObjectStorage {
  /**
   * Create a signed upload URL after validating the file type and size.
   *
   * @param key Key used by the operation.
   * @param type Type of object or operation.
   * @param size File size.
   * @returns Result of the operation described above.
   */
  abstract uploadUrl(
    key: string,
    type: string,
    size: number,
  ): Promise<PresignedUploadUrl>;

  /**
   * Check whether the input is valid for the current state.
   *
   * @param key Key used by the operation.
   * @param type Type of object or operation.
   * @param size File size.
   * @returns Result of the operation described above.
   */
  abstract verify(key: string, type: string, size: number): Promise<void>;

  /**
   * Create an S3 object read URL for the specified visibility scope.
   *
   * @param key Key used by the operation.
   * @param visibility Value used by the operation: visibility.
   * @returns Result of the operation described above.
   */
  abstract getUrl(
    key: string,
    visibility: 'public' | 'private',
  ): Promise<string>;

  /**
   * Create a time-limited download URL for a stored object.
   *
   * @param key Key used by the operation.
   * @returns Result of the operation described above.
   */
  abstract downloadUrl(key: string): Promise<string>;

  /**
   * Build a public URL for an S3 object from its storage key.
   *
   * @param key Key used by the operation.
   * @returns Result of the operation described above.
   */
  abstract buildPublicObjectUrl(key: string): string;

  /**
   * Delete an S3 object after checking permissions and deletion requirements.
   *
   * @param key Key used by the operation.
   * @returns Result of the operation described above.
   */
  abstract delete(key: string): Promise<void>;

  /**
   * Delete multiple objects from storage.
   *
   * @param keys List of keys to process.
   * @returns Result of the operation described above.
   */
  abstract deleteMany(keys: string[]): Promise<void>;
}
