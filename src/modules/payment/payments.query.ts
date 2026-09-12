import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/contracts';
import { PaymentUseCases } from './payment.use-case';

export class PaymentAdminQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PaymentAdminQueryInput,
  ) {}
}
@QueryHandler(PaymentAdminQuery)
export class PaymentAdminQueryHandler implements IQueryHandler<PaymentAdminQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: PaymentUseCases,
  ) {}
  execute(message: PaymentAdminQuery) {
    return this.dataSource.transaction((s) =>
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
    private readonly dataSource: DataSource,
    private readonly useCases: PaymentUseCases,
  ) {}
  execute(message: PaymentHistoryQuery) {
    return this.dataSource.transaction((s) =>
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
    private readonly dataSource: DataSource,
    private readonly useCases: PaymentUseCases,
  ) {}
  execute(message: PaymentQrQuery) {
    return this.dataSource.transaction((s) =>
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
    private readonly dataSource: DataSource,
    private readonly useCases: PaymentUseCases,
  ) {}
  execute(message: PaymentRefundsQuery) {
    return this.dataSource.transaction((s) =>
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
    private readonly dataSource: DataSource,
    private readonly useCases: PaymentUseCases,
  ) {}
  execute(message: PaymentGetQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.get(s, message.actor, message.input),
    );
  }
}
