import { RatingDomainEntity } from '../entities/rating.domain-entity';

export const RATING_REPOSITORY = Symbol('RATING_REPOSITORY');

export interface IRatingRepository {
  findById(id: string): Promise<RatingDomainEntity | null>;
  findByPhotographerId(
    photographerId: string,
  ): Promise<RatingDomainEntity | null>;
  save(rating: RatingDomainEntity): Promise<RatingDomainEntity>;
}
