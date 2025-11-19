-- Update property_transfers table to support Draft/Issued status like ICS
-- This aligns transfer approval with custodian slip approval

-- First, update existing transfers to Draft status (if they're Pending)
UPDATE property_transfers 
SET status = 'Draft' 
WHERE status = 'Pending';

-- Update status constraint to match ICS pattern
-- Note: You may need to drop and recreate the constraint if it exists
-- This will allow: Draft, Issued, Completed, Rejected

-- If you have a CHECK constraint, you may need to alter it:
-- ALTER TABLE property_transfers DROP CONSTRAINT IF EXISTS property_transfers_status_check;
-- ALTER TABLE property_transfers ADD CONSTRAINT property_transfers_status_check 
--   CHECK (status IN ('Draft', 'Issued', 'Completed', 'Rejected'));

