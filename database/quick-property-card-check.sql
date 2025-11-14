-- Quick Property Card Deletion Check
-- Single query to check what's blocking property card deletion

SELECT 
    'custodian_slip_items_count' as check_type,
    COUNT(*) as count
FROM custodian_slip_items

UNION ALL

SELECT 
    'custodian_slip_items_with_property_card_refs' as check_type,
    COUNT(*) as count
FROM custodian_slip_items 
WHERE property_card_entry_id IS NOT NULL

UNION ALL

SELECT 
    'property_cards_count' as check_type,
    COUNT(*) as count
FROM property_cards

UNION ALL

SELECT 
    'property_card_entries_count' as check_type,
    COUNT(*) as count
FROM property_card_entries

UNION ALL

SELECT 
    'orphaned_custodian_slip_items' as check_type,
    COUNT(*) as count
FROM custodian_slip_items csi
WHERE csi.property_card_entry_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM property_card_entries pce 
    WHERE pce.id = csi.property_card_entry_id
  )

UNION ALL

SELECT 
    'orphaned_slip_references' as check_type,
    COUNT(*) as count
FROM custodian_slip_items csi
WHERE csi.slip_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM custodian_slips cs 
    WHERE cs.id = csi.slip_id
  );
