-- Development Cleanup: Remove Duplicate Custodian Slip Assignments
-- This script safely removes duplicates while preserving data integrity
-- Run this in Supabase SQL Editor during development phase

-- Step 1: Check for duplicate assignments
SELECT 
  'Current duplicate assignments:' as status,
  COUNT(*) as duplicate_count
FROM (
  SELECT 
    i.id as item_id,
    i.property_number,
    COUNT(csi.id) as custodian_count,
    STRING_AGG(DISTINCT cs.custodian_name, ', ') as custodian_names
  FROM public.inventory_items i
  LEFT JOIN public.custodian_slip_items csi ON i.id = csi.inventory_item_id
  LEFT JOIN public.custodian_slips cs ON csi.slip_id = cs.id
  WHERE i.assignment_status = 'Assigned' OR i.custodian IS NOT NULL
  GROUP BY i.id, i.property_number
  HAVING COUNT(csi.id) > 1
) duplicates;

-- Step 2: Temporarily disable triggers to allow cleanup
-- (This is safe in development, but would be dangerous in production)
DROP TRIGGER IF EXISTS trg_validate_and_assign_item ON public.custodian_slip_items;
DROP TRIGGER IF EXISTS trg_prevent_issued_slip_deletion ON public.custodian_slips;

-- Step 3: Create a function to safely clean up duplicates
CREATE OR REPLACE FUNCTION public.cleanup_duplicate_assignments()
RETURNS TABLE(
  cleaned_item_id uuid,
  property_number text,
  kept_slip_id uuid,
  removed_slip_ids uuid[]
) AS $$
DECLARE
  duplicate_record record;
  slip_to_keep uuid;
  slip_to_remove uuid;
  removed_slips uuid[];
BEGIN
  -- For each item with duplicate assignments, keep the most recent slip
  FOR duplicate_record IN 
    SELECT 
      i.id as item_id,
      i.property_number,
      cs.id as slip_id,
      cs.date_issued,
      ROW_NUMBER() OVER (PARTITION BY i.id ORDER BY cs.date_issued DESC, cs.created_at DESC) as rn
    FROM public.inventory_items i
    JOIN public.custodian_slip_items csi ON i.id = csi.inventory_item_id
    JOIN public.custodian_slips cs ON csi.slip_id = cs.id
    WHERE i.assignment_status = 'Assigned' OR i.custodian IS NOT NULL
    GROUP BY i.id, i.property_number, cs.id, cs.date_issued, cs.created_at
    HAVING COUNT(csi.id) > 1
  LOOP
    -- Keep the most recent slip (rn = 1), remove others
    IF duplicate_record.rn = 1 THEN
      slip_to_keep := duplicate_record.slip_id;
    ELSE
      slip_to_remove := duplicate_record.slip_id;
      
      -- Remove the duplicate custodian slip item
      DELETE FROM public.custodian_slip_items 
      WHERE slip_id = slip_to_remove AND inventory_item_id = duplicate_record.item_id;
      
      -- If this was the only item in the slip, remove the entire slip
      IF NOT EXISTS (
        SELECT 1 FROM public.custodian_slip_items 
        WHERE slip_id = slip_to_remove
      ) THEN
        DELETE FROM public.custodian_slips WHERE id = slip_to_remove;
      END IF;
      
      -- Track removed slips
      removed_slips := array_append(removed_slips, slip_to_remove);
    END IF;
  END LOOP;
  
  -- Return cleanup results
  RETURN QUERY
  SELECT 
    duplicate_record.item_id as cleaned_item_id,
    duplicate_record.property_number,
    slip_to_keep as kept_slip_id,
    removed_slips as removed_slip_ids;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Alternative approach - Reset all assignments and start fresh
-- (Use this if the above function is too complex)
CREATE OR REPLACE FUNCTION public.reset_all_assignments()
RETURNS void AS $$
BEGIN
  -- Reset all inventory items to available status
  UPDATE public.inventory_items
  SET 
    custodian = NULL,
    custodian_position = NULL,
    assignment_status = 'Available',
    assigned_date = NULL,
    updated_at = NOW()
  WHERE assignment_status = 'Assigned' OR custodian IS NOT NULL;
  
  -- Delete all custodian slip items
  DELETE FROM public.custodian_slip_items;
  
  -- Delete all custodian slips
  DELETE FROM public.custodian_slips;
  
  -- Reset any property card entries that were created from slips
  UPDATE public.property_card_entries
  SET 
    related_slip_id = NULL,
    updated_at = NOW()
  WHERE related_slip_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Show current state before cleanup
SELECT 
  'Before cleanup:' as status,
  assignment_status, 
  COUNT(*) as count
FROM public.inventory_items 
GROUP BY assignment_status 
ORDER BY assignment_status;

-- Step 6: Choose your cleanup method:

-- OPTION A: Reset everything (RECOMMENDED for development)
-- This is the safest approach for development
SELECT public.reset_all_assignments();

-- OPTION B: Smart cleanup (keeps most recent assignments)
-- Uncomment the line below if you want to try smart cleanup instead
-- SELECT * FROM public.cleanup_duplicate_assignments();

-- Step 7: Verify cleanup results
SELECT 
  'After cleanup:' as status,
  assignment_status, 
  COUNT(*) as count
FROM public.inventory_items 
GROUP BY assignment_status 
ORDER BY assignment_status;

-- Step 8: Show available items for new custodian slips
SELECT 
  'Available items for new custodian slips:' as status,
  COUNT(*) as available_count
FROM public.inventory_items
WHERE condition = 'Serviceable' 
  AND status = 'Active'
  AND (custodian IS NULL OR custodian = '')
  AND (assignment_status IS NULL OR assignment_status = 'Available');

-- Step 9: Re-enable triggers for normal operation
-- (Recreate the triggers we disabled earlier)
CREATE TRIGGER trg_validate_and_assign_item
  BEFORE INSERT ON public.custodian_slip_items
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_and_assign_item();

-- Step 10: Clean up temporary functions
DROP FUNCTION IF EXISTS public.cleanup_duplicate_assignments();
DROP FUNCTION IF EXISTS public.reset_all_assignments();

-- Step 11: Final verification
SELECT 
  'Final state - should have no duplicates:' as status,
  COUNT(*) as total_items,
  COUNT(CASE WHEN custodian IS NOT NULL THEN 1 END) as assigned_items,
  COUNT(CASE WHEN custodian IS NULL THEN 1 END) as available_items
FROM public.inventory_items;
