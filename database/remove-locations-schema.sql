-- Remove locations from database schema
-- Run this in Supabase SQL Editor

-- Step 1: Check if locations table exists and has data
SELECT 
  'BEFORE REMOVAL' as status,
  COUNT(*) as location_count
FROM information_schema.tables 
WHERE table_name = 'locations' AND table_schema = 'public';

-- Step 2: Check if any inventory items reference locations
SELECT 
  'INVENTORY LOCATION REFERENCES' as status,
  COUNT(*) as items_with_locations
FROM inventory_items 
WHERE location_id IS NOT NULL;

-- Step 3: Remove location_id column from inventory_items
ALTER TABLE public.inventory_items 
DROP COLUMN IF EXISTS location_id;

-- Step 4: Drop the locations table
DROP TABLE IF EXISTS public.locations CASCADE;

-- Step 5: Verify removal
SELECT 
  'AFTER REMOVAL' as status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'locations' AND table_schema = 'public'
    ) 
    THEN 'Locations table still exists' 
    ELSE 'Locations table successfully removed' 
  END as result;

-- Step 6: Check inventory_items structure
SELECT 
  'INVENTORY_ITEMS COLUMNS' as status,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'inventory_items' 
  AND table_schema = 'public'
  AND column_name LIKE '%location%'
ORDER BY ordinal_position;

SELECT 'Location removal completed successfully' as final_status;
