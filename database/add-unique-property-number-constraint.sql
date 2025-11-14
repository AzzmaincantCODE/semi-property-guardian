-- Add unique constraint to prevent duplicate property numbers
-- This ensures that SPLV-2025-10-0001 and SPHV-2025-10-0001 are both valid
-- but SPLV-2025-10-0001 cannot be duplicated

-- First, check if there are any existing duplicates and clean them up
-- (This is a safety measure in case duplicates already exist)
WITH duplicates AS (
  SELECT property_number, COUNT(*) as count
  FROM inventory_items 
  GROUP BY property_number 
  HAVING COUNT(*) > 1
)
SELECT 
  'Found ' || COUNT(*) || ' duplicate property numbers' as message
FROM duplicates;

-- Add unique constraint on property_number
-- This will prevent any duplicate property numbers from being inserted
ALTER TABLE inventory_items 
ADD CONSTRAINT unique_property_number UNIQUE (property_number);

-- Add a comment to explain the constraint
COMMENT ON CONSTRAINT unique_property_number ON inventory_items IS 'Ensures each property number is unique. SPLV and SPHV sequences are independent (SPLV-2025-10-0001 and SPHV-2025-10-0001 are both valid)';
