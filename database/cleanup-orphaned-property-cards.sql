-- Clean up orphaned property cards (property cards without inventory items)
-- Run this in Supabase SQL Editor

-- Step 1: Show what we're about to delete
SELECT 
  'BEFORE CLEANUP' as status,
  pc.id,
  pc.property_number,
  pc.entity_name,
  pc.fund_cluster,
  pc.inventory_item_id,
  CASE 
    WHEN ii.id IS NULL THEN 'ORPHANED - Will be deleted'
    ELSE 'VALID - Will be kept'
  END as action
FROM public.property_cards pc
LEFT JOIN public.inventory_items ii ON pc.inventory_item_id = ii.id
ORDER BY pc.created_at DESC;

-- Step 2: Delete orphaned property cards
DELETE FROM public.property_cards 
WHERE inventory_item_id IS NOT NULL 
  AND inventory_item_id NOT IN (SELECT id FROM public.inventory_items);

-- Step 3: Show results after cleanup
SELECT 
  'AFTER CLEANUP' as status,
  COUNT(*) as remaining_property_cards
FROM public.property_cards;

-- Step 4: Verify no orphaned cards remain
SELECT 
  COUNT(*) as orphaned_cards
FROM public.property_cards pc
LEFT JOIN public.inventory_items ii ON pc.inventory_item_id = ii.id
WHERE ii.id IS NULL;

-- Step 5: Show final status
SELECT 'Orphaned property cards cleanup completed successfully' as result;
