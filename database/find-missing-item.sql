-- Find the missing 5th item that shows on dashboard but not in available view
-- This script will help identify the discrepancy

-- 1. Get all inventory items with their details
SELECT 
    'All Inventory Items' as check_type,
    id,
    property_number,
    description,
    status,
    condition,
    assignment_status,
    created_at
FROM inventory_items
ORDER BY created_at DESC;

-- 2. Get available inventory items from the view
SELECT 
    'Available View Items' as check_type,
    id,
    property_number,
    description,
    status,
    condition,
    assignment_status
FROM available_inventory_items
ORDER BY created_at DESC;

-- 3. Find items that are in inventory_items but NOT in available_inventory_items
SELECT 
    'Missing from Available View' as check_type,
    ii.id,
    ii.property_number,
    ii.description,
    ii.status,
    ii.condition,
    ii.assignment_status,
    'Not in available view' as reason
FROM inventory_items ii
LEFT JOIN available_inventory_items avi ON ii.id = avi.id
WHERE avi.id IS NULL;

-- 4. Check the available_inventory_items view definition
SELECT 
    'View Definition' as check_type,
    definition
FROM pg_views 
WHERE viewname = 'available_inventory_items';

-- 5. Check if there are any items with specific status/condition that might be excluded
SELECT 
    'Items by Status' as check_type,
    status,
    COUNT(*) as count
FROM inventory_items
GROUP BY status;

SELECT 
    'Items by Condition' as check_type,
    condition,
    COUNT(*) as count
FROM inventory_items
GROUP BY condition;

-- 6. Check for items that might be in custodian slip items but slips are deleted
SELECT 
    'Items in Deleted Slips' as check_type,
    ii.id,
    ii.property_number,
    ii.description,
    csi.slip_id,
    'In custodian slip items but slip might be deleted' as reason
FROM inventory_items ii
JOIN custodian_slip_items csi ON ii.id = csi.inventory_item_id
LEFT JOIN custodian_slips cs ON csi.slip_id = cs.id
WHERE cs.id IS NULL;

-- 7. Check for items in property card entries
SELECT 
    'Items in Property Card Entries' as check_type,
    ii.id,
    ii.property_number,
    ii.description,
    pce.id as property_card_entry_id,
    'In property card entries' as reason
FROM inventory_items ii
JOIN property_card_entries pce ON ii.id = pce.inventory_item_id;

-- 8. Manual check: what should be available vs what actually is
SELECT 
    'Manual Available Check' as check_type,
    ii.id,
    ii.property_number,
    ii.description,
    ii.status,
    ii.condition,
    ii.assignment_status,
    CASE 
        WHEN ii.status = 'Active' AND ii.condition = 'Serviceable' AND ii.assignment_status IS NULL 
        THEN 'Should be available'
        ELSE 'Should NOT be available'
    END as availability_status
FROM inventory_items ii
ORDER BY ii.created_at DESC;
