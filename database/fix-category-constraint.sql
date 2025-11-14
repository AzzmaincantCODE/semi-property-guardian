-- Fix category constraint to allow 'Semi-Expendable'
-- Run this in Supabase SQL Editor

-- Drop the old constraint
ALTER TABLE inventory_items 
DROP CONSTRAINT IF EXISTS inventory_items_category_check;

-- Add the new constraint with correct spelling
ALTER TABLE inventory_items 
ADD CONSTRAINT inventory_items_category_check 
CHECK (category IN ('Semi-Expendable', 'Equipment', 'Furniture'));

-- Update any existing 'Semi-Expandable' to 'Semi-Expendable'
UPDATE inventory_items 
SET category = 'Semi-Expendable' 
WHERE category = 'Semi-Expandable';

-- Verify the constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'inventory_items'::regclass 
AND conname LIKE '%category%';
