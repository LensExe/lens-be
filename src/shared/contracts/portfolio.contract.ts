export interface PortfolioCreateCommandInput {
  name: string;
  category?: string;
  description?: string;
  cover_media_id?: string;
}

export interface PortfolioReorderCommandInput {
  portfolio_id: string;
  portfolio_item_ids: string[];
}

export interface PortfolioListQueryInput {
  photographer_id: string;
  limit?: number;
  offset?: number;
}

export interface PortfolioMyListQueryInput {
  limit?: number;
  offset?: number;
}

export interface PortfolioAddCommandInput {
  portfolio_id: string;
  media_id: string;
}

export interface PortfolioGetQueryInput {
  portfolio_id: string;
}

export interface PortfolioUpdateCommandInput {
  portfolio_id: string;
  name?: string;
  category?: string;
  description?: string;
  cover_media_id?: string;
}

export interface PortfolioRemoveCommandInput {
  portfolio_id: string;
}

export interface PortfolioRemoveItemCommandInput {
  portfolio_id: string;
  portfolio_item_id: string;
}
