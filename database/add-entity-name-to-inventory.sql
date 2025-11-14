-- Add entity_name column to inventory_items table
-- This column will store the inputable entity name for property cards

-- Add the column
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS entity_name TEXT;

-- Add a comment to explain the column
COMMENT ON COLUMN inventory_items.entity_name IS 'Inputable entity name used for property cards, separate from auto-generated description';

-- Update existing records to have a default entity name based on brand, model, serial
-- This ensures backward compatibility
UPDATE inventory_items 
SET entity_name = TRIM(CONCAT(
  COALESCE(brand, ''), 
  CASE WHEN brand IS NOT NULL AND brand != '' AND model IS NOT NULL AND model != '' THEN ' ' ELSE '' END,
  COALESCE(model, ''),
  CASE WHEN (brand IS NOT NULL AND brand != '') OR (model IS NOT NULL AND model != '') THEN 
    CASE WHEN serial_number IS NOT NULL AND serial_number != '' THEN ' ' ELSE '' END
  ELSE '' END,
  COALESCE(serial_number, '')
))
WHERE entity_name IS NULL OR entity_name = '';

-- Make the column NOT NULL with a default value for new records
ALTER TABLE inventory_items 
ALTER COLUMN entity_name SET DEFAULT '';

-- Add a constraint to ensure entity_name is not null
ALTER TABLE inventory_items 
ALTER COLUMN entity_name SET NOT NULL;

-- Update the available_inventory_items view to include entity_name
DROP VIEW IF EXISTS available_inventory_items;
CREATE VIEW available_inventory_items AS
SELECT 
  ii.id,
  ii.property_number,
  ii.description,
  ii.brand,
  ii.model,
  ii.serial_number,
  ii.entity_name,
  ii.unit_of_measure,
  ii.quantity,
  ii.unit_cost,
  ii.total_cost,
  ii.date_acquired,
  ii.supplier,
  ii.condition,
  ii.custodian,
  ii.custodian_position,
  ii.accountable_officer,
  ii.fund_source,
  ii.remarks,
  ii.last_inventory_date,
  ii.category,
  ii.status,
  ii.estimated_useful_life,
  ii.estimated_useful_life_override,
  ii.created_at,
  ii.updated_at,
  CASE 
    WHEN ii.custodian IS NOT NULL AND ii.custodian != '' THEN 'Assigned'
    ELSE 'Available'
  END as assignment_status,
  CASE 
    WHEN ii.custodian IS NOT NULL AND ii.custodian != '' THEN ii.updated_at
    ELSE NULL
  END as assigned_date
FROM inventory_items ii
WHERE ii.status = 'Active' 
  AND ii.condition = 'Serviceable'
  AND (ii.custodian IS NULL OR ii.custodian = '');

