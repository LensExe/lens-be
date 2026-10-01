export interface S3ProviderConfig {
  /**
   * Access key (public ID or username) used to identify the account to S3.
   * Cloud providers may omit this so the AWS SDK can use an IAM role or the default credential chain.
   */
  accessKeyId?: string;

  /**
   * Name of the S3 bucket used to store files.
   */
  bucket?: string;

  /**
   * S3 server URL used by the backend to connect through an internal endpoint (for example, `http://minio:9000` or a cloud S3 endpoint).
   */
  endpoint?: string;

  /**
   * URL addressing style:
   * - `true`: Path-style (`https://endpoint/bucket/key`), required for MinIO.
   * - `false`: Virtual-hosted style (`https://bucket.endpoint/key`), standard for cloud S3/AWS.
   */
  forcePathStyle: boolean;

  /**
   * Lifetime in seconds for a presigned upload or download URL before it expires.
   */
  presignedUrlTtlSeconds: number;

  /**
   * Public URL external users (browser or mobile apps) can access when generating presigned URLs.
   */
  publicEndpoint?: string;

  /**
   * AWS region of the data center storing the S3 objects (for example, `us-east-1` or `ap-southeast-1`).
   */
  region: string;

  /**
   * Secret access key or password used to sign requests.
   * Cloud providers may omit this so the AWS SDK can use an IAM role or the default credential chain.
   */
  secretAccessKey?: string;
}
