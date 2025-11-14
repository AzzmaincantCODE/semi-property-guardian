-- Fix existing property card entries to show property numbers instead of custodian slip numbers
-- This updates the issue_item_no field to show the actual property number

-- First, check what we're working with
SELECT 'Current property card entries with ICS numbers:' as status;
SELECT 
  id,
  issue_item_no,
  reference,
  remarks
FROM public.property_card_entries 
WHERE issue_item_no ~ '^ICS-' 
  AND related_slip_id IS NOT NULL
LIMIT 5;

-- Update property card entries to use property numbers instead of slip numbers
UPDATE public.property_card_entries 
SET issue_item_no = (
  SELECT ii.property_number 
  FROM public.inventory_items ii
  JOIN public.custodian_slip_items csi ON ii.id = csi.inventory_item_id
  WHERE csi.slip_id = property_card_entries.related_slip_id
  LIMIT 1
)
WHERE issue_item_no ~ '^ICS-' 
  AND related_slip_id IS NOT NULL;

-- Verify the fix
SELECT 'Updated property card entries:' as status;
SELECT 
  pce.id,
  pce.issue_item_no,
  pce.reference,
  pce.remarks
FROM public.property_card_entries pce
WHERE pce.issue_item_no IS NOT NULL
ORDER BY pce.created_at DESC
LIMIT 10;
