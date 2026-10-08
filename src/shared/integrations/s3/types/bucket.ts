export interface S3BucketParams {
  bucket?: string;
}

export interface S3PublicReadParams extends S3BucketParams {
  prefixes: string[];
}
