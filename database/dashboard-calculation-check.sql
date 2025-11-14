-- Check how the dashboard calculates issued vs unissued items
-- This will help identify the discrepancy in dashboard calculations

-- 1. Check the dashboard query logic - get all items
SELECT 
    'Dashboard - All Items' as check_type,
    COUNT(*) as count
FROM inventory_items;

-- 2. Check the dashboard query logic - get available items from view
SELECT 
    'Dashboard - Available Items (from view)' as check_type,
    COUNT(*) as count
FROM available_inventory_items;

-- 3. Check the dashboard query logic - calculate issued items
SELECT 
    'Dashboard - Calculated Issued Items' as check_type,
    (SELECT COUNT(*) FROM inventory_items) - (SELECT COUNT(*) FROM available_inventory_items) as issued_count;

-- 4. Check if there are any items that should be available but aren't in the view
SELECT 
    'Items that should be available but missing from view' as check_type,
    ii.id,
    ii.property_number,
    ii.description,
    ii.status,
    ii.condition,
    ii.assignment_status,
    'Missing from available view' as issue
FROM inventory_items ii
WHERE ii.status = 'Active' 
AND ii.condition = 'Serviceable' 
AND ii.assignment_status IS NULL
AND ii.id NOT IN (SELECT id FROM available_inventory_items);

-- 5. Check if there are any items in the view that shouldn't be there
SELECT 
    'Items in view that shouldn\'t be available' as check_type,
    avi.id,
    avi.property_number,
    avi.description,
    avi.status,
    avi.condition,
    avi.assignment_status,
    'Should not be in available view' as issue
FROM available_inventory_items avi
WHERE avi.status != 'Active' 
OR avi.condition != 'Serviceable' 
OR avi.assignment_status IS NOT NULL;

-- 6. Check for any items that might be in custodian slip items (issued)
SELECT 
    'Items in Custodian Slip Items' as check_type,
    ii.id,
    ii.property_number,
    ii.description,
    csi.slip_id,
    cs.slip_number,
    cs.slip_status,
    'Issued via custodian slip' as status
FROM inventory_items ii
JOIN custodian_slip_items csi ON ii.id = csi.inventory_item_id
JOIN custodian_slips cs ON csi.slip_id = cs.id
WHERE cs.slip_status = 'Issued';

-- 7. Check for any items in property card entries (might be issued)
SELECT 
    'Items in Property Card Entries' as check_type,
    ii.id,
    ii.property_number,
    ii.description,
    pce.id as property_card_entry_id,
    'In property card entries' as status
FROM inventory_items ii
JOIN property_card_entries pce ON ii.id = pce.inventory_item_id;

-- 8. Summary of the discrepancy
SELECT 
    'Summary' as check_type,
    (SELECT COUNT(*) FROM inventory_items) as total_items,
    (SELECT COUNT(*) FROM available_inventory_items) as available_items,
    (SELECT COUNT(*) FROM inventory_items) - (SELECT COUNT(*) FROM available_inventory_items) as calculated_issued_items,
    'If calculated_issued_items > 0, there are items not in available view' as note;
