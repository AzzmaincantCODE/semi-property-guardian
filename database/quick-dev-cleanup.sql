-- Quick Development Cleanup - Remove All Mock Data Safely
-- Use this when you want to start fresh with clean data
-- Run this in Supabase SQL Editor

-- Step 1: Show current state
SELECT 'BEFORE CLEANUP' as status;
SELECT assignment_status, COUNT(*) as count FROM inventory_items GROUP BY assignment_status;

-- Step 2: Disable all triggers temporarily
DROP TRIGGER IF EXISTS trg_validate_and_assign_item ON custodian_slip_items;
DROP TRIGGER IF EXISTS trg_prevent_issued_slip_deletion ON custodian_slips;
DROP TRIGGER IF EXISTS trg_set_estimated_life ON inventory_items;

-- Step 3: Reset all inventory items to clean state
UPDATE inventory_items
SET 
  custodian = NULL,
  custodian_position = NULL,
  assignment_status = 'Available',
  assigned_date = NULL,
  updated_at = NOW()
WHERE 1=1; -- Reset ALL items

-- Step 4: Clear all custodian slip data (handle foreign key constraints)
-- First, clear property card entries that reference custodian slips
UPDATE property_card_entries
SET 
  related_slip_id = NULL,
  updated_at = NOW()
WHERE related_slip_id IS NOT NULL;

-- Then delete custodian slip items
DELETE FROM custodian_slip_items;

-- Finally delete custodian slips
DELETE FROM custodian_slips;

-- Step 5: Show after state
SELECT 'AFTER CLEANUP' as status;
SELECT assignment_status, COUNT(*) as count FROM inventory_items GROUP BY assignment_status;

-- Step 6: Show available items
SELECT 
  'Available items for new custodian slips:' as status,
  COUNT(*) as count
FROM inventory_items
WHERE condition = 'Serviceable' 
  AND status = 'Active'
  AND (custodian IS NULL OR custodian = '')
  AND (assignment_status IS NULL OR assignment_status = 'Available');

-- Step 7: Re-enable triggers
CREATE TRIGGER trg_validate_and_assign_item
  BEFORE INSERT ON custodian_slip_items
  FOR EACH ROW
  EXECUTE FUNCTION validate_and_assign_item();

CREATE TRIGGER trg_prevent_issued_slip_deletion
  BEFORE DELETE ON custodian_slips
  FOR EACH ROW
  EXECUTE FUNCTION prevent_issued_slip_deletion();

CREATE TRIGGER trg_set_estimated_life
  BEFORE INSERT OR UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION trg_calculate_estimated_life();

-- Step 8: Final verification
SELECT 'CLEANUP COMPLETE - Ready for fresh data entry' as status;
