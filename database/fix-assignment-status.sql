-- Fix assignment status inconsistencies
-- This script will clean up assignment status issues

-- 1. First, let's see what we're working with
SELECT 
    'Before Fix - Available Items' as status,
    COUNT(*) as count
FROM available_inventory_items;

SELECT 
    'Before Fix - Total Items' as status,
    COUNT(*) as count
FROM inventory_items;

-- 2. Clear any orphaned assignment_status fields
UPDATE inventory_items 
SET assignment_status = NULL 
WHERE assignment_status IS NOT NULL;

-- 3. Remove any orphaned custodian slip items (items that reference non-existent slips)
DELETE FROM custodian_slip_items 
WHERE slip_id NOT IN (
    SELECT id FROM custodian_slips
);

-- 4. Remove any orphaned property card entries that reference non-existent custodian slip items
DELETE FROM property_card_entries 
WHERE id IN (
    SELECT pce.id 
    FROM property_card_entries pce
    LEFT JOIN custodian_slip_items csi ON pce.id = csi.property_card_entry_id
    WHERE csi.property_card_entry_id IS NULL
);

-- 5. Reset all items to be available (clear any assignment status)
UPDATE inventory_items 
SET 
    assignment_status = NULL,
    status = 'Active',
    condition = 'Serviceable'
WHERE status = 'Active';

-- 6. Verify the fix
SELECT 
    'After Fix - Available Items' as status,
    COUNT(*) as count
FROM available_inventory_items;

SELECT 
    'After Fix - Total Items' as status,
    COUNT(*) as count
FROM inventory_items;

-- 7. Show sample of now-available items
SELECT 
    'Sample Available Items' as status,
    id,
    property_number,
    description,
    assignment_status,
    status,
    condition
FROM available_inventory_items 
LIMIT 5;
