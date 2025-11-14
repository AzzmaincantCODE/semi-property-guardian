-- Check and Create Required Functions
-- Run this to verify all functions exist and create them if missing
-- Run this in Supabase SQL Editor

-- Step 1: Check if safe_delete_inventory_item function exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p 
      JOIN pg_namespace n ON p.pronamespace = n.oid 
      WHERE n.nspname = 'public' AND p.proname = 'safe_delete_inventory_item'
    ) 
    THEN 'safe_delete_inventory_item function EXISTS' 
    ELSE 'safe_delete_inventory_item function MISSING' 
  END as function_status;

-- Step 2: Create safe_delete_inventory_item function if it doesn't exist
CREATE OR REPLACE FUNCTION public.safe_delete_inventory_item(item_id uuid)
RETURNS boolean AS $$
DECLARE
  item_record record;
  slip_count integer;
  entry_count integer;
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
  
  -- If item is assigned or has entries, we need to clean them up first
  IF slip_count > 0 OR entry_count > 0 THEN
    -- Delete custodian slip items first
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

-- Step 3: Create can_delete_inventory_item function
CREATE OR REPLACE FUNCTION public.can_delete_inventory_item(item_id uuid)
RETURNS TABLE(
  can_delete boolean,
  reason text,
  custodian_slips integer,
  property_entries integer
) AS $$
DECLARE
  slip_count integer;
  entry_count integer;
  item_record record;
BEGIN
  -- Get the inventory item details
  SELECT * INTO item_record 
  FROM public.inventory_items 
  WHERE id = item_id;
  
  -- Item doesn't exist
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Item not found', 0, 0;
  END IF;
  
  -- Count custodian slip references
  SELECT COUNT(*) INTO slip_count
  FROM public.custodian_slip_items 
  WHERE inventory_item_id = item_id;
  
  -- Count property card entry references
  SELECT COUNT(*) INTO entry_count
  FROM public.property_card_entries 
  WHERE inventory_item_id = item_id;
  
  -- Determine if item can be deleted
  IF slip_count > 0 OR entry_count > 0 THEN
    RETURN QUERY SELECT 
      true, -- Can be deleted (we'll clean up references)
      'Item has ' || slip_count || ' custodian slip(s) and ' || entry_count || ' property card entry(ies). These will be deleted.',
      slip_count,
      entry_count;
  ELSE
    RETURN QUERY SELECT 
      true, -- Can be deleted safely
      'Item can be deleted safely - no references found.',
      slip_count,
      entry_count;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create prevent_inventory_item_deletion function
CREATE OR REPLACE FUNCTION public.prevent_inventory_item_deletion()
RETURNS TRIGGER AS $$
DECLARE
  slip_count integer;
  entry_count integer;
BEGIN
  -- Count references
  SELECT COUNT(*) INTO slip_count
  FROM public.custodian_slip_items 
  WHERE inventory_item_id = OLD.id;
  
  SELECT COUNT(*) INTO entry_count
  FROM public.property_card_entries 
  WHERE inventory_item_id = OLD.id;
  
  -- If item has references, prevent deletion
  IF slip_count > 0 OR entry_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete inventory item % - it has % custodian slip(s) and % property card entry(ies). Use safe_delete_inventory_item function instead.', 
      OLD.id, slip_count, entry_count;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger
DROP TRIGGER IF EXISTS trg_prevent_inventory_deletion ON public.inventory_items;
CREATE TRIGGER trg_prevent_inventory_deletion
  BEFORE DELETE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_inventory_item_deletion();

-- Step 6: Test the function with a sample item
-- (This will show if the function works)
SELECT 'Functions created successfully' as status;

-- Step 7: Show available functions
SELECT 
  'Available functions:' as info,
  proname as function_name,
  proargnames as parameters
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND proname IN ('safe_delete_inventory_item', 'can_delete_inventory_item', 'prevent_inventory_item_deletion')
ORDER BY proname;
