export abstract class ObjectStorage {
  abstract uploadUrl(key: string, type: string, size: number): Promise<string>;

  abstract verify(key: string, type: string, size: number): Promise<void>;

  abstract getUrl(
    key: string,
    visibility: 'public' | 'private',
  ): Promise<string>;

  abstract downloadUrl(key: string): Promise<string>;

  abstract buildPublicObjectUrl(key: string): string;

  abstract delete(key: string): Promise<void>;

  abstract deleteMany(keys: string[]): Promise<void>;
}
