-- Remove parentheses from entity_name fields in database
-- Run this in Supabase SQL Editor to clean up existing data

-- Update inventory_items table: Remove parentheses from entity_name
-- This handles cases where parentheses are at the start, end, or both
UPDATE public.inventory_items
SET entity_name = TRIM(BOTH '()' FROM TRIM(entity_name))
WHERE entity_name IS NOT NULL 
  AND (entity_name LIKE '(%' OR entity_name LIKE '%)' OR entity_name LIKE '(%' || '%' || '%)');

-- Update property_cards table: Remove parentheses from entity_name
UPDATE public.property_cards
SET entity_name = TRIM(BOTH '()' FROM TRIM(entity_name))
WHERE entity_name IS NOT NULL 
  AND (entity_name LIKE '(%' OR entity_name LIKE '%)' OR entity_name LIKE '(%' || '%' || '%)');

-- Also handle the case where entire string is wrapped in parentheses
UPDATE public.inventory_items
SET entity_name = REGEXP_REPLACE(entity_name, '^\((.+)\)$', '\1', 'g')
WHERE entity_name IS NOT NULL 
  AND entity_name ~ '^\(.+\)$';

UPDATE public.property_cards
SET entity_name = REGEXP_REPLACE(entity_name, '^\((.+)\)$', '\1', 'g')
WHERE entity_name IS NOT NULL 
  AND entity_name ~ '^\(.+\)$';

-- Update default value for new inventory_items (remove parentheses from default)
ALTER TABLE public.inventory_items
ALTER COLUMN entity_name SET DEFAULT 'PROVINCIAL GOVERNMENT OF APAYAO';

-- Verify the updates
SELECT 
  'inventory_items' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN entity_name LIKE '(%' OR entity_name LIKE '%)' THEN 1 END) as records_with_parentheses
FROM public.inventory_items
UNION ALL
SELECT 
  'property_cards' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN entity_name LIKE '(%' OR entity_name LIKE '%)' THEN 1 END) as records_with_parentheses
FROM public.property_cards;

-- Show sample of cleaned data
SELECT 
  'inventory_items' as source,
  id::text,
  property_number,
  entity_name
FROM public.inventory_items
UNION ALL
SELECT 
  'property_cards' as source,
  id::text,
  property_number,
  entity_name
FROM public.property_cards
LIMIT 10;

