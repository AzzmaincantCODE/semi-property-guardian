-- Quick Database Schema Check
-- Run this in Supabase SQL Editor to check current schema

-- Check if the new columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'inventory_items' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if there are any existing inventory items
SELECT COUNT(*) as total_items FROM inventory_items;

-- Check the structure of existing items
SELECT 
  id, 
  property_number, 
  description, 
  brand, 
  model, 
  serial_number,
  category,
  sub_category,
  entity_name,
  condition,
  status,
  created_at
FROM inventory_items 
ORDER BY created_at DESC 
LIMIT 5;
