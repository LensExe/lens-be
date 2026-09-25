export type RankListQueryInput = Record<string, never>;

export interface RankUpdateCommandInput {
  code: string;
  name?: string;
  min_completed?: number;
  commission_percent?: number;
}
