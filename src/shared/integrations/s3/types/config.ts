export interface S3ProviderConfig {
  /**
   * Khóa truy cập (Public ID / Username) dùng để định danh tài khoản với S3.
   */
  accessKeyId?: string;

  /**
   * Tên thùng chứa (Bucket) lưu trữ các file trên S3.
   */
  bucket?: string;

  /**
   * URL máy chủ S3 cho backend kết nối nội bộ (vd: http://minio:9000 hoặc endpoint của Cloud S3).
   */
  endpoint?: string;

  /**
   * Định dạng đường dẫn URL:
   * - true: Path-Style (https://endpoint/bucket/key) - bắt buộc cho MinIO.
   * - false: Virtual-Hosted-Style (https://bucket.endpoint/key) - chuẩn cho Cloud S3 / AWS.
   */
  forcePathStyle: boolean;

  /**
   * Thời gian sống (giây) của link Presigned URL tải/upload trước khi bị vô hiệu hóa.
   */
  presignedUrlTtlSeconds: number;

  /**
   * URL công khai cho người dùng bên ngoài (trình duyệt, mobile app) truy cập khi tạo Presigned URL.
   */
  publicEndpoint?: string;

  /**
   * Vùng địa lý của Data Center lưu trữ S3 (ví dụ: us-east-1, ap-southeast-1).
   */
  region: string;

  /**
   * Mật mã truy cập bí mật (Secret Key / Password) dùng để tạo chữ ký số xác thực request.
   */
  secretAccessKey?: string;
}
