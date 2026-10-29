import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { EntitySchemas } from '@shared/database';
import { currentUser, role } from '@shared/common/access';
import type { Actor } from '@shared/platform/auth/actor';
import type * as Inputs from '@shared/contracts/contracts';
import { Subscription } from '@modules/subscription/subscription.domain';

/** Admin dashboard read model, kept separate from report case processing. */
@Injectable()
export class ModerationDashboardUseCases {
  /** Summarize platform counts and paid volume for the admin dashboard. */
  async dashboard(s: EntityManager, a: Actor) {
    role(a, 'admin');
    await currentUser(s, a);

    const users = await s.count(EntitySchemas.users);
    const bookings = await s.count(EntitySchemas.bookings);
    const photographers = await s.count(EntitySchemas.photographers);
    const openReports = await s.countBy(EntitySchemas.reports, {
      status: 'open',
    });
    const paidVolume = await s
      .createQueryBuilder()
      .select('COALESCE(SUM(transaction.amount), 0)', 'paid_volume_vnd')
      .from(EntitySchemas.transactions, 'transaction')
      .where('transaction.status = :status', { status: 'paid' })
      .getRawOne<{ paid_volume_vnd: string | number }>();

    return {
      users,
      bookings,
      photographers,
      open_reports: openReports,
      paid_volume_vnd: Number(paidVolume?.paid_volume_vnd ?? 0),
    };
  }

  /** Queue counts used by the admin sidebar and overview. */
  async adminQueue(s: EntityManager, a: Actor) {
    role(a, 'admin');
    await currentUser(s, a);
    const [pendingApplications, suspendedUsers, withdrawals] =
      await Promise.all([
        s.countBy(EntitySchemas.photographers, {
          verification_status: 'pending',
        }),
        s.countBy(EntitySchemas.users, { status: 'suspended' }),
        s
          .createQueryBuilder(EntitySchemas.refund_requests, 'request')
          .select('COUNT(*)', 'count')
          .addSelect('COALESCE(SUM(request.amount), 0)', 'amount')
          .where('request.request_type = :type', { type: 'wallet_withdrawal' })
          .andWhere('request.status = :status', { status: 'requested' })
          .getRawOne<{ count: string; amount: string }>(),
      ]);
    const storage = await this.storageRows(s);
    return {
      pendingApplications,
      pendingWithdrawals: Number(withdrawals?.count ?? 0),
      pendingWithdrawalTotal: Number(withdrawals?.amount ?? 0),
      overQuota: storage.overQuotaCount,
      suspendedUsers,
    };
  }

  /** Storage report for all photographer accounts. */
  async adminStorage(
    s: EntityManager,
    a: Actor,
    input: Inputs.AdminStorageQueryInput,
  ) {
    role(a, 'admin');
    await currentUser(s, a);
    const limit = input.limit ?? 20;
    const offset = input.offset ?? 0;
    const report = await this.storageRows(s);
    const filtered =
      input.over_quota === undefined
        ? report.rows
        : report.rows.filter((row) => row.overQuota === input.over_quota);
    return {
      overview: {
        totalUsedBytes: report.totalUsedBytes,
        overQuotaCount: report.overQuotaCount,
        planBreakdown: report.planBreakdown,
      },
      rows: filtered.slice(offset, offset + limit),
      total: filtered.length,
      offset,
      limit,
    };
  }

  /** Wallet and withdrawal totals for the admin finance overview. */
  async adminFinanceSummary(s: EntityManager, a: Actor) {
    role(a, 'admin');
    await currentUser(s, a);
    const [wallets, withdrawals] = await Promise.all([
      s
        .createQueryBuilder(EntitySchemas.wallets, 'wallet')
        .select(
          'COALESCE(SUM(wallet.balance + wallet.frozen_balance), 0)',
          'wallet_reserve',
        )
        .getRawOne<{ wallet_reserve: string }>(),
      s
        .createQueryBuilder(EntitySchemas.refund_requests, 'request')
        .select('COUNT(*)', 'count')
        .addSelect('COALESCE(SUM(request.amount), 0)', 'amount')
        .where('request.request_type = :type', { type: 'wallet_withdrawal' })
        .andWhere('request.status = :status', { status: 'requested' })
        .getRawOne<{ count: string; amount: string }>(),
    ]);
    return {
      walletReserve: Number(wallets?.wallet_reserve ?? 0),
      pendingWithdrawalTotal: Number(withdrawals?.amount ?? 0),
      pendingCount: Number(withdrawals?.count ?? 0),
    };
  }

  private async storageRows(s: EntityManager) {
    const photographers = await s
      .createQueryBuilder(EntitySchemas.photographers, 'photographer')
      .innerJoin(EntitySchemas.users, 'user', 'user.id = photographer.user_id')
      .select('photographer.id', 'photographer_id')
      .addSelect('photographer.user_id', 'user_id')
      .addSelect('user.fullname', 'name')
      .addSelect('user.email', 'email')
      .addSelect('user.avatar_url', 'avatar')
      .getRawMany<{
        photographer_id: string;
        user_id: string;
        name: string;
        email: string;
        avatar: string | null;
      }>();
    const userIds = photographers.map((photographer) => photographer.user_id);
    const photographerIds = photographers.map(
      (photographer) => photographer.photographer_id,
    );
    if (!photographers.length)
      return {
        rows: [],
        totalUsedBytes: 0,
        overQuotaCount: 0,
        planBreakdown: { free: 0, pro: 0, studio: 0 } as Record<string, number>,
      };

    const now = new Date().toISOString();
    const [mediaRows, portfolioRows, subscriptions] = await Promise.all([
      s
        .createQueryBuilder(EntitySchemas.media, 'media')
        .select('media.user_id', 'user_id')
        .addSelect(
          "COALESCE(SUM(CASE WHEN media.status <> 'deleted' AND media.status <> 'pending' THEN media.file_size ELSE 0 END), 0)",
          'storage_bytes',
        )
        .addSelect(
          "COALESCE(SUM(CASE WHEN media.status = 'pending' AND media.upload_expires_at > :now THEN media.file_size ELSE 0 END), 0)",
          'reserved_storage_bytes',
        )
        .addSelect(
          "COALESCE(SUM(CASE WHEN media.status <> 'deleted' AND (media.status <> 'pending' OR media.upload_expires_at > :now) THEN media.file_size ELSE 0 END), 0)",
          'total_bytes',
        )
        .where('media.user_id IN (:...userIds)', { userIds })
        .setParameter('now', now)
        .groupBy('media.user_id')
        .getRawMany<{ user_id: string; total_bytes: string }>(),
      s
        .createQueryBuilder(EntitySchemas.portfolios, 'portfolio')
        .select('portfolio.photographer_id', 'photographer_id')
        .addSelect('COUNT(*)', 'count')
        .where('portfolio.photographer_id IN (:...photographerIds)', {
          photographerIds,
        })
        .groupBy('portfolio.photographer_id')
        .getRawMany<{ photographer_id: string; count: string }>(),
      s
        .createQueryBuilder(EntitySchemas.subscriptions, 'subscription')
        .where('subscription.photographer_id IN (:...photographerIds)', {
          photographerIds,
        })
        .orderBy('subscription.created_at', 'DESC')
        .addOrderBy('subscription.id', 'ASC')
        .getMany(),
    ]);
    const bytesByUser = new Map(
      mediaRows.map((row) => [row.user_id, Number(row.total_bytes)]),
    );
    const portfoliosByPhotographer = new Map(
      portfolioRows.map((row) => [row.photographer_id, Number(row.count)]),
    );
    const subscriptionByPhotographer = new Map<
      string,
      (typeof subscriptions)[number]
    >();
    for (const subscription of subscriptions) {
      if (!subscriptionByPhotographer.has(subscription.photographer_id))
        subscriptionByPhotographer.set(
          subscription.photographer_id,
          subscription,
        );
    }

    const planBreakdown: Record<string, number> = {
      free: 0,
      pro: 0,
      studio: 0,
    };
    const rows = photographers.map((photographer) => {
      const subscription = subscriptionByPhotographer.get(
        photographer.photographer_id,
      );
      const activeSubscription =
        subscription?.status === 'active' &&
        Date.parse(subscription.end_at) > Date.parse(now);
      const snapshot = (
        activeSubscription ? subscription?.plan_snapshot : undefined
      ) as { code?: string; features?: unknown[] } | undefined;
      const planCode = snapshot?.code?.toLowerCase() ?? 'free';
      const plan = planCode.includes('studio')
        ? 'studio'
        : planCode.includes('pro')
          ? 'pro'
          : 'free';
      const features = Array.isArray(snapshot?.features)
        ? snapshot.features
        : [];
      let quotaBytes: number | null = null;
      try {
        quotaBytes = activeSubscription
          ? Subscription.storageLimitBytes(features)
          : null;
      } catch {
        quotaBytes = null;
      }
      const usedBytes = bytesByUser.get(photographer.user_id) ?? 0;
      const overQuota = quotaBytes !== null && usedBytes > quotaBytes;
      planBreakdown[plan] = (planBreakdown[plan] ?? 0) + 1;
      return {
        photographerId: photographer.photographer_id,
        userId: photographer.user_id,
        name: photographer.name,
        email: photographer.email,
        avatar: photographer.avatar ?? '',
        plan,
        planCode,
        usedBytes,
        quotaBytes,
        galleryCount:
          portfoliosByPhotographer.get(photographer.photographer_id) ?? 0,
        overQuota,
      };
    });
    return {
      rows: rows.sort((left, right) => right.usedBytes - left.usedBytes),
      totalUsedBytes: rows.reduce((sum, row) => sum + row.usedBytes, 0),
      overQuotaCount: rows.filter((row) => row.overQuota).length,
      planBreakdown,
    };
  }
}
