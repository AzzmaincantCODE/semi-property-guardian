-- Fix existing custodian slip items by populating missing fields
-- Run this in Supabase SQL Editor to update existing slips

-- Update description from inventory items (use brand + model fallback if description is empty)
-- Force update ALL descriptions to ensure they are correct (even if they have data, regenerate them)
UPDATE public.custodian_slip_items csi
SET description = COALESCE(
  NULLIF(TRIM(ii.description), ''),
  CASE 
    WHEN ii.brand IS NOT NULL AND ii.model IS NOT NULL THEN TRIM(ii.brand) || ' ' || TRIM(ii.model)
    WHEN ii.brand IS NOT NULL THEN TRIM(ii.brand)
    WHEN ii.model IS NOT NULL THEN TRIM(ii.model)
    ELSE 'No description'
  END
)
FROM public.inventory_items ii
WHERE csi.inventory_item_id = ii.id;

-- Generate item numbers for existing records that don't have them
WITH numbered_items AS (
  SELECT 
    id,
    slip_id,
    ROW_NUMBER() OVER (PARTITION BY slip_id ORDER BY created_at) AS item_num
  FROM public.custodian_slip_items
  WHERE item_number IS NULL OR item_number = ''
)
UPDATE public.custodian_slip_items
SET item_number = numbered_items.item_num::TEXT
FROM numbered_items
WHERE custodian_slip_items.id = numbered_items.id;

-- Update estimated useful life for items missing it (simple category-based approach)
UPDATE public.custodian_slip_items csi
SET estimated_useful_life = CASE 
  WHEN ii.category = 'Equipment' THEN '5-10 years'
  WHEN ii.category = 'Furniture' THEN '10-15 years'
  WHEN ii.category = 'Semi-Expandable' THEN '3-5 years'
  ELSE '5 years'
END
FROM public.inventory_items ii
WHERE csi.inventory_item_id = ii.id
AND (csi.estimated_useful_life IS NULL OR csi.estimated_useful_life = '');

-- Update costs for items missing them
UPDATE public.custodian_slip_items csi
SET 
  unit_cost = ii.unit_cost,
  total_cost = csi.quantity * ii.unit_cost,
  amount = csi.quantity * ii.unit_cost
FROM public.inventory_items ii
WHERE csi.inventory_item_id = ii.id
AND (csi.unit_cost IS NULL OR csi.unit_cost = 0);

-- Verify the updates
SELECT 
  csi.property_number,
  csi.description,
  csi.item_number,
  csi.estimated_useful_life,
  csi.unit_cost,
  csi.total_cost
FROM public.custodian_slip_items csi
ORDER BY csi.created_at DESC
LIMIT 10;

