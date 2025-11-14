-- Bypass Trigger and Delete Specific Slip
-- This temporarily disables the deletion trigger for this specific slip
-- ⚠️ WARNING: Only use this for testing/development data

-- Step 1: Temporarily disable the deletion trigger
ALTER TABLE public.custodian_slips DISABLE TRIGGER trg_prevent_issued_slip_deletion;

-- Step 2: Release inventory items for this specific slip
UPDATE public.inventory_items
SET 
  custodian = NULL,
  custodian_position = NULL,
  assignment_status = 'Available',
  assigned_date = NULL,
  updated_at = NOW()
WHERE id IN (
  SELECT inventory_item_id 
  FROM public.custodian_slip_items 
  WHERE slip_id = '3e145de0-a2be-4949-9f25-0493c3a079d4'::uuid
);

-- Step 3: Delete custodian slip items (removes foreign key references to property cards)
DELETE FROM public.custodian_slip_items 
WHERE slip_id = '3e145de0-a2be-4949-9f25-0493c3a079d4'::uuid;

-- Step 4: Delete property card entries related to this slip
DELETE FROM public.property_card_entries 
WHERE related_slip_id = '3e145de0-a2be-4949-9f25-0493c3a079d4'::uuid;

-- Step 5: Delete the custodian slip
DELETE FROM public.custodian_slips 
WHERE id = '3e145de0-a2be-4949-9f25-0493c3a079d4'::uuid;

-- Step 6: Re-enable the deletion trigger
ALTER TABLE public.custodian_slips ENABLE TRIGGER trg_prevent_issued_slip_deletion;

-- Step 7: Verify deletion
SELECT 'Specific slip deleted! Trigger re-enabled.' as status;
SELECT COUNT(*) as remaining_slips FROM public.custodian_slips WHERE id = '3e145de0-a2be-4949-9f25-0493c3a079d4'::uuid;
