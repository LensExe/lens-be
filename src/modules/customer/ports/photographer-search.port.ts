import type { EntityManager } from 'typeorm';
import type { PhotographyStyle } from '@shared/domain/values/photography-style.values';

export interface PhotographerSearchFilter {
  styles?: PhotographyStyle[];
  location?: string;
  limit?: number;
  offset?: number;
}

export interface PhotographerSearchResult {
  items: unknown[];
  total: number;
  limit: number;
  offset: number;
}

export abstract class PhotographerSearchPort {
  abstract searchPhotographersForCustomer(
    manager: EntityManager,
    filter: PhotographerSearchFilter,
  ): Promise<PhotographerSearchResult>;
}
