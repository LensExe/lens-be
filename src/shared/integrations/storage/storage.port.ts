export abstract class ObjectStorage {
  abstract uploadUrl(key: string, type: string, size: number): Promise<string>;
  abstract verify(key: string, type: string, size: number): Promise<void>;
  abstract downloadUrl(key: string): Promise<string>;
  abstract delete(key: string): Promise<void>;
}
