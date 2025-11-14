-- Remove the problematic database function completely
-- Let the frontend handle deletion directly
-- Run this in Supabase SQL Editor

-- Step 1: Drop ALL related objects with CASCADE
DROP FUNCTION IF EXISTS public.safe_delete_custodian_slip(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.safe_delete_custodian_slip_v2(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.safe_delete_custodian_slip_v3(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_delete_custodian_slip(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.prevent_issued_slip_deletion() CASCADE;
DROP TRIGGER IF EXISTS trg_prevent_issued_slip_deletion ON public.custodian_slips CASCADE;
DROP VIEW IF EXISTS public.deletable_custodian_slips CASCADE;

-- Step 2: Wait for complete cleanup
SELECT pg_sleep(3);

-- Step 3: Verify all functions are removed
SELECT 
  proname as function_name
FROM pg_proc 
WHERE proname LIKE '%safe_delete%' OR proname LIKE '%can_delete%'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
