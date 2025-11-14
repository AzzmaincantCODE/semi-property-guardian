-- SIMPLE MIGRATION: Just add the missing columns
-- Run this in Supabase SQL Editor

-- Add missing columns
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS entity_name TEXT DEFAULT '(PROVINCIAL GOVERNMENT OF APAYAO)';

ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS sub_category TEXT;

-- Update existing records to have default entity name
UPDATE inventory_items 
SET entity_name = '(PROVINCIAL GOVERNMENT OF APAYAO)'
WHERE entity_name IS NULL OR entity_name = '';

-- Make entity_name NOT NULL
ALTER TABLE inventory_items 
ALTER COLUMN entity_name SET NOT NULL;

-- Verify the columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'inventory_items' 
AND table_schema = 'public'
AND column_name IN ('entity_name', 'sub_category')
ORDER BY ordinal_position;
