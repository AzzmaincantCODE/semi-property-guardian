-- Fix custodian assignment duplication issue
-- This ensures items assigned to custodians don't appear in future custodian slips
-- Run this in Supabase SQL Editor

-- Step 1: First, let's check current assignment status
SELECT 
  assignment_status, 
  COUNT(*) as count
FROM inventory_items 
GROUP BY assignment_status 
ORDER BY assignment_status;

-- Step 2: Update the availability function to be more strict
CREATE OR REPLACE FUNCTION public.is_item_available_for_assignment(item_id uuid)
RETURNS boolean AS $$
DECLARE
  item_record record;
BEGIN
  -- Get the inventory item details
  SELECT * INTO item_record 
  FROM public.inventory_items 
  WHERE id = item_id;
  
  -- Item doesn't exist
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check if item is in a condition that prevents assignment
  IF item_record.condition IN ('Unserviceable', 'Lost', 'Stolen', 'Damaged', 'Destroyed') THEN
    RETURN false;
  END IF;
  
  -- Check if item is already assigned or disposed
  IF item_record.assignment_status IN ('Assigned', 'In-Transit', 'Disposed', 'Damaged', 'Missing', 'Lost', 'Stolen') THEN
    RETURN false;
  END IF;
  
  -- Check if item already has a custodian assigned (STRICT CHECK)
  IF item_record.custodian IS NOT NULL AND item_record.custodian != '' THEN
    RETURN false;
  END IF;
  
  -- Check if item status is not Active
  IF item_record.status != 'Active' THEN
    RETURN false;
  END IF;
  
  -- Item is available
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Update the availability view to be more strict
CREATE OR REPLACE VIEW public.available_inventory_items AS
SELECT *
FROM public.inventory_items
WHERE 
  -- Must be serviceable
  condition = 'Serviceable'
  -- Must be active status
  AND status = 'Active'
  -- Must not be assigned to anyone
  AND (custodian IS NULL OR custodian = '')
  -- Must have available assignment status
  AND (assignment_status IS NULL OR assignment_status = 'Available')
  -- Must not be disposed/damaged/missing
  AND assignment_status NOT IN ('Assigned', 'In-Transit', 'Disposed', 'Damaged', 'Missing', 'Lost', 'Stolen')
ORDER BY created_at DESC;

-- Step 4: Create a more robust trigger for custodian slip item creation
CREATE OR REPLACE FUNCTION public.validate_and_assign_item()
RETURNS TRIGGER AS $$
DECLARE
  inventory_item record;
  slip_record record;
BEGIN
  -- Get the inventory item details
  SELECT * INTO inventory_item 
  FROM public.inventory_items 
  WHERE id = NEW.inventory_item_id;
  
  -- Get the custodian slip details
  SELECT * INTO slip_record 
  FROM public.custodian_slips 
  WHERE id = NEW.slip_id;
  
  -- Check if item exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item % not found', NEW.inventory_item_id;
  END IF;
  
  -- Check if item is available (STRICT CHECKS)
  IF inventory_item.condition != 'Serviceable' THEN
    RAISE EXCEPTION 'Item % is not serviceable (condition: %)', NEW.inventory_item_id, inventory_item.condition;
  END IF;
  
  IF inventory_item.status != 'Active' THEN
    RAISE EXCEPTION 'Item % is not active (status: %)', NEW.inventory_item_id, inventory_item.status;
  END IF;
  
  IF inventory_item.custodian IS NOT NULL AND inventory_item.custodian != '' THEN
    RAISE EXCEPTION 'Item % is already assigned to custodian: %', NEW.inventory_item_id, inventory_item.custodian;
  END IF;
  
  IF inventory_item.assignment_status IN ('Assigned', 'In-Transit', 'Disposed', 'Damaged', 'Missing', 'Lost', 'Stolen') THEN
    RAISE EXCEPTION 'Item % is not available for assignment (status: %)', NEW.inventory_item_id, inventory_item.assignment_status;
  END IF;
  
  -- IMMEDIATELY update the inventory item to prevent double assignment
  UPDATE public.inventory_items
  SET 
    custodian = slip_record.custodian_name,
    custodian_position = slip_record.designation,
    assignment_status = 'Assigned',
    assigned_date = slip_record.date_issued,
    updated_at = NOW()
  WHERE id = NEW.inventory_item_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Drop existing triggers and create new ones
DROP TRIGGER IF EXISTS trg_validate_item_availability ON public.custodian_slip_items;
DROP TRIGGER IF EXISTS trg_update_inventory_assignment ON public.custodian_slip_items;

-- Create the new trigger
CREATE TRIGGER trg_validate_and_assign_item
  BEFORE INSERT ON public.custodian_slip_items
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_and_assign_item();

-- Step 6: Create a function to check for duplicate assignments
CREATE OR REPLACE FUNCTION public.check_for_duplicate_assignments()
RETURNS TABLE(
  item_id uuid,
  property_number text,
  custodian_count bigint,
  custodian_names text
) AS $$
BEGIN
  RETURN QUERY
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
  ORDER BY custodian_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Check for any existing duplicate assignments
SELECT * FROM public.check_for_duplicate_assignments();

-- Step 8: If duplicates exist, clean them up (keep the most recent assignment)
WITH duplicate_cleanup AS (
  SELECT 
    csi.inventory_item_id,
    csi.id as slip_item_id,
    cs.date_issued,
    ROW_NUMBER() OVER (PARTITION BY csi.inventory_item_id ORDER BY cs.date_issued DESC) as rn
  FROM public.custodian_slip_items csi
  JOIN public.custodian_slips cs ON csi.slip_id = cs.id
  WHERE csi.inventory_item_id IN (
    SELECT item_id FROM public.check_for_duplicate_assignments()
  )
)
DELETE FROM public.custodian_slip_items 
WHERE id IN (
  SELECT slip_item_id 
  FROM duplicate_cleanup 
  WHERE rn > 1
);

-- Step 9: Reset any items that were incorrectly assigned multiple times
UPDATE public.inventory_items
SET 
  custodian = NULL,
  custodian_position = NULL,
  assignment_status = 'Available',
  assigned_date = NULL,
  updated_at = NOW()
WHERE id IN (
  SELECT item_id FROM public.check_for_duplicate_assignments()
);

-- Step 10: Verify the fix
SELECT 
  'After cleanup' as status,
  assignment_status, 
  COUNT(*) as count
FROM public.inventory_items 
GROUP BY assignment_status 
ORDER BY assignment_status;

-- Step 11: Show available items for custodian slips
SELECT 
  property_number,
  description,
  condition,
  status,
  assignment_status,
  custodian
FROM public.inventory_items
WHERE condition = 'Serviceable' 
  AND status = 'Active'
  AND (custodian IS NULL OR custodian = '')
  AND (assignment_status IS NULL OR assignment_status = 'Available')
LIMIT 10;
