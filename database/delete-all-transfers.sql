-- Delete all existing transfers and transfer items
-- WARNING: This will permanently delete all transfer records
-- Run this script only if you want to start fresh with transfers

-- First, delete all transfer items (due to foreign key constraint)
DELETE FROM transfer_items;

-- Then, delete all transfers
DELETE FROM property_transfers;

-- Verify deletion
SELECT COUNT(*) as remaining_transfers FROM property_transfers;
SELECT COUNT(*) as remaining_transfer_items FROM transfer_items;

