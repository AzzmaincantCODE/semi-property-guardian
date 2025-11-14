-- Check what triggers are currently active on custodian_slip_items
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'custodian_slip_items'
ORDER BY trigger_name;

-- Check if items are being assigned immediately
SELECT 
    i.property_number,
    i.custodian,
    i.assignment_status,
    cs.slip_number,
    cs.slip_status,
    cs.created_at
FROM inventory_items i
JOIN custodian_slip_items csi ON i.id = csi.inventory_item_id
JOIN custodian_slips cs ON csi.slip_id = cs.id
WHERE cs.created_at > NOW() - INTERVAL '1 hour'
ORDER BY cs.created_at DESC;
