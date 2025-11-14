-- Restore Missing Property Cards for Items in Custodian Slips
-- This script recreates property cards for inventory items that are in custodian slips but don't have property cards

-- Step 1: Identify inventory items in custodian slips that don't have property cards
WITH items_in_slips AS (
  SELECT DISTINCT
    csi.inventory_item_id,
    ii.property_number,
    ii.description,
    ii.brand,
    ii.model,
    ii.date_acquired,
    ii.remarks,
    cs.custodian_name,
    cs.slip_number,
    cs.date_issued
  FROM custodian_slip_items csi
  JOIN inventory_items ii ON csi.inventory_item_id = ii.id
  JOIN custodian_slips cs ON csi.slip_id = cs.id
  WHERE cs.slip_status = 'Issued' -- Only for issued slips
),
items_without_cards AS (
  SELECT 
    iis.*
  FROM items_in_slips iis
  LEFT JOIN property_cards pc ON pc.inventory_item_id = iis.inventory_item_id
  WHERE pc.id IS NULL
)
SELECT 
  'ITEMS IN CUSTODIAN SLIPS WITHOUT PROPERTY CARDS' as status,
  inventory_item_id,
  property_number,
  description,
  brand,
  model,
  custodian_name,
  slip_number,
  date_issued
FROM items_without_cards
ORDER BY custodian_name, slip_number;

-- Step 2: Create property cards for these items
-- Insert property cards with recommended entity name and safe description fallback
INSERT INTO property_cards (
  entity_name,
  fund_cluster,
  semi_expendable_property,
  property_number,
  description,
  date_acquired,
  remarks,
  inventory_item_id
)
SELECT 
  '(PROVINCIAL GOVERNMENT OF APAYAO)' as entity_name,
  COALESCE(
    (SELECT name FROM fund_sources WHERE id = ii.fund_source_id),
    'General Fund'
  ) as fund_cluster,
  -- Safe description fallback: use brand + model if description is empty
  TRIM(COALESCE(
    NULLIF(TRIM(ii.description), ''),
    CASE 
      WHEN TRIM(COALESCE(ii.model, '')) != '' THEN 
        CASE 
          WHEN TRIM(COALESCE(ii.brand, '')) != '' THEN TRIM(ii.brand) || ' ' || TRIM(ii.model)
          ELSE TRIM(ii.model)
        END
      WHEN TRIM(COALESCE(ii.brand, '')) != '' THEN TRIM(ii.brand)
      ELSE 'No Description Available'
    END
  )) as semi_expendable_property,
  ii.property_number,
  -- Safe description fallback for description field too
  TRIM(COALESCE(
    NULLIF(TRIM(ii.description), ''),
    CASE 
      WHEN TRIM(COALESCE(ii.model, '')) != '' THEN 
        CASE 
          WHEN TRIM(COALESCE(ii.brand, '')) != '' THEN TRIM(ii.brand) || ' ' || TRIM(ii.model)
          ELSE TRIM(ii.model)
        END
      WHEN TRIM(COALESCE(ii.brand, '')) != '' THEN TRIM(ii.brand)
      ELSE 'No Description Available'
    END
  )) as description,
  ii.date_acquired,
  'Auto-restored property card for item in custodian slip' as remarks,
  ii.id as inventory_item_id
FROM custodian_slip_items csi
JOIN inventory_items ii ON csi.inventory_item_id = ii.id
JOIN custodian_slips cs ON csi.slip_id = cs.id
LEFT JOIN property_cards pc ON pc.inventory_item_id = ii.id
WHERE cs.slip_status = 'Issued' 
  AND pc.id IS NULL -- Only create if property card doesn't exist
ON CONFLICT DO NOTHING;

-- Step 3: Verify the restoration
SELECT 
  'VERIFICATION - Property Cards Created' as status,
  pc.property_number,
  pc.entity_name,
  pc.fund_cluster,
  pc.description,
  ii.assignment_status,
  ii.custodian,
  pc.created_at
FROM property_cards pc
JOIN inventory_items ii ON pc.inventory_item_id = ii.id
WHERE ii.assignment_status = 'Assigned'
ORDER BY pc.created_at DESC;

-- Step 4: Show custodian slips with their items and property cards
SELECT 
  'VERIFICATION - Custodian Slips with Property Cards' as status,
  cs.slip_number,
  cs.custodian_name,
  cs.date_issued,
  cs.slip_status,
  ii.property_number,
  ii.description,
  CASE 
    WHEN pc.id IS NOT NULL THEN 'Has Property Card'
    ELSE 'Missing Property Card'
  END as property_card_status
FROM custodian_slips cs
JOIN custodian_slip_items csi ON cs.id = csi.slip_id
JOIN inventory_items ii ON csi.inventory_item_id = ii.id
LEFT JOIN property_cards pc ON pc.inventory_item_id = ii.id
WHERE cs.slip_status = 'Issued'
ORDER BY cs.custodian_name, cs.slip_number, ii.property_number;

-- Step 5: Summary
SELECT 
  'SUMMARY' as status,
  COUNT(DISTINCT cs.id) as total_issued_slips,
  COUNT(DISTINCT ii.id) as total_items_in_slips,
  COUNT(DISTINCT pc.id) as total_property_cards,
  COUNT(DISTINCT CASE WHEN pc.id IS NULL THEN ii.id END) as items_still_missing_cards
FROM custodian_slips cs
JOIN custodian_slip_items csi ON cs.id = csi.slip_id
JOIN inventory_items ii ON csi.inventory_item_id = ii.id
LEFT JOIN property_cards pc ON pc.inventory_item_id = ii.id
WHERE cs.slip_status = 'Issued';

