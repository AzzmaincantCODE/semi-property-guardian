-- Fix Missing inventory_item_id Column in property_cards Table
-- Run this in Supabase SQL Editor to fix the 406 error

-- Add the missing inventory_item_id column to property_cards table
ALTER TABLE public.property_cards 
ADD COLUMN IF NOT EXISTS inventory_item_id UUID REFERENCES public.inventory_items(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_property_cards_inventory_item_id 
ON public.property_cards(inventory_item_id);

-- Add comment explaining the column
COMMENT ON COLUMN public.property_cards.inventory_item_id 
IS 'Links property card to its corresponding inventory item for Annex compliance';

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'property_cards' 
AND table_schema = 'public'
ORDER BY ordinal_position;
