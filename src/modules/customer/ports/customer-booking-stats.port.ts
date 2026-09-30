import type { EntityManager } from 'typeorm';

export interface CustomerBookingStats {
  /** Tổng số booking đã tạo */
  total: number;
  /** Số booking đang chờ (pending) */
  pending: number;
  /** Số booking đã hoàn tất */
  completed: number;
  /** Tổng tiền đã thanh toán (VND) */
  total_spent_vnd: number;
}

export abstract class CustomerBookingStatsPort {
  abstract statsForCustomer(
    manager: EntityManager,
    customerId: string,
  ): Promise<CustomerBookingStats>;
}
