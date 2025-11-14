-- Force delete specific custodian slip: ICS-1760422876706
-- This script bypasses the deletion trigger to force delete the slip

-- First, let's check what we're about to delete
SELECT 
    'Custodian Slip' as item_type,
    id,
    slip_number,
    custodian_name,
    slip_status,
    created_at
FROM custodian_slips 
WHERE slip_number = 'ICS-1760422876706';

-- Check related custodian slip items
SELECT 
    'Custodian Slip Items' as item_type,
    COUNT(*) as count
FROM custodian_slip_items csi
JOIN custodian_slips cs ON csi.slip_id = cs.id
WHERE cs.slip_number = 'ICS-1760422876706';

-- Check related property card entries
SELECT 
    'Property Card Entries' as item_type,
    COUNT(*) as count
FROM property_card_entries pce
JOIN custodian_slip_items csi ON pce.id = csi.property_card_entry_id
JOIN custodian_slips cs ON csi.slip_id = cs.id
WHERE cs.slip_number = 'ICS-1760422876706';

-- Temporarily disable the deletion trigger
ALTER TABLE custodian_slips DISABLE TRIGGER trg_prevent_issued_slip_deletion;

-- Now delete in the correct order to respect foreign key constraints
-- 1. Delete custodian slip items first
DELETE FROM custodian_slip_items 
WHERE slip_id IN (
    SELECT id FROM custodian_slips WHERE slip_number = 'ICS-1760422876706'
);

-- 2. Delete property card entries (if any)
DELETE FROM property_card_entries 
WHERE id IN (
    SELECT property_card_entry_id 
    FROM custodian_slip_items csi
    JOIN custodian_slips cs ON csi.slip_id = cs.id
    WHERE cs.slip_number = 'ICS-1760422876706'
    AND property_card_entry_id IS NOT NULL
);

-- 3. Finally delete the custodian slip
DELETE FROM custodian_slips 
WHERE slip_number = 'ICS-1760422876706';

-- Re-enable the deletion trigger
ALTER TABLE custodian_slips ENABLE TRIGGER trg_prevent_issued_slip_deletion;

-- Verify deletion
SELECT 'Force deletion completed' as status;
SELECT COUNT(*) as remaining_slips FROM custodian_slips WHERE slip_number = 'ICS-1760422876706';
