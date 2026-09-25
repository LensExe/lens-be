export type BadgeListQueryInput = Record<string, never>;

export interface BadgeUpdateCommandInput {
  code: string;
  name?: string;
  description?: string;
  min_value?: number;
  min_reviews?: number;
  is_active?: boolean;
}
