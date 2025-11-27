DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'property_card_entries'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'property_card_entries'
          AND column_name = 'remarks'
    ) THEN
        EXECUTE 'ALTER TABLE public.property_card_entries ADD COLUMN remarks TEXT';
        RAISE NOTICE 'Added remarks column to property_card_entries';
    ELSE
        RAISE NOTICE 'remarks column already exists on property_card_entries';
    END IF;
END $$;

COMMENT ON COLUMN public.property_card_entries.remarks IS 'Additional notes shown on Annex and ICS forms';

