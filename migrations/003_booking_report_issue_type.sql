ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS booking_issue_type text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reports_booking_issue_type_check'
  ) THEN
    ALTER TABLE reports
      ADD CONSTRAINT reports_booking_issue_type_check
      CHECK (
        booking_issue_type IS NULL OR booking_issue_type IN (
          'photo_quality',
          'missing_deliverables',
          'late_delivery',
          'photographer_conduct',
          'booking_mismatch',
          'payment_refund',
          'other'
        )
      );
  END IF;
END $$;
