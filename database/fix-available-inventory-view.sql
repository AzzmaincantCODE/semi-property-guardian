-- Fix available_inventory_items view to use assignment_status field consistently
-- This ensures the view matches the actual assignment status in the database

-- Drop the existing view
DROP VIEW IF EXISTS available_inventory_items;

-- Create a consistent view that uses assignment_status field
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
  ii.custodian,
  ii.custodian_position,
  ii.assignment_status,
  ii.assigned_date
FROM inventory_items ii
WHERE ii.status = 'Active' 
  AND ii.condition = 'Serviceable'
  AND (ii.assignment_status IS NULL OR ii.assignment_status = 'Available')
  AND (ii.custodian IS NULL OR ii.custodian = '');

-- Grant permissions
GRANT SELECT ON available_inventory_items TO authenticated;

-- Test the view
SELECT 'Available items count:' as test, COUNT(*) as count FROM available_inventory_items;
SELECT 'All serviceable items count:' as test, COUNT(*) as count FROM inventory_items WHERE status = 'Active' AND condition = 'Serviceable';
SELECT 'Assigned items count:' as test, COUNT(*) as count FROM inventory_items WHERE assignment_status = 'Assigned' OR (custodian IS NOT NULL AND custodian != '');
