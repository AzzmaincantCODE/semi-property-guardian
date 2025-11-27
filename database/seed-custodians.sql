-- ============================================================================
-- CUSTODIANS TABLE SETUP
-- ============================================================================
-- This script creates the custodians table structure
-- Custodians will be added manually through the Lookups page UI
-- Run this in Supabase SQL Editor to set up the custodians table
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CREATE CUSTODIANS TABLE (if it doesn't exist)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.custodians (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    custodian_no TEXT UNIQUE,
    name TEXT NOT NULL,
    position TEXT,
    department_id UUID REFERENCES public.departments(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CREATE FUNCTION TO AUTO-GENERATE CUSTODIAN NUMBERS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generate_custodian_no() RETURNS TRIGGER AS $$
DECLARE
  next_num INT;
BEGIN
  -- If custodian_no is already provided, use it
  IF NEW.custodian_no IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Extract numeric suffix from existing custodian numbers and compute next
  SELECT COALESCE(MAX((REGEXP_REPLACE(custodian_no, '^CUST-', ''))::INT), 0) + 1
  INTO next_num
  FROM public.custodians
  WHERE custodian_no ~ '^CUST-\\d+$';

  -- Format as CUST-000001, CUST-000002, etc.
  NEW.custodian_no := 'CUST-' || LPAD(next_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CREATE TRIGGER FOR AUTO-GENERATION
-- ============================================================================
DROP TRIGGER IF EXISTS trg_generate_custodian_no ON public.custodians;
CREATE TRIGGER trg_generate_custodian_no
BEFORE INSERT ON public.custodians
FOR EACH ROW EXECUTE FUNCTION public.generate_custodian_no();

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.custodians ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE RLS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS custodian_select_all ON public.custodians;
DROP POLICY IF EXISTS custodian_insert_all ON public.custodians;
DROP POLICY IF EXISTS custodian_update_all ON public.custodians;
DROP POLICY IF EXISTS custodian_delete_all ON public.custodians;

CREATE POLICY custodian_select_all ON public.custodians FOR SELECT USING (true);
CREATE POLICY custodian_insert_all ON public.custodians FOR INSERT WITH CHECK (true);
CREATE POLICY custodian_update_all ON public.custodians FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY custodian_delete_all ON public.custodians FOR DELETE USING (true);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Verify the custodians table was created successfully
SELECT 
    'Custodians table created successfully' as status,
    COUNT(*) as existing_custodians
FROM public.custodians;

-- Show table structure info
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'custodians'
ORDER BY ordinal_position;

