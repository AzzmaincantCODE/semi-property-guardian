-- Add sub_category column to inventory_items table
-- This column will store the sub-category for Semi-Expandable items

-- Add the column
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS sub_category TEXT;

-- Also ensure entity_name column exists (in case this runs before entity name migration)
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS entity_name TEXT;

-- Add a comment to explain the column
COMMENT ON COLUMN inventory_items.sub_category IS 'Sub-category for Semi-Expandable items: Small Value Expendable (below ₱5k) or High Value Expendable (₱5k-₱50k)';

-- Add a check constraint to ensure valid sub-category values
ALTER TABLE inventory_items 
ADD CONSTRAINT check_sub_category 
CHECK (
  sub_category IS NULL 
  OR sub_category IN ('Small Value Expendable', 'High Value Expendable')
);

-- Update the available_inventory_items view to include sub_category
DROP VIEW IF EXISTS available_inventory_items;
CREATE VIEW available_inventory_items AS
SELECT 
  ii.id,
  ii.property_number,
  ii.description,
  ii.brand,
  ii.model,
  ii.serial_number,
  COALESCE(ii.entity_name, '') as entity_name,
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
  ii.sub_category,
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

-- Update the annex_property_card_view to include sub_category
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
  ii.fund_source,
  ii.supplier,
  ii.custodian,
  ii.custodian_position,
  ii.accountable_officer,
  c.name as custodian_name,
  fs.name as fund_source_name,
  s.name as supplier_name
FROM property_cards pc
LEFT JOIN inventory_items ii ON pc.inventory_item_id = ii.id
LEFT JOIN custodians c ON ii.custodian = c.id
LEFT JOIN fund_sources fs ON ii.fund_source = fs.id
LEFT JOIN suppliers s ON ii.supplier = s.id;
