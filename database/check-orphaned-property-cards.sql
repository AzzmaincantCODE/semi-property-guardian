-- Check for orphaned property cards (property cards without inventory items)
-- Run this in Supabase SQL Editor

-- Step 1: Find property cards that reference non-existent inventory items
SELECT 
  pc.id,
  pc.property_number,
  pc.entity_name,
  pc.fund_cluster,
  pc.inventory_item_id,
  CASE 
    WHEN ii.id IS NULL THEN 'ORPHANED - No inventory item'
    ELSE 'VALID - Has inventory item'
  END as status
FROM public.property_cards pc
LEFT JOIN public.inventory_items ii ON pc.inventory_item_id = ii.id
ORDER BY pc.created_at DESC;

-- Step 2: Count orphaned vs valid property cards
SELECT 
  COUNT(*) as total_property_cards,
  COUNT(CASE WHEN ii.id IS NULL THEN 1 END) as orphaned_cards,
  COUNT(CASE WHEN ii.id IS NOT NULL THEN 1 END) as valid_cards
FROM public.property_cards pc
LEFT JOIN public.inventory_items ii ON pc.inventory_item_id = ii.id;

-- Step 3: Show all inventory items (should be 0)
SELECT COUNT(*) as total_inventory_items FROM public.inventory_items;

-- Step 4: Show all property cards (should match orphaned count)
SELECT COUNT(*) as total_property_cards FROM public.property_cards;
