export interface PortfolioCreateCommandInput {
  name: string;
  category?: string;
  description?: string;
  cover_media_id?: string;
}

export interface PortfolioReorderCommandInput {
  id: string;
  item_ids: string[];
}

export interface PortfolioListQueryInput {
  id: string;
  limit?: number;
  offset?: number;
}

export interface PortfolioAddCommandInput {
  id: string;
  media_id: string;
}

export interface PortfolioGetQueryInput {
  id: string;
}

export interface PortfolioUpdateCommandInput {
  id: string;
  name?: string;
  category?: string;
  description?: string;
  cover_media_id?: string;
}

export interface PortfolioRemoveCommandInput {
  id: string;
}

export interface PortfolioRemoveItemCommandInput {
  id: string;
  itemId: string;
}
