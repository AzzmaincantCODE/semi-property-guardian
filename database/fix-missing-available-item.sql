-- Fix the missing item that should be available but isn't in the view
-- This script will find and fix the 1 missing item

-- 1. Find the specific item that's missing from available view
SELECT 
    'Missing Item Details' as check_type,
    ii.id,
    ii.property_number,
    ii.description,
    ii.status,
    ii.condition,
    ii.assignment_status,
    ii.created_at,
    'This item should be available but is missing from view' as issue
FROM inventory_items ii
WHERE ii.id NOT IN (SELECT id FROM available_inventory_items)
ORDER BY ii.created_at DESC;

-- 2. Check if this item is in custodian slip items (even if slip is deleted)
SELECT 
    'Missing Item in Custodian Slip Items' as check_type,
    ii.id,
    ii.property_number,
    ii.description,
    csi.slip_id,
    cs.slip_number,
    cs.slip_status,
    'Item is in custodian slip items' as issue
FROM inventory_items ii
JOIN custodian_slip_items csi ON ii.id = csi.inventory_item_id
LEFT JOIN custodian_slips cs ON csi.slip_id = cs.id
WHERE ii.id NOT IN (SELECT id FROM available_inventory_items);

-- 3. Check if this item is in property card entries
SELECT 
    'Missing Item in Property Card Entries' as check_type,
    ii.id,
    ii.property_number,
    ii.description,
    pce.id as property_card_entry_id,
    'Item is in property card entries' as issue
FROM inventory_items ii
JOIN property_card_entries pce ON ii.id = pce.inventory_item_id
WHERE ii.id NOT IN (SELECT id FROM available_inventory_items);

-- 4. Fix the issue by cleaning up orphaned references
-- Remove the item from custodian slip items if the slip doesn't exist
DELETE FROM custodian_slip_items 
WHERE inventory_item_id IN (
    SELECT ii.id 
    FROM inventory_items ii
    WHERE ii.id NOT IN (SELECT id FROM available_inventory_items)
)
AND slip_id NOT IN (SELECT id FROM custodian_slips);

-- 5. Remove the item from property card entries if it's orphaned
DELETE FROM property_card_entries 
WHERE inventory_item_id IN (
    SELECT ii.id 
    FROM inventory_items ii
    WHERE ii.id NOT IN (SELECT id FROM available_inventory_items)
)
AND id NOT IN (
    SELECT property_card_entry_id 
    FROM custodian_slip_items 
    WHERE property_card_entry_id IS NOT NULL
);

-- 6. Reset the item's assignment status to make it available
UPDATE inventory_items 
SET assignment_status = NULL
WHERE id NOT IN (SELECT id FROM available_inventory_items);

-- 7. Verify the fix worked
SELECT 
    'After Fix - Summary' as check_type,
    (SELECT COUNT(*) FROM inventory_items) as total_items,
    (SELECT COUNT(*) FROM available_inventory_items) as available_items,
    (SELECT COUNT(*) FROM inventory_items) - (SELECT COUNT(*) FROM available_inventory_items) as calculated_issued_items,
    'Should now be 0' as note;

-- 8. Show the item that was fixed
SELECT 
    'Fixed Item' as check_type,
    ii.id,
    ii.property_number,
    ii.description,
    ii.status,
    ii.condition,
    ii.assignment_status,
    'Now should be available' as status
FROM inventory_items ii
WHERE ii.id NOT IN (SELECT id FROM available_inventory_items);
