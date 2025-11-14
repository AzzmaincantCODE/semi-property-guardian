-- Complete fix for ambiguous slip_id reference
-- This will completely drop and recreate the functions to ensure they're updated
-- Run this in Supabase SQL Editor

-- Step 1: Drop the functions completely to ensure clean recreation
DROP FUNCTION IF EXISTS public.safe_delete_custodian_slip(uuid);
DROP FUNCTION IF EXISTS public.can_delete_custodian_slip(uuid);
DROP FUNCTION IF EXISTS public.prevent_issued_slip_deletion();

-- Step 2: Drop any existing triggers
DROP TRIGGER IF EXISTS trg_prevent_issued_slip_deletion ON public.custodian_slips;

-- Step 3: Recreate can_delete_custodian_slip function with proper aliases
CREATE OR REPLACE FUNCTION public.can_delete_custodian_slip(slip_id uuid)
RETURNS boolean AS $$
DECLARE
  slip_record record;
  entry_count integer;
BEGIN
  -- Get the custodian slip details
  SELECT * INTO slip_record 
  FROM public.custodian_slips 
  WHERE id = slip_id;
  
  -- Slip doesn't exist
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Can only delete draft slips
  IF slip_record.slip_status != 'Draft' THEN
    RETURN false;
  END IF;
  
  -- Check if any property card entries exist for this slip
  -- Use proper table aliases to avoid ambiguous column reference
  SELECT COUNT(*) INTO entry_count
  FROM public.property_card_entries pce
  JOIN public.custodian_slip_items csi ON pce.related_slip_id = csi.slip_id
  WHERE csi.slip_id = slip_id;
  
  -- Cannot delete if property card entries exist
  IF entry_count > 0 THEN
    RETURN false;
  END IF;
  
  -- Can be deleted
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Recreate safe_delete_custodian_slip function with proper aliases
CREATE OR REPLACE FUNCTION public.safe_delete_custodian_slip(slip_id uuid)
RETURNS boolean AS $$
DECLARE
  can_delete boolean;
  item_record record;
BEGIN
  -- Check if slip can be deleted
  SELECT public.can_delete_custodian_slip(slip_id) INTO can_delete;
  
  IF NOT can_delete THEN
    RAISE EXCEPTION 'Cannot delete custodian slip % - it has been issued or has associated property card entries', slip_id;
  END IF;
  
  -- Get all items in this slip with proper table alias
  FOR item_record IN 
    SELECT csi.inventory_item_id 
    FROM public.custodian_slip_items csi
    WHERE csi.slip_id = slip_id
  LOOP
    -- Reset inventory items to available status
    UPDATE public.inventory_items
    SET 
      custodian = NULL,
      custodian_position = NULL,
      assignment_status = 'Available',
      assigned_date = NULL,
      updated_at = NOW()
    WHERE id = item_record.inventory_item_id;
  END LOOP;
  
  -- Delete custodian slip items
  DELETE FROM public.custodian_slip_items 
  WHERE slip_id = slip_id;
  
  -- Delete the custodian slip
  DELETE FROM public.custodian_slips 
  WHERE id = slip_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Recreate the trigger function
CREATE OR REPLACE FUNCTION public.prevent_issued_slip_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if slip can be deleted
  IF NOT public.can_delete_custodian_slip(OLD.id) THEN
    RAISE EXCEPTION 'Cannot delete custodian slip % - it has been issued or has associated property card entries. Use the safe_delete_custodian_slip function instead.', OLD.id;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Recreate the trigger
CREATE TRIGGER trg_prevent_issued_slip_deletion
  BEFORE DELETE ON public.custodian_slips
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_issued_slip_deletion();

-- Step 7: Verify the functions were created successfully
SELECT 
  proname as function_name,
  prosrc as function_source
FROM pg_proc 
WHERE proname IN ('safe_delete_custodian_slip', 'can_delete_custodian_slip')
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
