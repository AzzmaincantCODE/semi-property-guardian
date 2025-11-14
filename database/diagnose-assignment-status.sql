-- Diagnose assignment status inconsistencies
-- This script will help identify why items show as assigned when no custodian slips exist

-- 1. Check all custodian slips
SELECT 
    'All Custodian Slips' as check_type,
    COUNT(*) as count
FROM custodian_slips;

-- 2. Check all custodian slip items
SELECT 
    'All Custodian Slip Items' as check_type,
    COUNT(*) as count
FROM custodian_slip_items;

-- 3. Check available inventory items (should show unassigned items)
SELECT 
    'Available Inventory Items' as check_type,
    COUNT(*) as count
FROM available_inventory_items;

-- 4. Check total inventory items
SELECT 
    'Total Inventory Items' as check_type,
    COUNT(*) as count
FROM inventory_items;

-- 5. Check for items that might be incorrectly marked as assigned
SELECT 
    'Items with assignment status' as check_type,
    COUNT(*) as count
FROM inventory_items 
WHERE assignment_status IS NOT NULL;

-- 6. Check for items that are in custodian slip items but slips don't exist
SELECT 
    'Orphaned Custodian Slip Items' as check_type,
    COUNT(*) as count
FROM custodian_slip_items csi
LEFT JOIN custodian_slips cs ON csi.slip_id = cs.id
WHERE cs.id IS NULL;

-- 7. Check for items that are in property card entries but not in available view
SELECT 
    'Items in Property Card Entries' as check_type,
    COUNT(*) as count
FROM property_card_entries;

-- 8. Check the available_inventory_items view definition
SELECT 
    'Available View Definition' as check_type,
    definition
FROM pg_views 
WHERE viewname = 'available_inventory_items';

-- 9. Sample of items that should be available but might not be
SELECT 
    'Sample Available Items' as check_type,
    id,
    property_number,
    description,
    assignment_status,
    status,
    condition
FROM inventory_items 
WHERE status = 'Active' 
AND condition = 'Serviceable'
LIMIT 5;
