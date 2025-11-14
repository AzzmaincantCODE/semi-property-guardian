-- Add semi_expandable_category column to inventory_items table
-- This column stores the selected category from semi_expandable_categories lookup
-- Run this in Supabase SQL Editor

-- Add the column
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS semi_expandable_category TEXT;

-- Add a comment to explain the column
COMMENT ON COLUMN inventory_items.semi_expandable_category IS 'Selected category from semi_expandable_categories lookup table (e.g., LAND, MACHINERY, OFFICE EQUIPMENT)';

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_semi_expandable_category 
ON inventory_items(semi_expandable_category);

-- Update existing records to set a default value if needed (optional)
-- UPDATE inventory_items 
-- SET semi_expandable_category = 'MACHINERY' 
-- WHERE category = 'Semi-Expendable' AND semi_expandable_category IS NULL;

