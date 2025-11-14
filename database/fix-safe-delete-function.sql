-- Fix the safe_delete_inventory_item function to handle property_cards properly
-- Run this in Supabase SQL Editor

-- Step 1: Drop and recreate the function with proper cleanup order
DROP FUNCTION IF EXISTS public.safe_delete_inventory_item(uuid);

CREATE OR REPLACE FUNCTION public.safe_delete_inventory_item(item_id uuid)
RETURNS boolean AS $$
DECLARE
  item_record record;
  slip_count integer;
  entry_count integer;
  card_count integer;
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
  
  -- Check if item has property cards
  SELECT COUNT(*) INTO card_count
  FROM public.property_cards 
  WHERE inventory_item_id = item_id;
  
  -- Clean up in the correct order to avoid foreign key constraints
  -- 1. Delete custodian slip items first
  IF slip_count > 0 THEN
    DELETE FROM public.custodian_slip_items 
    WHERE inventory_item_id = item_id;
    RAISE NOTICE 'Deleted % custodian slip items', slip_count;
  END IF;
  
  -- 2. Delete property card entries
  IF entry_count > 0 THEN
    DELETE FROM public.property_card_entries 
    WHERE inventory_item_id = item_id;
    RAISE NOTICE 'Deleted % property card entries', entry_count;
  END IF;
  
  -- 3. Delete property cards
  IF card_count > 0 THEN
    DELETE FROM public.property_cards 
    WHERE inventory_item_id = item_id;
    RAISE NOTICE 'Deleted % property cards', card_count;
  END IF;
  
  -- 4. Finally delete the inventory item
  DELETE FROM public.inventory_items 
  WHERE id = item_id;
  
  RAISE NOTICE 'Successfully deleted inventory item %', item_id;
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Test the function
SELECT 'safe_delete_inventory_item function updated successfully' as status;

-- Step 3: Show the function signature
SELECT 
  proname as function_name,
  proargnames as parameters,
  prosrc as function_body
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND proname = 'safe_delete_inventory_item';
