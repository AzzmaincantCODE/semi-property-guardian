-- Make department code optional and keep uniqueness for non-null values
-- Run this in Supabase SQL Editor

-- 1) Drop existing unique constraint if it forces non-null unique
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'departments_code_key'
  ) THEN
    ALTER TABLE public.departments DROP CONSTRAINT departments_code_key;
  END IF;
END $$;

-- 2) Allow code to be nullable
ALTER TABLE public.departments ALTER COLUMN code DROP NOT NULL;

-- 3) Recreate a partial unique index to enforce uniqueness only for non-null codes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = 'uniq_departments_code_not_null'
  ) THEN
    CREATE UNIQUE INDEX uniq_departments_code_not_null ON public.departments(code) WHERE code IS NOT NULL;
  END IF;
END $$;

-- 4) Optional: ensure is_active defaults exist
ALTER TABLE public.departments ALTER COLUMN is_active SET DEFAULT true;

-- Done
SELECT 'Departments.code is now optional with uniqueness enforced only when provided.' AS status;
