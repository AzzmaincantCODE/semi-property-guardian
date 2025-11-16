-- Add missing fields to transfer_items to track related records
ALTER TABLE transfer_items 
ADD COLUMN inventory_item_id TEXT,
ADD COLUMN ics_slip_id TEXT,
ADD COLUMN custodian_slip_item_id TEXT,
ADD COLUMN from_custodian TEXT,
ADD COLUMN to_custodian TEXT;
