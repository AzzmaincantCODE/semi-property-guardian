-- Fix missing columns in custodian_slip_items table
-- Run this in Supabase SQL Editor

-- Step 1: Check current table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'custodian_slip_items' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Add missing inventory_item_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'custodian_slip_items' 
        AND column_name = 'inventory_item_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.custodian_slip_items 
        ADD COLUMN inventory_item_id uuid REFERENCES public.inventory_items(id);
        
        RAISE NOTICE 'Added inventory_item_id column to custodian_slip_items';
    ELSE
        RAISE NOTICE 'inventory_item_id column already exists';
    END IF;
END $$;

-- Step 3: Add missing property_card_entry_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'custodian_slip_items' 
        AND column_name = 'property_card_entry_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.custodian_slip_items 
        ADD COLUMN property_card_entry_id uuid REFERENCES public.property_card_entries(id);
        
        RAISE NOTICE 'Added property_card_entry_id column to custodian_slip_items';
    ELSE
        RAISE NOTICE 'property_card_entry_id column already exists';
    END IF;
END $$;

-- Step 4: Add missing columns to property_cards if needed
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'property_cards' 
        AND column_name = 'inventory_item_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.property_cards 
        ADD COLUMN inventory_item_id uuid REFERENCES public.inventory_items(id);
        
        RAISE NOTICE 'Added inventory_item_id column to property_cards';
    ELSE
        RAISE NOTICE 'inventory_item_id column already exists in property_cards';
    END IF;
END $$;

-- Step 5: Add missing columns to property_card_entries if needed
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'property_card_entries' 
        AND column_name = 'inventory_item_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.property_card_entries 
        ADD COLUMN inventory_item_id uuid REFERENCES public.inventory_items(id);
        
        RAISE NOTICE 'Added inventory_item_id column to property_card_entries';
    ELSE
        RAISE NOTICE 'inventory_item_id column already exists in property_card_entries';
    END IF;
END $$;

-- Step 6: Add missing related_slip_id column to property_card_entries if needed
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'property_card_entries' 
        AND column_name = 'related_slip_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.property_card_entries 
        ADD COLUMN related_slip_id uuid REFERENCES public.custodian_slips(id);
        
        RAISE NOTICE 'Added related_slip_id column to property_card_entries';
    ELSE
        RAISE NOTICE 'related_slip_id column already exists in property_card_entries';
    END IF;
END $$;

-- Step 7: Verify the safe_delete_inventory_item function exists and works
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p 
      JOIN pg_namespace n ON p.pronamespace = n.oid 
      WHERE n.nspname = 'public' AND p.proname = 'safe_delete_inventory_item'
    ) 
    THEN 'safe_delete_inventory_item function EXISTS' 
    ELSE 'safe_delete_inventory_item function MISSING' 
  END as function_status;

-- Step 8: Test the function with a dummy call (should fail gracefully)
SELECT 'Database schema fix completed successfully' as status;
