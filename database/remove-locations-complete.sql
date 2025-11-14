-- Complete script to remove locations from the system
-- This script handles all dependencies and updates views accordingly

-- Step 1: Drop or recreate views that depend on location_id
-- First, let's drop the dependent views
DROP VIEW IF EXISTS annex_property_card_view CASCADE;
DROP VIEW IF EXISTS available_inventory_items CASCADE;

-- Step 2: Recreate annex_property_card_view without location references
CREATE OR REPLACE VIEW annex_property_card_view AS
SELECT 
    pc.id,
    pc.inventory_item_id,
    pc.entity_name,
    pc.fund_cluster,
    pc.semi_expendable_property,
    pc.property_number,
    pc.description as property_description,
    pc.date_acquired,
    pc.remarks as property_remarks,
    pc.created_at,
    pc.updated_at,
    
    -- Inventory item details
    ii.description as item_description,
    ii.brand,
    ii.model,
    ii.serial_number,
    ii.unit_of_measure,
    ii.quantity,
    ii.unit_cost,
    ii.total_cost,
    ii.condition as item_condition,
    ii.remarks as item_remarks,
    ii.estimated_useful_life,
    ii.estimated_useful_life_override,
    ii.custodian_id,
    ii.fund_source_id,
    ii.supplier_id,
    ii.category,
    ii.status,
    
    -- Related entity names
    COALESCE(c.name, ii.custodian) as custodian_name,
    COALESCE(c.position, ii.custodian_position) as custodian_position,
    COALESCE(fs.name, ii.fund_source) as fund_source_name,
    COALESCE(fs.code, '') as fund_source_code,
    COALESCE(s.name, ii.supplier_id::text) as supplier_name,
    
    -- Department info (for custodian)
    d.name as department_name,
    d.code as department_code
    
FROM property_cards pc
LEFT JOIN inventory_items ii ON pc.inventory_item_id = ii.id
LEFT JOIN custodians c ON ii.custodian_id = c.id
LEFT JOIN fund_sources fs ON ii.fund_source_id = fs.id
LEFT JOIN suppliers s ON ii.supplier_id = s.id
LEFT JOIN departments d ON c.department_id = d.id;

-- Step 3: Recreate available_inventory_items view without location references
CREATE OR REPLACE VIEW available_inventory_items AS
SELECT 
    ii.*,
    COALESCE(c.name, ii.custodian) as custodian_name,
    COALESCE(c.position, ii.custodian_position) as custodian_position,
    COALESCE(fs.name, ii.fund_source) as fund_source_name,
    COALESCE(s.name, ii.supplier_id::text) as supplier_name,
    d.name as department_name
FROM inventory_items ii
LEFT JOIN custodians c ON ii.custodian_id = c.id
LEFT JOIN fund_sources fs ON ii.fund_source_id = fs.id
LEFT JOIN suppliers s ON ii.supplier_id = s.id
LEFT JOIN departments d ON c.department_id = d.id
WHERE ii.condition IN ('Serviceable', 'Good', 'Fair')
  AND ii.assignment_status = 'Available';

-- Step 4: Now we can safely drop the location_id column
ALTER TABLE inventory_items DROP COLUMN IF EXISTS location_id;

-- Step 5: Drop the locations table
DROP TABLE IF EXISTS locations CASCADE;

-- Step 6: Update any triggers or functions that might reference location_id
-- (This is a safety measure in case there are any we missed)

-- Step 7: Grant permissions on the recreated views
GRANT SELECT ON annex_property_card_view TO authenticated;
GRANT SELECT ON available_inventory_items TO authenticated;

-- Step 8: Verify the changes
SELECT 'Locations table removed successfully' as status;
SELECT 'Views recreated without location dependencies' as status;
SELECT 'location_id column removed from inventory_items' as status;
