-- Fix the issue where items get assigned immediately when added to draft custodian slips
-- The trigger should only assign items when the slip status is 'Issued', not 'Draft'

-- First, let's check what triggers currently exist
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table IN ('custodian_slip_items', 'inventory_items')
ORDER BY event_object_table, trigger_name;
 
-- Drop the problematic trigger that assigns items immediately
DROP TRIGGER IF EXISTS trg_update_inventory_assignment_status ON public.custodian_slip_items;

-- Create a new function that only assigns items when slip is ISSUED
CREATE OR REPLACE FUNCTION public.update_inventory_assignment_status_on_issue()
RETURNS TRIGGER AS $$
DECLARE
  slip_record record;
BEGIN
  -- Get the custodian slip details
  SELECT * INTO slip_record FROM public.custodian_slips WHERE id = NEW.slip_id;
  
  -- ONLY assign items if the slip status is 'Issued'
  IF slip_record.slip_status = 'Issued' THEN
    -- Update the inventory item assignment status
    UPDATE public.inventory_items
    SET 
      custodian = slip_record.custodian_name,
      custodian_position = slip_record.designation,
      assignment_status = 'Assigned',
      assigned_date = slip_record.date_issued,
      updated_at = NOW()
    WHERE id = NEW.inventory_item_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists, then create new one
DROP TRIGGER IF EXISTS trg_update_inventory_assignment_status_on_issue ON public.custodian_slip_items;

-- Create trigger that only assigns items when slip is issued
CREATE TRIGGER trg_update_inventory_assignment_status_on_issue
  AFTER INSERT ON public.custodian_slip_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_inventory_assignment_status_on_issue();

-- Also create a trigger for when slip status changes from Draft to Issued
CREATE OR REPLACE FUNCTION public.assign_items_when_slip_issued()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when status changes to 'Issued'
  IF NEW.slip_status = 'Issued' AND (OLD.slip_status IS NULL OR OLD.slip_status != 'Issued') THEN
    
    -- Update all inventory items associated with this slip
    UPDATE public.inventory_items
    SET 
      custodian = NEW.custodian_name,
      custodian_position = NEW.designation,
      assignment_status = 'Assigned',
      assigned_date = NEW.date_issued,
      updated_at = NOW()
    WHERE id IN (
      SELECT inventory_item_id 
      FROM public.custodian_slip_items 
      WHERE slip_id = NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for slip status changes
DROP TRIGGER IF EXISTS trg_assign_items_when_slip_issued ON public.custodian_slips;
CREATE TRIGGER trg_assign_items_when_slip_issued
  AFTER UPDATE ON public.custodian_slips
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_items_when_slip_issued();

-- Reset any items that were incorrectly assigned to draft slips
UPDATE public.inventory_items
SET 
  custodian = NULL,
  custodian_position = NULL,
  assignment_status = 'Available',
  assigned_date = NULL,
  updated_at = NOW()
WHERE id IN (
  SELECT DISTINCT csi.inventory_item_id
  FROM public.custodian_slip_items csi
  JOIN public.custodian_slips cs ON csi.slip_id = cs.id
  WHERE cs.slip_status = 'Draft'
);

-- Show the current status
SELECT 
  'Items in Draft slips reset to Available' as status,
  COUNT(*) as count
FROM public.inventory_items i
JOIN public.custodian_slip_items csi ON i.id = csi.inventory_item_id
JOIN public.custodian_slips cs ON csi.slip_id = cs.id
WHERE cs.slip_status = 'Draft' AND i.assignment_status = 'Available';
