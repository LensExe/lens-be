import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * DTO for pagination query parameters (`page`, `limit`).
 */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  /**
   * Calculate the number of records to skip from the page and page size.
   *
   * @returns Result of the operation described above.
   */
  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}

/**
 * Pagination metadata returned to the client.
 */
export interface PaginatedMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * DTO for normalizing paginated results.
 */
export class PaginatedResultDto<T> {
  data: T[];
  meta: PaginatedMeta;

  constructor(data: T[], totalItems: number, page: number, limit: number) {
    const totalPages = Math.ceil(totalItems / limit) || 1;
    this.data = data;
    this.meta = {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }
}
