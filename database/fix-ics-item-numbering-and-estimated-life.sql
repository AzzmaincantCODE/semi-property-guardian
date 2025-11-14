-- Fix ICS item number sequencing and estimated useful life
-- Run this in Supabase SQL Editor

-- Drop and recreate the trigger function with improved logic
CREATE OR REPLACE FUNCTION public.set_custodian_slip_item_details()
RETURNS TRIGGER AS $$
DECLARE
  inventory_record record;
  existing_count integer;
BEGIN
  -- Get inventory item details for cost calculation and estimated useful life
  SELECT 
    unit_cost, 
    total_cost, 
    quantity, 
    category,
    description,
    estimated_useful_life
  INTO inventory_record
  FROM public.inventory_items
  WHERE id = NEW.inventory_item_id;
  
  IF FOUND THEN
    -- Set costs from inventory item
    NEW.unit_cost = COALESCE(inventory_record.unit_cost, 0);
    NEW.total_cost = NEW.quantity * COALESCE(inventory_record.unit_cost, 0);
    NEW.amount = NEW.total_cost; -- Amount is same as total cost for Annex compliance
    
    -- Set estimated useful life - use inventory item's if available, otherwise calculate from category
    -- Note: estimated_useful_life in inventory_items may be numeric; avoid string comparisons
    IF inventory_record.estimated_useful_life IS NOT NULL THEN
      NEW.estimated_useful_life = inventory_record.estimated_useful_life::text;
    ELSE
      -- Calculate based on category
      NEW.estimated_useful_life = CASE 
        WHEN inventory_record.category = 'Equipment' THEN '5-10 years'
        WHEN inventory_record.category = 'Furniture' THEN '10-15 years'
        WHEN inventory_record.category = 'Semi-Expandable' THEN '3-5 years'
        ELSE '5 years'
      END;
    END IF;
  ELSE
    -- If inventory item not found, set defaults
    NEW.estimated_useful_life = COALESCE(NEW.estimated_useful_life, '5 years');
  END IF;
  
  -- Generate sequential item number for this slip (1, 2, 3, etc.)
  -- Count existing items in the same slip and add 1 for the new item
  IF NEW.item_number IS NULL OR NEW.item_number = '' THEN
    -- Get count of existing items for this slip that have valid item numbers
    SELECT COALESCE(MAX(item_number::integer), 0) + 1
    INTO existing_count
    FROM public.custodian_slip_items
    WHERE slip_id = NEW.slip_id
      AND item_number IS NOT NULL 
      AND item_number != ''
      AND item_number ~ '^[0-9]+$';
    
    -- If no existing items, start at 1
    IF existing_count IS NULL OR existing_count = 0 THEN
      existing_count := 1;
    END IF;
    
    NEW.item_number = existing_count::text;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trg_set_custodian_slip_item_details ON public.custodian_slip_items;
CREATE TRIGGER trg_set_custodian_slip_item_details
  BEFORE INSERT OR UPDATE ON public.custodian_slip_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_custodian_slip_item_details();

-- Fix existing records that might have missing estimated_useful_life or wrong item numbers
UPDATE public.custodian_slip_items csi
SET estimated_useful_life = COALESCE(
  NULLIF(csi.estimated_useful_life, ''),
  CASE 
    WHEN ii.category = 'Equipment' THEN '5-10 years'
    WHEN ii.category = 'Furniture' THEN '10-15 years'
    WHEN ii.category = 'Semi-Expandable' THEN '3-5 years'
    ELSE '5 years'
  END
)
FROM public.inventory_items ii
WHERE csi.inventory_item_id = ii.id
AND (csi.estimated_useful_life IS NULL OR csi.estimated_useful_life = '');

-- Regenerate item numbers sequentially for all slips
WITH numbered_items AS (
  SELECT 
    id,
    slip_id,
    ROW_NUMBER() OVER (PARTITION BY slip_id ORDER BY created_at) AS item_num
  FROM public.custodian_slip_items
)
UPDATE public.custodian_slip_items
SET item_number = numbered_items.item_num::TEXT
FROM numbered_items
WHERE custodian_slip_items.id = numbered_items.id;

-- Verify the updates
SELECT 
  cs.slip_number,
  csi.property_number,
  csi.item_number,
  csi.estimated_useful_life,
  csi.unit_cost,
  csi.total_cost
FROM public.custodian_slip_items csi
JOIN public.custodian_slips cs ON csi.slip_id = cs.id
ORDER BY cs.created_at DESC, csi.item_number::integer
LIMIT 20;

