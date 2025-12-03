-- Inventory Item Deletion Policy
-- Handle foreign key constraints when deleting inventory items
-- Run this in Supabase SQL Editor

-- Step 1: Create function to safely delete inventory items
CREATE OR REPLACE FUNCTION public.safe_delete_inventory_item(item_id uuid)
RETURNS boolean AS $$
DECLARE
  item_record record;
  slip_count integer;
  entry_count integer;
  transfer_count integer;
  affected_transfer_ids uuid[];
  empty_transfer_ids uuid[];
BEGIN
  -- Get the inventory item details
  SELECT * INTO item_record 
  FROM public.inventory_items 
  WHERE id = item_id;
  
  -- Item doesn't exist
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item % not found', item_id;
  END IF;
  
  -- Check if item is assigned to any custodian slips
  SELECT COUNT(*) INTO slip_count
  FROM public.custodian_slip_items 
  WHERE inventory_item_id = item_id;
  
  -- Check if item has property card entries
  SELECT COUNT(*) INTO entry_count
  FROM public.property_card_entries 
  WHERE inventory_item_id = item_id;
  
  -- Check if item is referenced in transfer items
  SELECT COUNT(*) INTO transfer_count
  FROM public.transfer_items 
  WHERE inventory_item_id = item_id;
  
  -- If item is assigned or has entries, we need to clean them up first
  IF slip_count > 0 OR entry_count > 0 OR transfer_count > 0 THEN
    -- Collect transfer IDs that contain this item (before deleting)
    SELECT ARRAY_AGG(DISTINCT transfer_id) INTO affected_transfer_ids
    FROM public.transfer_items 
    WHERE inventory_item_id = item_id;
    
    -- Delete transfer items first (they reference the inventory item)
    DELETE FROM public.transfer_items 
    WHERE inventory_item_id = item_id;
    
    -- Find transfers that are now empty (no remaining items) and delete them
    IF affected_transfer_ids IS NOT NULL AND array_length(affected_transfer_ids, 1) > 0 THEN
      SELECT ARRAY_AGG(t.id) INTO empty_transfer_ids
      FROM public.property_transfers t
      WHERE t.id = ANY(affected_transfer_ids)
      AND NOT EXISTS (
        SELECT 1 FROM public.transfer_items ti 
        WHERE ti.transfer_id = t.id
      );
      
      -- Delete property card entries that reference empty transfers
      IF empty_transfer_ids IS NOT NULL AND array_length(empty_transfer_ids, 1) > 0 THEN
        DELETE FROM public.property_card_entries 
        WHERE related_transfer_id = ANY(empty_transfer_ids);
        
        -- Delete the empty transfers (transfer receipts)
        DELETE FROM public.property_transfers 
        WHERE id = ANY(empty_transfer_ids);
      END IF;
    END IF;
    
    -- Delete custodian slip items
    DELETE FROM public.custodian_slip_items 
    WHERE inventory_item_id = item_id;
    
    -- Delete property card entries
    DELETE FROM public.property_card_entries 
    WHERE inventory_item_id = item_id;
    
    -- Delete the property card if it was created for this item
    DELETE FROM public.property_cards 
    WHERE inventory_item_id = item_id;
  END IF;
  
  -- Now delete the inventory item
  DELETE FROM public.inventory_items 
  WHERE id = item_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create function to check if item can be deleted
-- Drop the function first if it exists (needed when changing return type)
DROP FUNCTION IF EXISTS public.can_delete_inventory_item(uuid);

CREATE OR REPLACE FUNCTION public.can_delete_inventory_item(item_id uuid)
RETURNS TABLE(
  can_delete boolean,
  reason text,
  custodian_slips integer,
  property_entries integer,
  transfer_items integer
) AS $$
DECLARE
  slip_count integer;
  entry_count integer;
  transfer_count integer;
  item_record record;
BEGIN
  -- Get the inventory item details
  SELECT * INTO item_record 
  FROM public.inventory_items 
  WHERE id = item_id;
  
  -- Item doesn't exist
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Item not found', 0, 0, 0;
  END IF;
  
  -- Count custodian slip references
  SELECT COUNT(*) INTO slip_count
  FROM public.custodian_slip_items 
  WHERE inventory_item_id = item_id;
  
  -- Count property card entry references
  SELECT COUNT(*) INTO entry_count
  FROM public.property_card_entries 
  WHERE inventory_item_id = item_id;
  
  -- Count transfer item references
  SELECT COUNT(*) INTO transfer_count
  FROM public.transfer_items 
  WHERE inventory_item_id = item_id;
  
  -- Determine if item can be deleted
  IF slip_count > 0 OR entry_count > 0 OR transfer_count > 0 THEN
    RETURN QUERY SELECT 
      true, -- Can be deleted (we'll clean up references)
      'Item has ' || slip_count || ' custodian slip(s), ' || entry_count || ' property card entry(ies), and ' || transfer_count || ' transfer item(s). These will be deleted.',
      slip_count,
      entry_count,
      transfer_count;
  ELSE
    RETURN QUERY SELECT 
      true, -- Can be deleted safely
      'Item can be deleted safely - no references found.',
      slip_count,
      entry_count,
      transfer_count;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger to prevent direct deletion
CREATE OR REPLACE FUNCTION public.prevent_inventory_item_deletion()
RETURNS TRIGGER AS $$
DECLARE
  slip_count integer;
  entry_count integer;
  transfer_count integer;
BEGIN
  -- Count references
  SELECT COUNT(*) INTO slip_count
  FROM public.custodian_slip_items 
  WHERE inventory_item_id = OLD.id;
  
  SELECT COUNT(*) INTO entry_count
  FROM public.property_card_entries 
  WHERE inventory_item_id = OLD.id;
  
  SELECT COUNT(*) INTO transfer_count
  FROM public.transfer_items 
  WHERE inventory_item_id = OLD.id;
  
  -- If item has references, prevent deletion
  IF slip_count > 0 OR entry_count > 0 OR transfer_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete inventory item % - it has % custodian slip(s), % property card entry(ies), and % transfer item(s). Use safe_delete_inventory_item function instead.', 
      OLD.id, slip_count, entry_count, transfer_count;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_prevent_inventory_deletion ON public.inventory_items;
CREATE TRIGGER trg_prevent_inventory_deletion
  BEFORE DELETE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_inventory_item_deletion();

-- Step 4: Add RLS policy for safe deletion
-- Allow deletion only through the safe function
DROP POLICY IF EXISTS "Allow safe deletion of inventory items" ON public.inventory_items;
CREATE POLICY "Allow safe deletion of inventory items" ON public.inventory_items
FOR DELETE
USING (true); -- The trigger will handle the actual protection

-- Step 5: Add comments for documentation
COMMENT ON FUNCTION public.safe_delete_inventory_item IS 'Safely deletes an inventory item and all its related data (custodian slips, property cards, entries)';
COMMENT ON FUNCTION public.can_delete_inventory_item IS 'Checks if an inventory item can be deleted and shows what references exist';
COMMENT ON FUNCTION public.prevent_inventory_item_deletion IS 'Prevents direct deletion of inventory items that have foreign key references';
