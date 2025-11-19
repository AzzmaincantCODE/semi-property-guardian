-- Add entity_name and fund_cluster columns to property_transfers table
ALTER TABLE property_transfers 
ADD COLUMN IF NOT EXISTS entity_name TEXT,
ADD COLUMN IF NOT EXISTS fund_cluster TEXT;

