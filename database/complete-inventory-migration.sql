-- Complete Inventory Migration
-- This script adds both entity_name and sub_category columns to inventory_items
-- and updates all related views

-- Add entity_name column if it doesn't exist
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS entity_name TEXT;

-- Add sub_category column if it doesn't exist  
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS sub_category TEXT;

-- Add comments to explain the columns
COMMENT ON COLUMN inventory_items.entity_name IS 'Inputable entity name used for property cards, separate from auto-generated description. Recommended: (PROVINCIAL GOVERNMENT OF APAYAO)';
COMMENT ON COLUMN inventory_items.sub_category IS 'Sub-category for Semi-Expendable items: Small Value Expendable (₱5k or less) or High Value Expendable (above ₱5k)';

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

-- Make entity_name NOT NULL with a default value for new records
ALTER TABLE inventory_items 
ALTER COLUMN entity_name SET DEFAULT '(PROVINCIAL GOVERNMENT OF APAYAO)';

-- Add a constraint to ensure entity_name is not null
ALTER TABLE inventory_items 
ALTER COLUMN entity_name SET NOT NULL;

-- Add a check constraint to ensure valid sub-category values
-- First drop the constraint if it exists, then add it
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'check_sub_category' 
    AND table_name = 'inventory_items'
  ) THEN
    ALTER TABLE inventory_items DROP CONSTRAINT check_sub_category;
  END IF;
END $$;

ALTER TABLE inventory_items 
ADD CONSTRAINT check_sub_category 
CHECK (
  sub_category IS NULL 
  OR sub_category IN ('Small Value Expendable', 'High Value Expendable')
);

-- Update the available_inventory_items view
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
  ii.supplier_id,
  ii.condition,
  ii.fund_source_id,
  ii.remarks,
  ii.last_inventory_date,
  ii.category,
  ii.sub_category,
  ii.status,
  ii.estimated_useful_life,
  ii.estimated_useful_life_override,
  ii.created_at,
  ii.updated_at,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM custodian_slip_items csi 
      WHERE csi.inventory_item_id = ii.id 
      AND EXISTS (SELECT 1 FROM custodian_slips cs WHERE cs.id = csi.slip_id AND cs.slip_status = 'Issued')
    ) THEN 'Assigned'
    ELSE 'Available'
  END as assignment_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM custodian_slip_items csi 
      WHERE csi.inventory_item_id = ii.id 
      AND EXISTS (SELECT 1 FROM custodian_slips cs WHERE cs.id = csi.slip_id AND cs.slip_status = 'Issued')
    ) THEN ii.updated_at
    ELSE NULL
  END as assigned_date
FROM inventory_items ii
WHERE ii.status = 'Active' 
  AND ii.condition = 'Serviceable'
  AND NOT EXISTS (
    SELECT 1 FROM custodian_slip_items csi 
    WHERE csi.inventory_item_id = ii.id 
    AND EXISTS (SELECT 1 FROM custodian_slips cs WHERE cs.id = csi.slip_id AND cs.slip_status = 'Issued')
  );

-- Update the annex_property_card_view
DROP VIEW IF EXISTS annex_property_card_view;
CREATE VIEW annex_property_card_view AS
SELECT 
  pc.id,
  pc.property_number,
  pc.description,
  pc.entity_name,
  pc.fund_cluster,
  pc.semi_expendable_property,
  pc.date_acquired,
  pc.remarks,
  pc.inventory_item_id,
  pc.created_at,
  pc.updated_at,
  ii.brand,
  ii.model,
  ii.serial_number,
  ii.unit_of_measure,
  ii.quantity,
  ii.unit_cost,
  ii.total_cost,
  ii.condition,
  ii.category,
  ii.sub_category,
  ii.fund_source_id,
  ii.supplier_id,
  fs.name as fund_source_name,
  s.name as supplier_name
FROM property_cards pc
LEFT JOIN inventory_items ii ON pc.inventory_item_id = ii.id
LEFT JOIN fund_sources fs ON ii.fund_source_id = fs.id
LEFT JOIN suppliers s ON ii.supplier_id = s.id;
