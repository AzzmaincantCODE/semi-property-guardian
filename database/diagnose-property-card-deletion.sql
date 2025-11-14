-- Diagnose Property Card Deletion Issues
-- This script helps identify why property cards can't be deleted

-- 1. Check if there are any custodian slip items that reference property card entries
SELECT 
    'custodian_slip_items with property_card_entry_id' as check_type,
    COUNT(*) as count
FROM custodian_slip_items 
WHERE property_card_entry_id IS NOT NULL;

-- 2. Show specific custodian slip items that reference property card entries
SELECT 
    'Specific custodian slip items' as check_type,
    csi.id as slip_item_id,
    csi.property_card_entry_id,
    csi.inventory_item_id,
    csi.slip_id,
    cs.slip_status,
    pce.property_card_id
FROM custodian_slip_items csi
LEFT JOIN custodian_slips cs ON csi.slip_id = cs.id
LEFT JOIN property_card_entries pce ON csi.property_card_entry_id = pce.id
WHERE csi.property_card_entry_id IS NOT NULL;

-- 3. Check if there are any property card entries
SELECT 
    'Property card entries' as check_type,
    COUNT(*) as count
FROM property_card_entries;

-- 4. Check if there are any property cards
SELECT 
    'Property cards' as check_type,
    COUNT(*) as count
FROM property_cards;

-- 5. Check for orphaned references (custodian slip items pointing to non-existent property card entries)
SELECT 
    'Orphaned custodian slip items' as check_type,
    COUNT(*) as count
FROM custodian_slip_items csi
WHERE csi.property_card_entry_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM property_card_entries pce 
    WHERE pce.id = csi.property_card_entry_id
  );

-- 6. Test the can_delete_property_card function on a specific property card
-- (Replace 'YOUR_PROPERTY_CARD_ID' with an actual property card ID)
SELECT 
    'Test deletion check' as check_type,
    id,
    can_delete_property_card(id) as can_delete
FROM property_cards
LIMIT 5;
