-- Comprehensive cleanup to fix custodian slip creation conflicts
-- This addresses the 409 conflict error when creating custodian slips

-- Step 1: Check current state
SELECT 'Current custodian slips:' as status;
SELECT 
  id,
  slip_number,
  custodian_name,
  slip_status,
  created_at
FROM public.custodian_slips
ORDER BY created_at DESC;

-- Step 2: Check for problematic slip numbers
SELECT 'Problematic slip numbers:' as status;
SELECT 
  slip_number,
  COUNT(*) as count
FROM public.custodian_slips
GROUP BY slip_number
HAVING COUNT(*) > 1 OR slip_number IS NULL OR slip_number = '';

-- Step 3: Clean up orphaned custodian slip items
SELECT 'Cleaning orphaned slip items...' as status;
DELETE FROM public.custodian_slip_items 
WHERE slip_id NOT IN (SELECT id FROM public.custodian_slips);

-- Step 4: Clean up orphaned property card entries
SELECT 'Cleaning orphaned property card entries...' as status;
DELETE FROM public.property_card_entries 
WHERE related_slip_id NOT IN (SELECT id FROM public.custodian_slips);

-- Step 5: Reset inventory items that reference non-existent slips
SELECT 'Resetting inventory items...' as status;
UPDATE public.inventory_items 
SET 
  custodian = NULL,
  custodian_position = NULL,
  assignment_status = 'Available',
  assigned_date = NULL,
  updated_at = NOW()
WHERE custodian IS NOT NULL 
  AND custodian != ''
  AND id NOT IN (
    SELECT DISTINCT inventory_item_id 
    FROM public.custodian_slip_items csi
    JOIN public.custodian_slips cs ON csi.slip_id = cs.id
    WHERE cs.slip_status = 'Issued'
  );

-- Step 6: Clean up any custodian slips with empty or duplicate slip numbers
SELECT 'Cleaning up problematic custodian slips...' as status;
DELETE FROM public.custodian_slips 
WHERE slip_number IS NULL 
   OR slip_number = ''
   OR slip_number IN (
     SELECT slip_number 
     FROM public.custodian_slips 
     GROUP BY slip_number 
     HAVING COUNT(*) > 1
   );

-- Step 7: Verify cleanup
SELECT 'Verification - remaining custodian slips:' as status;
SELECT 
  id,
  slip_number,
  custodian_name,
  slip_status,
  created_at
FROM public.custodian_slips
ORDER BY created_at DESC;

-- Step 8: Test ICS number generation
SELECT 'Testing ICS number generation:' as status;
SELECT public.generate_ics_number() as next_ics_number;

-- Step 9: Check available inventory items
SELECT 'Available inventory items count:' as status;
SELECT COUNT(*) as available_items FROM public.available_inventory_items;
