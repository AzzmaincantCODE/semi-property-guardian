-- Patch script for property_card_entries references
-- Adds related_slip_id and related_transfer_id columns when missing,
-- along with helpful indexes. Safe to run multiple times.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'property_card_entries'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'property_card_entries'
        AND column_name = 'related_slip_id'
    ) THEN
      EXECUTE 'ALTER TABLE public.property_card_entries ADD COLUMN related_slip_id UUID REFERENCES public.custodian_slips(id)';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'property_card_entries'
        AND column_name = 'related_transfer_id'
    ) THEN
      EXECUTE 'ALTER TABLE public.property_card_entries ADD COLUMN related_transfer_id UUID REFERENCES public.property_transfers(id)';
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_property_card_entries_related_slip_id
  ON public.property_card_entries(related_slip_id);

CREATE INDEX IF NOT EXISTS idx_property_card_entries_related_transfer_id
  ON public.property_card_entries(related_transfer_id);

COMMENT ON COLUMN public.property_card_entries.related_slip_id IS 'Links entry to the custodian slip that created the issuance';
COMMENT ON COLUMN public.property_card_entries.related_transfer_id IS 'Links entry to the property transfer that created the issuance';

SELECT 'property_card_entries patch complete' AS status;

