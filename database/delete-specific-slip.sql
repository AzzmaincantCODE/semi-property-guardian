-- Delete Specific Custodian Slip - For Testing
-- Replace the slip_id with your actual slip ID

-- Step 1: Release inventory items for this specific slip
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

-- Step 2: Delete custodian slip items (removes foreign key references to property cards)
DELETE FROM public.custodian_slip_items 
WHERE slip_id = '3e145de0-a2be-4949-9f25-0493c3a079d4'::uuid;

-- Step 3: Delete property card entries related to this slip
DELETE FROM public.property_card_entries 
WHERE related_slip_id = '3e145de0-a2be-4949-9f25-0493c3a079d4'::uuid;

-- Step 4: Delete the custodian slip
DELETE FROM public.custodian_slips 
WHERE id = '3e145de0-a2be-4949-9f25-0493c3a079d4'::uuid;

-- Step 5: Verify deletion
SELECT 'Specific slip deleted!' as status;
SELECT COUNT(*) as remaining_slips FROM public.custodian_slips WHERE id = '3e145de0-a2be-4949-9f25-0493c3a079d4'::uuid;
