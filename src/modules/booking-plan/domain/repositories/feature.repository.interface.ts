import { FeatureDomainEntity } from '../entities/feature.domain-entity';

export const FEATURE_REPOSITORY = Symbol('FEATURE_REPOSITORY');

export interface IFeatureRepository {
  findById(id: string): Promise<FeatureDomainEntity | null>;
  findByPlanId(planId: string): Promise<FeatureDomainEntity[]>;
  save(feature: FeatureDomainEntity): Promise<FeatureDomainEntity>;
  delete(id: string): Promise<void>;
}
