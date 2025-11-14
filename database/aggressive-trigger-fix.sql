-- Aggressive fix for draft assignment issue
-- This will completely remove all problematic triggers and recreate them properly

-- Step 1: Drop ALL triggers on custodian_slip_items
DROP TRIGGER IF EXISTS trg_update_inventory_assignment_status ON public.custodian_slip_items;
DROP TRIGGER IF EXISTS trg_update_inventory_assignment_status_on_issue ON public.custodian_slip_items;
DROP TRIGGER IF EXISTS trg_validate_item_availability ON public.custodian_slip_items;
DROP TRIGGER IF EXISTS trg_create_property_card_entry_for_slip ON public.custodian_slip_items;

-- Step 2: Drop ALL triggers on custodian_slips
DROP TRIGGER IF EXISTS trg_assign_items_when_slip_issued ON public.custodian_slips;
DROP TRIGGER IF EXISTS trg_create_property_card_entries_on_slip_issue ON public.custodian_slips;
DROP TRIGGER IF EXISTS trg_release_inventory_on_slip_deletion ON public.custodian_slips;

-- Step 3: Reset all items that were incorrectly assigned to draft slips
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

-- Step 4: Create a simple function that ONLY assigns items when slip is ISSUED
CREATE OR REPLACE FUNCTION public.assign_items_only_when_issued()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when slip status changes to 'Issued'
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
    
    -- Create property card entries for issued slips
    INSERT INTO public.property_card_entries (
      property_card_id,
      date,
      reference,
      receipt_qty,
      unit_cost,
      total_cost,
      issue_item_no,
      issue_qty,
      office_officer,
      balance_qty,
      amount,
      remarks,
      related_slip_id
    )
    SELECT 
      pc.id as property_card_id,
      NEW.date_issued as date,
      NEW.slip_number as reference,
      0 as receipt_qty,
      0 as unit_cost,
      0 as total_cost,
      i.property_number as issue_item_no,
      csi.quantity as issue_qty,
      NEW.custodian_name || ' (' || NEW.designation || ')' as office_officer,
      0 as balance_qty,
      0 as amount,
      'Issued via ICS ' || NEW.slip_number as remarks,
      NEW.id as related_slip_id
    FROM public.custodian_slip_items csi
    JOIN public.inventory_items i ON csi.inventory_item_id = i.id
    LEFT JOIN public.property_cards pc ON i.id = pc.inventory_item_id
    WHERE csi.slip_id = NEW.id
    AND pc.id IS NOT NULL; -- Only create entries if property card exists
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger ONLY on custodian_slips table for status changes
CREATE TRIGGER trg_assign_items_only_when_issued
  AFTER UPDATE ON public.custodian_slips
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_items_only_when_issued();

-- Step 6: Create function to release items when slip is deleted
CREATE OR REPLACE FUNCTION public.release_items_on_slip_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Release all inventory items associated with this slip
  UPDATE public.inventory_items
  SET 
    custodian = NULL,
    custodian_position = NULL,
    assignment_status = 'Available',
    assigned_date = NULL,
    updated_at = NOW()
  WHERE id IN (
    SELECT inventory_item_id 
    FROM public.custodian_slip_items 
    WHERE slip_id = OLD.id
  );
  
  -- Delete property card entries related to this slip
  DELETE FROM public.property_card_entries
  WHERE related_slip_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger for slip deletion
CREATE TRIGGER trg_release_items_on_slip_deletion
  AFTER DELETE ON public.custodian_slips
  FOR EACH ROW
  EXECUTE FUNCTION public.release_items_on_slip_deletion();

-- Step 8: Verify the fix
SELECT 
  'Draft slips with assigned items (should be 0):' as check_type,
  COUNT(*) as count
FROM public.custodian_slips cs
JOIN public.custodian_slip_items csi ON cs.id = csi.slip_id
JOIN public.inventory_items i ON csi.inventory_item_id = i.id
WHERE cs.slip_status = 'Draft' AND i.assignment_status = 'Assigned';

SELECT 
  'Available items in draft slips (should match draft slip count):' as check_type,
  COUNT(*) as count
FROM public.custodian_slips cs
JOIN public.custodian_slip_items csi ON cs.id = csi.slip_id
JOIN public.inventory_items i ON csi.inventory_item_id = i.id
WHERE cs.slip_status = 'Draft' AND i.assignment_status = 'Available';
