-- URGENT: Run this migration in Supabase SQL Editor
-- This will add the missing columns that are causing inventory creation to fail

-- Step 1: Add missing columns
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS entity_name TEXT DEFAULT '(PROVINCIAL GOVERNMENT OF APAYAO)';

ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS sub_category TEXT;

-- Step 2: Update existing records
UPDATE inventory_items 
SET entity_name = COALESCE(entity_name, '(PROVINCIAL GOVERNMENT OF APAYAO)')
WHERE entity_name IS NULL;

-- Step 3: Make entity_name NOT NULL
ALTER TABLE inventory_items 
ALTER COLUMN entity_name SET NOT NULL;

-- Step 4: Add constraint for sub_category (only if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'check_sub_category' 
    AND table_name = 'inventory_items'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE inventory_items 
    ADD CONSTRAINT check_sub_category 
    CHECK (sub_category IS NULL OR sub_category IN ('Small Value Expendable', 'High Value Expendable'));
  END IF;
END $$;

-- Step 5: Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'inventory_items' 
AND table_schema = 'public'
AND column_name IN ('entity_name', 'sub_category')
ORDER BY ordinal_position;

-- Step 6: Check if there are any existing items
SELECT COUNT(*) as total_items FROM inventory_items;
