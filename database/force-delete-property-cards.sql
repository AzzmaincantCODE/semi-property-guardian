-- Force Delete Property Cards - For Development/Testing Only
-- This will delete property cards and clean up all related data
-- ⚠️ WARNING: Only use this for testing/development data

-- Step 1: Temporarily disable any deletion triggers (if they exist)
-- ALTER TABLE public.property_cards DISABLE TRIGGER trg_prevent_property_card_deletion;

-- Step 2: Set property_card_entry_id to NULL in custodian_slip_items
-- This preserves the slip items but removes property card references
UPDATE public.custodian_slip_items 
SET property_card_entry_id = NULL;

-- Step 3: Delete all property card entries
DELETE FROM public.property_card_entries;

-- Step 4: Delete all property cards
DELETE FROM public.property_cards;

-- Step 5: Re-enable any deletion triggers (if they were disabled)
-- ALTER TABLE public.property_cards ENABLE TRIGGER trg_prevent_property_card_deletion;

-- Step 6: Verify cleanup
SELECT 'Property cards cleanup completed!' as status;
SELECT COUNT(*) as remaining_property_cards FROM public.property_cards;
SELECT COUNT(*) as remaining_property_card_entries FROM public.property_card_entries;
SELECT COUNT(*) as custodian_slip_items_with_property_refs FROM public.custodian_slip_items WHERE property_card_entry_id IS NOT NULL;
