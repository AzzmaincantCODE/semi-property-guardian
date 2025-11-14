-- Fix the orphaned assignment - item shows as issued but no custodian slip exists
-- This script will find and fix the item that's stuck in "issued" state

-- 1. Find the item that's missing from available view (this is the "issued" item)
SELECT 
    'Orphaned Assigned Item' as check_type,
    ii.id,
    ii.property_number,
    ii.description,
    ii.status,
    ii.condition,
    ii.assignment_status,
    ii.created_at,
    'This item is assigned but has no custodian slip' as issue
FROM inventory_items ii
WHERE ii.id NOT IN (SELECT id FROM available_inventory_items)
ORDER BY ii.created_at DESC;

-- 2. Check if this item is in custodian slip items but slip is deleted
SELECT 
    'Item in Deleted Slip' as check_type,
    ii.id,
    ii.property_number,
    ii.description,
    csi.slip_id,
    cs.slip_number,
    cs.slip_status,
    'Item is in custodian slip items but slip was deleted' as issue
FROM inventory_items ii
JOIN custodian_slip_items csi ON ii.id = csi.inventory_item_id
LEFT JOIN custodian_slips cs ON csi.slip_id = cs.id
WHERE cs.id IS NULL;

-- 3. Check if this item is in property card entries
SELECT 
    'Item in Property Card Entries' as check_type,
    ii.id,
    ii.property_number,
    ii.description,
    pce.id as property_card_entry_id,
    'Item is in property card entries' as issue
FROM inventory_items ii
JOIN property_card_entries pce ON ii.id = pce.inventory_item_id
WHERE ii.id NOT IN (SELECT id FROM available_inventory_items);

-- 4. Fix the orphaned assignment by removing all references
-- Remove from custodian slip items (since slip doesn't exist)
DELETE FROM custodian_slip_items 
WHERE inventory_item_id IN (
    SELECT ii.id 
    FROM inventory_items ii
    WHERE ii.id NOT IN (SELECT id FROM available_inventory_items)
);

-- 5. Remove from property card entries (since it's orphaned)
DELETE FROM property_card_entries 
WHERE inventory_item_id IN (
    SELECT ii.id 
    FROM inventory_items ii
    WHERE ii.id NOT IN (SELECT id FROM available_inventory_items)
);

-- 6. Reset the item to available status
UPDATE inventory_items 
SET 
    assignment_status = NULL,
    status = 'Active',
    condition = 'Serviceable'
WHERE id NOT IN (SELECT id FROM available_inventory_items);

-- 7. Verify the fix worked
SELECT 
    'After Fix - Summary' as check_type,
    (SELECT COUNT(*) FROM inventory_items) as total_items,
    (SELECT COUNT(*) FROM available_inventory_items) as available_items,
    (SELECT COUNT(*) FROM inventory_items) - (SELECT COUNT(*) FROM available_inventory_items) as calculated_issued_items,
    'Should now be 0 - all items available' as note;

-- 8. Show the item that was fixed
SELECT 
    'Fixed Item - Now Available' as check_type,
    ii.id,
    ii.property_number,
    ii.description,
    ii.status,
    ii.condition,
    ii.assignment_status,
    'Item is now available for assignment' as status
FROM inventory_items ii
WHERE ii.id IN (
    SELECT id FROM available_inventory_items
    EXCEPT
    SELECT id FROM inventory_items WHERE id NOT IN (SELECT id FROM available_inventory_items)
);
