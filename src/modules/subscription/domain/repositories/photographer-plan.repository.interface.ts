import { PhotographerPlanDomainEntity } from '../entities/photographer-plan.domain-entity';

export const PHOTOGRAPHER_PLAN_REPOSITORY = Symbol(
  'PHOTOGRAPHER_PLAN_REPOSITORY',
);

export interface IPhotographerPlanRepository {
  findById(id: string): Promise<PhotographerPlanDomainEntity | null>;
  findByCode(code: string): Promise<PhotographerPlanDomainEntity | null>;
  findAll(): Promise<PhotographerPlanDomainEntity[]>;
  save(
    plan: PhotographerPlanDomainEntity,
  ): Promise<PhotographerPlanDomainEntity>;
  delete(id: string): Promise<void>;
}
