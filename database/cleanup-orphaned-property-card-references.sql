-- Cleanup Orphaned Property Card References
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
SELECT 
    'Cleaned up orphaned references' as result,
    ROW_COUNT() as affected_rows;

-- 4. Clean up any custodian slip items that reference non-existent custodian slips
UPDATE custodian_slip_items 
SET slip_id = NULL
WHERE slip_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM custodian_slips cs 
    WHERE cs.id = slip_id
  );

-- 5. Show final count of custodian slip items with property card references
SELECT 
    'Remaining custodian slip items with property_card_entry_id' as check_type,
    COUNT(*) as count
FROM custodian_slip_items 
WHERE property_card_entry_id IS NOT NULL;
