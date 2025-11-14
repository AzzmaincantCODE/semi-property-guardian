-- Custodian Slip Deletion Policy
-- Allow deletion only for draft/unissued slips
-- Prevent deletion of officially issued slips
-- Run this in Supabase SQL Editor

-- Step 1: Add status tracking to custodian slips
ALTER TABLE custodian_slips 
ADD COLUMN IF NOT EXISTS slip_status TEXT DEFAULT 'Draft' 
CHECK (slip_status IN ('Draft', 'Issued', 'Completed', 'Cancelled'));

-- Step 2: Create function to check if slip can be deleted
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

-- Step 3: Create function to safely delete custodian slip
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
    SELECT inventory_item_id 
    FROM public.custodian_slip_items 
    WHERE slip_id = slip_id
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

-- Step 4: Create trigger to prevent deletion of issued slips
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

-- Create trigger
DROP TRIGGER IF EXISTS trg_prevent_issued_slip_deletion ON public.custodian_slips;
CREATE TRIGGER trg_prevent_issued_slip_deletion
  BEFORE DELETE ON public.custodian_slips
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_issued_slip_deletion();

-- Step 5: Update existing slips to have proper status
UPDATE public.custodian_slips 
SET slip_status = 'Issued'
WHERE slip_status = 'Draft' 
  AND date_issued IS NOT NULL;

-- Step 6: Add RLS policy for deletion
-- Allow deletion only for draft slips
CREATE POLICY "Allow deletion of draft custodian slips" ON public.custodian_slips
FOR DELETE
USING (slip_status = 'Draft');

-- Step 7: Create a view for deletable slips
CREATE OR REPLACE VIEW public.deletable_custodian_slips AS
SELECT cs.*
FROM public.custodian_slips cs
WHERE public.can_delete_custodian_slip(cs.id) = true;

-- Step 8: Add comments for documentation
COMMENT ON COLUMN custodian_slips.slip_status IS 'Status of the custodian slip: Draft (can be deleted), Issued (cannot be deleted), Completed, Cancelled';
COMMENT ON FUNCTION public.can_delete_custodian_slip IS 'Checks if a custodian slip can be safely deleted (only draft slips without property card entries)';
COMMENT ON FUNCTION public.safe_delete_custodian_slip IS 'Safely deletes a custodian slip and resets associated inventory items to available status';
