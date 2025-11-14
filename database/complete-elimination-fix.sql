-- COMPLETE ELIMINATION FIX for ambiguous slip_id reference
-- This will completely eliminate the ambiguous column reference issue
-- Run this in Supabase SQL Editor

-- Step 1: Completely drop ALL related objects with CASCADE
DROP FUNCTION IF EXISTS public.safe_delete_custodian_slip(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.safe_delete_custodian_slip_v2(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.safe_delete_custodian_slip_v3(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_delete_custodian_slip(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.prevent_issued_slip_deletion() CASCADE;
DROP TRIGGER IF EXISTS trg_prevent_issued_slip_deletion ON public.custodian_slips CASCADE;
DROP VIEW IF EXISTS public.deletable_custodian_slips CASCADE;

-- Step 2: Wait for complete cleanup
SELECT pg_sleep(5);

-- Step 3: Create a completely new function with NO ambiguous references
CREATE OR REPLACE FUNCTION public.safe_delete_custodian_slip(target_slip_id uuid)
RETURNS boolean AS $$
DECLARE
  slip_exists boolean;
  slip_status_val text;
  entry_count integer;
  item_record record;
BEGIN
  -- Check if slip exists and get its status
  SELECT EXISTS(SELECT 1 FROM public.custodian_slips WHERE id = target_slip_id) INTO slip_exists;
  
  IF NOT slip_exists THEN
    RAISE EXCEPTION 'Custodian slip % does not exist', target_slip_id;
  END IF;
  
  -- Get slip status
  SELECT slip_status INTO slip_status_val 
  FROM public.custodian_slips 
  WHERE id = target_slip_id;
  
  -- Can only delete draft slips
  IF slip_status_val != 'Draft' THEN
    RAISE EXCEPTION 'Cannot delete custodian slip % - it has been issued', target_slip_id;
  END IF;
  
  -- Check if any property card entries exist for this slip
  -- Use explicit table aliases and avoid any ambiguous references
  SELECT COUNT(*) INTO entry_count
  FROM public.property_card_entries pce
  INNER JOIN public.custodian_slip_items csi ON pce.related_slip_id = csi.slip_id
  WHERE csi.slip_id = target_slip_id;
  
  -- Cannot delete if property card entries exist
  IF entry_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete custodian slip % - it has associated property card entries', target_slip_id;
  END IF;
  
  -- Get all items in this slip with explicit table alias
  FOR item_record IN 
    SELECT csi.inventory_item_id 
    FROM public.custodian_slip_items csi
    WHERE csi.slip_id = target_slip_id
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
  WHERE slip_id = target_slip_id;
  
  -- Delete the custodian slip
  DELETE FROM public.custodian_slips 
  WHERE id = target_slip_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create the can_delete function with NO ambiguous references
CREATE OR REPLACE FUNCTION public.can_delete_custodian_slip(target_slip_id uuid)
RETURNS boolean AS $$
DECLARE
  slip_exists boolean;
  slip_status_val text;
  entry_count integer;
BEGIN
  -- Check if slip exists
  SELECT EXISTS(SELECT 1 FROM public.custodian_slips WHERE id = target_slip_id) INTO slip_exists;
  
  IF NOT slip_exists THEN
    RETURN false;
  END IF;
  
  -- Get slip status
  SELECT slip_status INTO slip_status_val 
  FROM public.custodian_slips 
  WHERE id = target_slip_id;
  
  -- Can only delete draft slips
  IF slip_status_val != 'Draft' THEN
    RETURN false;
  END IF;
  
  -- Check if any property card entries exist for this slip
  -- Use explicit table aliases and avoid any ambiguous references
  SELECT COUNT(*) INTO entry_count
  FROM public.property_card_entries pce
  INNER JOIN public.custodian_slip_items csi ON pce.related_slip_id = csi.slip_id
  WHERE csi.slip_id = target_slip_id;
  
  -- Cannot delete if property card entries exist
  IF entry_count > 0 THEN
    RETURN false;
  END IF;
  
  -- Can be deleted
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create the trigger function
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

-- Step 6: Create the trigger
CREATE TRIGGER trg_prevent_issued_slip_deletion
  BEFORE DELETE ON public.custodian_slips
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_issued_slip_deletion();

-- Step 7: Recreate the view
CREATE OR REPLACE VIEW public.deletable_custodian_slips AS
SELECT cs.*
FROM public.custodian_slips cs
WHERE public.can_delete_custodian_slip(cs.id);

-- Step 8: Test the function to make sure it works
SELECT public.safe_delete_custodian_slip('00000000-0000-0000-0000-000000000000'::uuid) as test_result;

-- Step 9: Verify the functions were created successfully
SELECT 
  proname as function_name,
  proargnames as argument_names
FROM pg_proc 
WHERE proname IN ('safe_delete_custodian_slip', 'can_delete_custodian_slip')
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
