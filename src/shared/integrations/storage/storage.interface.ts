export interface UploadFileOptions {
  key: string;
  buffer: Buffer;
  contentType: string;
}

export interface IStorageService {
  /**
   * Upload file lên S3 / MinIO
   * @returns URL hoặc key của file đã upload
   */
  uploadFile(options: UploadFileOptions): Promise<string>;

  /**
   * Tạo Presigned URL để client có thể download hoặc upload trực tiếp
   */
  getPresignedUrl(key: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Xóa file khỏi storage
   */
  deleteFile(key: string): Promise<void>;
}

export const STORAGE_SERVICE = 'STORAGE_SERVICE';
