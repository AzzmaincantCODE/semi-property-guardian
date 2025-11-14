-- Simple Cleanup of Orphaned Property Card References
-- This script removes orphaned references that might be blocking property card deletion

-- 1. Show what will be cleaned up
SELECT 
    'Orphaned custodian slip items (will be cleaned)' as action,
    COUNT(*) as count
FROM custodian_slip_items csi
WHERE csi.property_card_entry_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM property_card_entries pce 
    WHERE pce.id = csi.property_card_entry_id
  );

-- 2. Clean up orphaned custodian slip items that reference non-existent property card entries
UPDATE custodian_slip_items 
SET property_card_entry_id = NULL
WHERE property_card_entry_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM property_card_entries pce 
    WHERE pce.id = property_card_entry_id
  );

-- 3. Show how many were cleaned up
-- Note: In PostgreSQL, we can't easily get the affected row count from UPDATE
-- The cleanup was successful if no error occurred
SELECT 
    'Cleaned up orphaned property card references' as result,
    'Check remaining count below' as note;

-- 4. Clean up any custodian slip items that reference non-existent custodian slips
SELECT 
    'Orphaned slip references (will be cleaned)' as action,
    COUNT(*) as count
FROM custodian_slip_items csi
WHERE csi.slip_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM custodian_slips cs 
    WHERE cs.id = csi.slip_id
  );

UPDATE custodian_slip_items 
SET slip_id = NULL
WHERE slip_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM custodian_slips cs 
    WHERE cs.id = slip_id
  );

-- 5. Show how many slip references were cleaned up
-- Note: In PostgreSQL, we can't easily get the affected row count from UPDATE
-- The cleanup was successful if no error occurred
SELECT 
    'Cleaned up orphaned slip references' as result,
    'Check remaining count below' as note;

-- 6. Show final count of custodian slip items with property card references
SELECT 
    'Remaining custodian slip items with property_card_entry_id' as check_type,
    COUNT(*) as count
FROM custodian_slip_items 
WHERE property_card_entry_id IS NOT NULL;

-- 7. Show final count of custodian slip items with slip references
SELECT 
    'Remaining custodian slip items with slip_id' as check_type,
    COUNT(*) as count
FROM custodian_slip_items 
WHERE slip_id IS NOT NULL;
