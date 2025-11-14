-- Test to see what's happening with inventory counts
-- This will help identify why inventory shows 4 items instead of 5

-- 1. Check all items in inventory_items table
SELECT 
    'All Inventory Items' as check_type,
    COUNT(*) as count
FROM inventory_items;

-- 2. Check all items with details
SELECT 
    'All Items Details' as check_type,
    id,
    property_number,
    description,
    status,
    condition,
    assignment_status
FROM inventory_items
ORDER BY created_at DESC;

-- 3. Check available_inventory_items view
SELECT 
    'Available View Items' as check_type,
    COUNT(*) as count
FROM available_inventory_items;

-- 4. Check what's in the available view
SELECT 
    'Available View Details' as check_type,
    id,
    property_number,
    description,
    status,
    condition,
    assignment_status
FROM available_inventory_items
ORDER BY created_at DESC;

-- 5. Find items that are NOT in available view
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

-- 6. Check if there are any items with specific status/condition that might be filtered out
SELECT 
    'Items by Status and Condition' as check_type,
    status,
    condition,
    COUNT(*) as count
FROM inventory_items
GROUP BY status, condition
ORDER BY status, condition;
