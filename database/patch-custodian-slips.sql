-- Patch script to align custodian_slips schema with Annex UI expectations
-- Run this after migrating to a new Supabase project or whenever
-- custodian slip creation fails because of missing columns or UUID errors.

-- Drop dependent view so we can change column types safely
DROP VIEW IF EXISTS public.deletable_custodian_slips;

-- Drop constraints/views that depend on legacy column types
ALTER TABLE IF EXISTS public.custodian_slips DROP CONSTRAINT IF EXISTS custodian_slips_issued_by_fkey;
DROP VIEW IF EXISTS public.deletable_custodian_slips;

-- Convert name fields to TEXT and ensure slip_status exists
DO $$
BEGIN
  -- Ensure issued_by is TEXT (UI stores plain names/positions)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'custodian_slips'
      AND column_name = 'issued_by'
      AND data_type <> 'text'
  ) THEN
    EXECUTE 'ALTER TABLE public.custodian_slips ALTER COLUMN issued_by TYPE TEXT USING issued_by::TEXT';
  END IF;

  -- Ensure received_by is TEXT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'custodian_slips'
      AND column_name = 'received_by'
      AND data_type <> 'text'
  ) THEN
    EXECUTE 'ALTER TABLE public.custodian_slips ALTER COLUMN received_by TYPE TEXT USING received_by::TEXT';
  END IF;

  -- Ensure office is TEXT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'custodian_slips'
      AND column_name = 'office'
      AND data_type <> 'text'
  ) THEN
    EXECUTE 'ALTER TABLE public.custodian_slips ALTER COLUMN office TYPE TEXT USING office::TEXT';
  END IF;

  -- Ensure slip_status column exists with correct defaults
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'custodian_slips'
      AND column_name = 'slip_status'
  ) THEN
    EXECUTE $ddl$
      ALTER TABLE public.custodian_slips
      ADD COLUMN slip_status TEXT NOT NULL DEFAULT 'Draft'
      CHECK (slip_status IN ('Draft', 'Issued', 'Cancelled'));
    $ddl$;
  END IF;
END $$;

-- Recreate ICS number generator with optional prefix support
CREATE OR REPLACE FUNCTION public.generate_ics_number(sub_category_prefix TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  current_month TEXT;
  base_prefix TEXT;
  year_month_prefix TEXT;
  next_sequence INTEGER;
  formatted_sequence TEXT;
  generated_number TEXT;
BEGIN
  base_prefix := COALESCE(NULLIF(sub_category_prefix, ''), 'ICS');
  current_year := EXTRACT(YEAR FROM NOW())::TEXT;
  current_month := LPAD(EXTRACT(MONTH FROM NOW())::TEXT, 2, '0');
  year_month_prefix := base_prefix || '-' || current_year || '-' || current_month || '-';

  SELECT COALESCE(MAX(
    CASE 
      WHEN slip_number ~ ('^' || year_month_prefix || '[0-9]{4}$')
      THEN (REGEXP_REPLACE(slip_number, '^' || year_month_prefix, ''))::INTEGER
      ELSE 0
    END
  ), 0) + 1
  INTO next_sequence
  FROM public.custodian_slips
  WHERE slip_number LIKE (year_month_prefix || '%');

  formatted_sequence := LPAD(next_sequence::TEXT, 4, '0');
  generated_number := year_month_prefix || formatted_sequence;

  RETURN generated_number;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger to auto-set ICS numbers if needed
CREATE OR REPLACE FUNCTION public.set_ics_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slip_number IS NULL OR NEW.slip_number = '' THEN
    NEW.slip_number := public.generate_ics_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_ics_number ON public.custodian_slips;
CREATE TRIGGER trg_set_ics_number
  BEFORE INSERT ON public.custodian_slips
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ics_number();

-- Recreate view that depends on custodian_slips columns
CREATE OR REPLACE VIEW public.deletable_custodian_slips AS
SELECT cs.*
FROM public.custodian_slips cs
WHERE public.can_delete_custodian_slip(cs.id) = true;

SELECT 'Custodian slip schema patch complete' AS status;

