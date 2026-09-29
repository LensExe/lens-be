type S3ErrorShape = {
  name?: string;
  Code?: string;
  code?: string;
  $metadata?: {
    httpStatusCode?: number;
  };
};

export function getS3HttpStatus(error: unknown): number | undefined {
  return (error as S3ErrorShape | null | undefined)?.$metadata?.httpStatusCode;
}

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
