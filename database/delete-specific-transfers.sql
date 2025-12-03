-- Delete specific transfer receipts by ITR number
-- This script safely deletes the following transfers:
-- ITR 2025-11-SPLV-0003
-- ITR 2025-11-SPLV-0002
-- ITR 2025-11-SPLV-0001
-- 
-- WARNING: This will permanently delete these transfer records and all related data

-- Step 1: Find the transfer IDs by ITR number
DO $$
DECLARE
  transfer_ids uuid[];
  transfer_id_record record;
BEGIN
  -- Collect transfer IDs for the specified ITR numbers
  SELECT ARRAY_AGG(id) INTO transfer_ids
  FROM public.property_transfers
  WHERE transfer_number IN (
    'ITR 2025-11-SPLV-0003',
    'ITR 2025-11-SPLV-0002',
    'ITR 2025-11-SPLV-0001'
  );

  -- Check if transfers were found
  IF transfer_ids IS NULL OR array_length(transfer_ids, 1) = 0 THEN
    RAISE NOTICE 'No transfers found with the specified ITR numbers';
    RETURN;
  END IF;

  RAISE NOTICE 'Found % transfer(s) to delete', array_length(transfer_ids, 1);

  -- Step 2: Delete property card entries that reference these transfers
  DELETE FROM public.property_card_entries
  WHERE related_transfer_id = ANY(transfer_ids);

  RAISE NOTICE 'Deleted property card entries referencing these transfers';

  -- Step 3: Delete transfer items (due to foreign key constraint)
  DELETE FROM public.transfer_items
  WHERE transfer_id = ANY(transfer_ids);

  RAISE NOTICE 'Deleted transfer items';

  -- Step 4: Delete the transfers themselves
  DELETE FROM public.property_transfers
  WHERE id = ANY(transfer_ids);

  RAISE NOTICE 'Deleted % transfer receipt(s)', array_length(transfer_ids, 1);

  -- Step 5: Verify deletion
  SELECT COUNT(*) INTO transfer_id_record
  FROM public.property_transfers
  WHERE transfer_number IN (
    'ITR 2025-11-SPLV-0003',
    'ITR 2025-11-SPLV-0002',
    'ITR 2025-11-SPLV-0001'
  );

  IF transfer_id_record.count = 0 THEN
    RAISE NOTICE 'Successfully deleted all specified transfers';
  ELSE
    RAISE WARNING 'Some transfers may still exist. Please verify manually.';
  END IF;
END $$;

-- Verify the deletion
SELECT 
  transfer_number,
  status,
  created_at
FROM public.property_transfers
WHERE transfer_number IN (
  'ITR 2025-11-SPLV-0003',
  'ITR 2025-11-SPLV-0002',
  'ITR 2025-11-SPLV-0001'
);

-- If the above query returns no rows, the deletion was successful

