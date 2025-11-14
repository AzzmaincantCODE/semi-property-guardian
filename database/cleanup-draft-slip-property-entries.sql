-- Clean up property card entries that were incorrectly created for draft slips
-- This removes the design flaw by cleaning up existing bad data

-- First, let's see what we're dealing with
SELECT 
  cs.id as slip_id,
  cs.slip_number,
  cs.slip_status,
  cs.custodian_name,
  COUNT(pce.id) as property_card_entries_count
FROM public.custodian_slips cs
LEFT JOIN public.property_card_entries pce ON pce.related_slip_id = cs.id
WHERE cs.slip_status = 'Draft'
GROUP BY cs.id, cs.slip_number, cs.slip_status, cs.custodian_name
HAVING COUNT(pce.id) > 0;

-- Delete property card entries that reference draft slips
DELETE FROM public.property_card_entries 
WHERE related_slip_id IN (
  SELECT id FROM public.custodian_slips WHERE slip_status = 'Draft'
);

-- Verify the cleanup
SELECT 
  cs.id as slip_id,
  cs.slip_number,
  cs.slip_status,
  cs.custodian_name,
  COUNT(pce.id) as property_card_entries_count
FROM public.custodian_slips cs
LEFT JOIN public.property_card_entries pce ON pce.related_slip_id = cs.id
WHERE cs.slip_status = 'Draft'
GROUP BY cs.id, cs.slip_number, cs.slip_status, cs.custodian_name
HAVING COUNT(pce.id) > 0;
