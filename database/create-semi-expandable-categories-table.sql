-- Create semi_expandable_categories table for lookup management
-- This table stores categories for semi-expandable items
-- Run this in Supabase SQL Editor

-- Create the table
CREATE TABLE IF NOT EXISTS semi_expandable_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique index on code if provided (optional field, but unique if provided)
CREATE UNIQUE INDEX IF NOT EXISTS idx_semi_expandable_categories_code 
    ON semi_expandable_categories(code) 
    WHERE code IS NOT NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_semi_expandable_categories_active_th 
    ON semi_expandable_categories(is_active, name);

-- Add trigger for updated_at timestamp
CREATE TRIGGER update_semi_expandable_categories_timestamp 
    BEFORE UPDATE ON semi_expandable_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE semi_expandable_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read all data
DROP POLICY IF EXISTS "Allow authenticated users to read all data" ON semi_expandable_categories;
CREATE POLICY "Allow authenticated users to read all data" ON semi_expandable_categories
    FOR SELECT TO authenticated USING (true);

-- RLS Policy: Allow authenticated users to modify data
DROP POLICY IF EXISTS "Allow authenticated users to modify data" ON semi_expandable_categories;
CREATE POLICY "Allow authenticated users to modify data" ON semi_expandable_categories
    FOR ALL TO authenticated USING (true);

-- Grant permissions
GRANT ALL ON semi_expandable_categories TO authenticated;

-- Add comment
COMMENT ON TABLE semi_expandable_categories IS 'Categories for semi-expandable property items (similar to departments lookup)';

