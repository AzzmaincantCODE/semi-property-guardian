-- Ultimate fix for ambiguous slip_id reference
-- This will completely remove all function definitions and recreate them
-- Run this in Supabase SQL Editor

-- Step 1: Drop ALL related objects with CASCADE to ensure complete cleanup
DROP FUNCTION IF EXISTS public.safe_delete_custodian_slip(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_delete_custodian_slip(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.prevent_issued_slip_deletion() CASCADE;
DROP TRIGGER IF EXISTS trg_prevent_issued_slip_deletion ON public.custodian_slips CASCADE;
DROP VIEW IF EXISTS public.deletable_custodian_slips CASCADE;

-- Step 2: Wait a moment for the database to process the drops
SELECT pg_sleep(1);

-- Step 3: Create a completely new version with different function names to avoid any caching issues
CREATE OR REPLACE FUNCTION public.safe_delete_custodian_slip_v2(slip_id_param uuid)
RETURNS boolean AS $$
DECLARE
  can_delete boolean;
  item_record record;
  slip_record record;
  entry_count integer;
BEGIN
  -- Get the custodian slip details
  SELECT * INTO slip_record 
  FROM public.custodian_slips 
  WHERE id = slip_id_param;
  
  -- Slip doesn't exist
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Custodian slip % does not exist', slip_id_param;
  END IF;
  
  -- Can only delete draft slips
  IF slip_record.slip_status != 'Draft' THEN
    RAISE EXCEPTION 'Cannot delete custodian slip % - it has been issued', slip_id_param;
  END IF;
  
  -- Check if any property card entries exist for this slip
  SELECT COUNT(*) INTO entry_count
  FROM public.property_card_entries pce
  JOIN public.custodian_slip_items csi ON pce.related_slip_id = csi.slip_id
  WHERE csi.slip_id = slip_id_param;
  
  -- Cannot delete if property card entries exist
  IF entry_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete custodian slip % - it has associated property card entries', slip_id_param;
  END IF;
  
  -- Get all items in this slip with explicit table alias
  FOR item_record IN 
    SELECT csi.inventory_item_id 
    FROM public.custodian_slip_items csi
    WHERE csi.slip_id = slip_id_param
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
  WHERE slip_id = slip_id_param;
  
  -- Delete the custodian slip
  DELETE FROM public.custodian_slips 
  WHERE id = slip_id_param;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create the original function name as a wrapper
CREATE OR REPLACE FUNCTION public.safe_delete_custodian_slip(slip_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN public.safe_delete_custodian_slip_v2(slip_id);
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create the can_delete function with different parameter name
CREATE OR REPLACE FUNCTION public.can_delete_custodian_slip(slip_id_param uuid)
RETURNS boolean AS $$
DECLARE
  slip_record record;
  entry_count integer;
BEGIN
  -- Get the custodian slip details
  SELECT * INTO slip_record 
  FROM public.custodian_slips 
  WHERE id = slip_id_param;
  
  -- Slip doesn't exist
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Can only delete draft slips
  IF slip_record.slip_status != 'Draft' THEN
    RETURN false;
  END IF;
  
  -- Check if any property card entries exist for this slip
  SELECT COUNT(*) INTO entry_count
  FROM public.property_card_entries pce
  JOIN public.custodian_slip_items csi ON pce.related_slip_id = csi.slip_id
  WHERE csi.slip_id = slip_id_param;
  
  -- Cannot delete if property card entries exist
  IF entry_count > 0 THEN
    RETURN false;
  END IF;
  
  -- Can be deleted
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create the trigger function
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

-- Step 7: Create the trigger
CREATE TRIGGER trg_prevent_issued_slip_deletion
  BEFORE DELETE ON public.custodian_slips
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_issued_slip_deletion();

-- Step 8: Recreate the view
CREATE OR REPLACE VIEW public.deletable_custodian_slips AS
SELECT cs.*
FROM public.custodian_slips cs
WHERE public.can_delete_custodian_slip(cs.id);

-- Step 9: Test the function to make sure it works
SELECT public.safe_delete_custodian_slip('00000000-0000-0000-0000-000000000000'::uuid) as test_result;

-- Step 10: Verify the functions were created successfully
SELECT 
  proname as function_name,
  proargnames as argument_names,
  prosrc as function_source
FROM pg_proc 
WHERE proname IN ('safe_delete_custodian_slip', 'safe_delete_custodian_slip_v2', 'can_delete_custodian_slip')
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
