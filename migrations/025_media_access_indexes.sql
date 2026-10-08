-- Support point lookups for media referenced by portfolio and delivery JSONB arrays.
CREATE INDEX portfolios_cover_media_id_idx
  ON portfolios (cover_media_id)
  WHERE cover_media_id IS NOT NULL;

CREATE INDEX portfolios_items_gin_idx
  ON portfolios USING GIN (items jsonb_path_ops);

CREATE INDEX booking_deliveries_media_ids_gin_idx
  ON booking_deliveries USING GIN (media_ids jsonb_path_ops);
