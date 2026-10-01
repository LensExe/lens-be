export abstract class MediaProcessingQueue {
  /**
   * Queue the job that creates image variants for the media.
   *
   * @param mediaId Media ID to process.
   * @returns Result of the operation described above.
   */
  abstract enqueueVariants(mediaId: string): Promise<void>;
}
