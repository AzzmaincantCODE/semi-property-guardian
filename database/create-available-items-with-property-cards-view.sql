-- Create a view that only shows available inventory items that have property cards
-- This prevents users from selecting items without property cards for custodian slips

-- Drop existing view if it exists
DROP VIEW IF EXISTS available_inventory_items_with_property_cards;

-- Create new view that joins with property_cards table
CREATE VIEW available_inventory_items_with_property_cards AS
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
  ii.custodian,
  ii.custodian_position,
  ii.assignment_status,
  ii.assigned_date,
  pc.id as property_card_id,
  pc.entity_name as property_card_entity_name
FROM inventory_items ii
INNER JOIN property_cards pc ON ii.id = pc.inventory_item_id
WHERE ii.status = 'Active' 
  AND ii.condition = 'Serviceable'
  AND (ii.assignment_status IS NULL OR ii.assignment_status = 'Available')
  AND (ii.custodian IS NULL OR ii.custodian = '');

-- Grant permissions
GRANT SELECT ON available_inventory_items_with_property_cards TO authenticated;

-- Test the view
SELECT 'Available items with property cards count:' as test, COUNT(*) as count FROM available_inventory_items_with_property_cards;
SELECT 'Total available items count:' as test, COUNT(*) as count FROM available_inventory_items;
SELECT 'Items without property cards:' as test, COUNT(*) as count 
FROM available_inventory_items avi
LEFT JOIN property_cards pc ON avi.id = pc.inventory_item_id
WHERE pc.id IS NULL;
