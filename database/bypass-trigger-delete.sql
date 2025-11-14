-- Bypass Trigger and Force Delete All Test Data
-- This temporarily disables the deletion trigger for cleanup
-- ⚠️ WARNING: Only use this for testing/development data

-- Step 1: Temporarily disable the deletion trigger
ALTER TABLE public.custodian_slips DISABLE TRIGGER trg_prevent_issued_slip_deletion;

-- Step 2: Release all inventory items from custodian slip assignments
UPDATE public.inventory_items
SET 
  custodian = NULL,
  custodian_position = NULL,
  assignment_status = 'Available',
  assigned_date = NULL,
  updated_at = NOW()
WHERE id IN (
  SELECT DISTINCT inventory_item_id 
  FROM public.custodian_slip_items
);

-- Step 3: Delete all custodian slip items (this removes foreign key references)
DELETE FROM public.custodian_slip_items;

-- Step 4: Delete all property card entries related to custodian slips
DELETE FROM public.property_card_entries 
WHERE related_slip_id IN (
  SELECT id FROM public.custodian_slips
);

-- Step 5: Delete all custodian slips (now that trigger is disabled)
DELETE FROM public.custodian_slips;

-- Step 6: Re-enable the deletion trigger
ALTER TABLE public.custodian_slips ENABLE TRIGGER trg_prevent_issued_slip_deletion;

-- Step 7: Verify cleanup
SELECT 'Cleanup completed! Trigger re-enabled.' as status;
SELECT COUNT(*) as remaining_slips FROM public.custodian_slips;
SELECT COUNT(*) as remaining_slip_items FROM public.custodian_slip_items;
SELECT COUNT(*) as remaining_property_entries FROM public.property_card_entries;
SELECT COUNT(*) as available_inventory_items FROM public.inventory_items WHERE assignment_status = 'Available';
