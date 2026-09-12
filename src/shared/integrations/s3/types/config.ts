export interface S3ProviderConfig {
  accessKeyId?: string;
  bucket?: string;
  endpoint?: string;
  forcePathStyle: boolean;
  presignedUrlTtlSeconds: number;
  publicEndpoint?: string;
  region: string;
  secretAccessKey?: string;
}
