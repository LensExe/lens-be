type S3ErrorShape = {
  name?: string;
  Code?: string;
  code?: string;
  $metadata?: {
    httpStatusCode?: number;
  };
};

/**
 * Map an S3 error to the appropriate HTTP status code.
 *
 * @param error Caught error to convert or log.
 * @returns Result of the operation described above.
 */
export function getS3HttpStatus(error: unknown): number | undefined {
  return (error as S3ErrorShape | null | undefined)?.$metadata?.httpStatusCode;
}

/**
 * Check whether an S3 error indicates that an object does not exist.
 *
 * @param error Caught error to convert or log.
 * @returns Result of the operation described above.
 */
export function isS3NotFound(error: unknown): boolean {
  const candidate = error as S3ErrorShape | null | undefined;
  return (
    candidate?.name === 'NoSuchKey' ||
    candidate?.name === 'NoSuchBucket' ||
    candidate?.name === 'NoSuchObject' ||
    candidate?.name === 'NotFound' ||
    candidate?.Code === 'NoSuchKey' ||
    candidate?.Code === 'NoSuchBucket' ||
    candidate?.Code === 'NoSuchObject' ||
    candidate?.code === 'NoSuchKey' ||
    candidate?.code === 'NoSuchBucket' ||
    candidate?.code === 'NoSuchObject' ||
    getS3HttpStatus(error) === 404
  );
}
