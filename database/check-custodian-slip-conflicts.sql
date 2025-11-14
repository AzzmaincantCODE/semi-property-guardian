-- Check for existing custodian slips that might be causing conflicts
-- This will help identify what's causing the 409 conflict error

-- 1. Check all custodian slips and their slip numbers
SELECT 
  id,
  slip_number,
  custodian_name,
  slip_status,
  date_issued,
  created_at
FROM public.custodian_slips
ORDER BY created_at DESC;

-- 2. Check for duplicate or empty slip numbers
SELECT 
  slip_number,
  COUNT(*) as count
FROM public.custodian_slips
GROUP BY slip_number
HAVING COUNT(*) > 1 OR slip_number IS NULL OR slip_number = '';

-- 3. Check for any custodian slip items that might be orphaned
SELECT 
  csi.id as slip_item_id,
  csi.slip_id,
  csi.property_number,
  cs.slip_number,
  cs.custodian_name
FROM public.custodian_slip_items csi
LEFT JOIN public.custodian_slips cs ON csi.slip_id = cs.id
WHERE cs.id IS NULL;

-- 4. Check for any property card entries referencing non-existent slips
SELECT 
  pce.id as entry_id,
  pce.related_slip_id,
  pce.remarks,
  cs.slip_number,
  cs.custodian_name
FROM public.property_card_entries pce
LEFT JOIN public.custodian_slips cs ON pce.related_slip_id = cs.id
WHERE cs.id IS NULL;

-- 5. Check inventory items that might have invalid custodian assignments
SELECT 
  id,
  property_number,
  custodian,
  custodian_position,
  assignment_status,
  assigned_date
FROM public.inventory_items
WHERE custodian IS NOT NULL 
  AND custodian != ''
  AND assignment_status != 'Assigned';
