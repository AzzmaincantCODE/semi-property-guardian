-- Fix the missing item that's being incorrectly counted as "issued"
-- The item with status "Missing" should not be counted as issued

-- 1. Find the missing item that's causing the issue
SELECT 
    'Missing Item Details' as check_type,
    id,
    property_number,
    description,
    status,
    condition,
    assignment_status,
    created_at,
    'This item is marked as Missing but being counted as issued' as issue
FROM inventory_items 
WHERE status = 'Missing' 
OR condition = 'Unserviceable'
ORDER BY created_at DESC;

-- 2. Check if this item is in custodian slip items (it shouldn't be)
SELECT 
    'Missing Item in Custodian Slip Items' as check_type,
    ii.id,
    ii.property_number,
    ii.description,
    csi.slip_id,
    cs.slip_number,
    cs.slip_status,
    'Item is in custodian slip items but should not be' as issue
FROM inventory_items ii
JOIN custodian_slip_items csi ON ii.id = csi.inventory_item_id
LEFT JOIN custodian_slips cs ON csi.slip_id = cs.id
WHERE ii.status = 'Missing' OR ii.condition = 'Unserviceable';

-- 3. Check if this item is in property card entries (it shouldn't be)
SELECT 
    'Missing Item in Property Card Entries' as check_type,
    ii.id,
    ii.property_number,
    ii.description,
    pce.id as property_card_entry_id,
    'Item is in property card entries but should not be' as issue
FROM inventory_items ii
JOIN property_card_entries pce ON ii.id = pce.inventory_item_id
WHERE ii.status = 'Missing' OR ii.condition = 'Unserviceable';

-- 4. Fix the issue by removing the missing item from all assignment references
-- Remove from custodian slip items
DELETE FROM custodian_slip_items 
WHERE inventory_item_id IN (
    SELECT id FROM inventory_items 
    WHERE status = 'Missing' OR condition = 'Unserviceable'
);

-- 5. Remove from property card entries
DELETE FROM property_card_entries 
WHERE inventory_item_id IN (
    SELECT id FROM inventory_items 
    WHERE status = 'Missing' OR condition = 'Unserviceable'
);

-- 6. Reset assignment status for missing items
UPDATE inventory_items 
SET assignment_status = NULL
WHERE status = 'Missing' OR condition = 'Unserviceable';

-- 7. Verify the fix worked
SELECT 
    'After Fix - Summary' as check_type,
    (SELECT COUNT(*) FROM inventory_items) as total_items,
    (SELECT COUNT(*) FROM available_inventory_items) as available_items,
    (SELECT COUNT(*) FROM inventory_items) - (SELECT COUNT(*) FROM available_inventory_items) as calculated_issued_items,
    'Missing items should not be counted as issued' as note;

-- 8. Show the corrected counts
SELECT 
    'Corrected Counts' as check_type,
    (SELECT COUNT(*) FROM inventory_items WHERE status = 'Active' AND condition = 'Serviceable') as truly_available_items,
    (SELECT COUNT(*) FROM inventory_items WHERE status = 'Missing' OR condition = 'Unserviceable') as missing_unserviceable_items,
    (SELECT COUNT(*) FROM inventory_items WHERE status = 'Active' AND condition = 'Serviceable' AND id NOT IN (SELECT id FROM available_inventory_items)) as truly_issued_items,
    'This should show the correct breakdown' as note;
