-- Check current category constraint
-- Run this in Supabase SQL Editor to see what values are allowed

-- Check the current constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'inventory_items'::regclass 
AND conname LIKE '%category%';

-- Check what categories currently exist
SELECT DISTINCT category FROM inventory_items;

-- Check the constraint details
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.check_clause
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.check_constraints AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.constraint_schema = tc.table_schema
WHERE tc.constraint_type = 'CHECK' 
    AND tc.table_name = 'inventory_items'
    AND kcu.column_name = 'category';
