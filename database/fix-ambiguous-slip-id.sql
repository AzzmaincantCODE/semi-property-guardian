-- Fix ambiguous slip_id reference in safe_delete_custodian_slip function
-- Run this in Supabase SQL Editor

-- Drop and recreate the function with proper table aliases
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
  
  -- Get all items in this slip
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

-- Also fix the can_delete_custodian_slip function to avoid the same issue
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
