import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import {
  UnitOfWork,
  type Actor,
} from '@shared/database/unit-of-work/unit-of-work.port';
import type * as Inputs from '@shared/contracts/contracts';
import { PaymentUseCases } from '../payments';
export class PaymentAdminQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PaymentAdminQueryInput,
  ) {}
}
@QueryHandler(PaymentAdminQuery)
export class PaymentAdminQueryHandler implements IQueryHandler<PaymentAdminQuery> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: PaymentUseCases,
  ) {}
  execute(message: PaymentAdminQuery) {
    return this.uow.read((s) =>
      this.useCases.admin(s, message.actor, message.input),
    );
  }
}

export class PaymentHistoryQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PaymentHistoryQueryInput,
  ) {}
}
@QueryHandler(PaymentHistoryQuery)
export class PaymentHistoryQueryHandler implements IQueryHandler<PaymentHistoryQuery> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: PaymentUseCases,
  ) {}
  execute(message: PaymentHistoryQuery) {
    return this.uow.read((s) =>
      this.useCases.history(s, message.actor, message.input),
    );
  }
}

export class PaymentQrQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PaymentQrQueryInput,
  ) {}
}
@QueryHandler(PaymentQrQuery)
export class PaymentQrQueryHandler implements IQueryHandler<PaymentQrQuery> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: PaymentUseCases,
  ) {}
  execute(message: PaymentQrQuery) {
    return this.uow.read((s) =>
      this.useCases.qr(s, message.actor, message.input),
    );
  }
}

export class PaymentRefundsQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PaymentRefundsQueryInput,
  ) {}
}
@QueryHandler(PaymentRefundsQuery)
export class PaymentRefundsQueryHandler implements IQueryHandler<PaymentRefundsQuery> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: PaymentUseCases,
  ) {}
  execute(message: PaymentRefundsQuery) {
    return this.uow.read((s) =>
      this.useCases.refunds(s, message.actor, message.input),
    );
  }
}

export class PaymentGetQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PaymentGetQueryInput,
  ) {}
}
@QueryHandler(PaymentGetQuery)
export class PaymentGetQueryHandler implements IQueryHandler<PaymentGetQuery> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: PaymentUseCases,
  ) {}
  execute(message: PaymentGetQuery) {
    return this.uow.read((s) =>
      this.useCases.get(s, message.actor, message.input),
    );
  }
}
