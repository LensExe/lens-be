export abstract class MediaProcessingQueue {
  abstract enqueueVariants(mediaId: string): Promise<void>;
}
