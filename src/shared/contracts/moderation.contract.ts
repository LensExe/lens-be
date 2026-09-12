export type ModerationDashboardQueryInput = Record<string, never>;

export interface ModerationListQueryInput {
  limit?: number;
  offset?: number;
  status?: string;
  target_type?: 'user' | 'booking' | 'photographer' | 'portfolio' | 'feedback';
}

export interface ModerationMineQueryInput {
  limit?: number;
  offset?: number;
}

export interface ModerationCreateCommandInput {
  target_type: 'user' | 'booking' | 'photographer' | 'portfolio' | 'feedback';
  target_id: string;
  reason: string;
  evidence_media_ids?: string[];
}

export interface ModerationResolveCommandInput {
  id: string;
  status: 'resolved' | 'rejected' | 'escalated';
  resolution: string;
}

export interface ModerationGetQueryInput {
  id: string;
}
