-- Migration to remove category field dependency
-- Since all items are Semi-Expendable, we'll set all existing items to 'Semi-Expendable'
-- and eventually we can make the column nullable or remove it entirely

-- Step 1: Update all existing items to 'Semi-Expendable' category
UPDATE inventory_items 
SET category = 'Semi-Expendable'
WHERE category IS NOT NULL AND category != 'Semi-Expendable';

-- Step 2: Make category column nullable (optional - comment out if you want to keep the constraint)
-- ALTER TABLE inventory_items ALTER COLUMN category DROP NOT NULL;

-- Step 3: Update default value to 'Semi-Expendable' (if not already)
ALTER TABLE inventory_items 
ALTER COLUMN category SET DEFAULT 'Semi-Expendable';

-- Step 4: Update any views that reference category
-- Note: We'll keep category in views for backward compatibility but it will always be 'Semi-Expendable'

COMMENT ON COLUMN inventory_items.category IS 'Always "Semi-Expendable" for this system. This field is deprecated in favor of semi_expandable_category.';

