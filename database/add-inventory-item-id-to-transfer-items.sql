-- Add inventory_item_id column to transfer_items table if it doesn't exist
-- This allows tracking which inventory items are being transferred

-- Check if column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'transfer_items' 
        AND column_name = 'inventory_item_id'
    ) THEN
        ALTER TABLE public.transfer_items 
        ADD COLUMN inventory_item_id UUID REFERENCES public.inventory_items(id);
        
        COMMENT ON COLUMN public.transfer_items.inventory_item_id IS 'Reference to the inventory item being transferred';
    END IF;
END $$;

-- Also ensure other tracking columns exist (from add-transfer-items-fields.sql)
DO $$ 
BEGIN
    -- Add ics_slip_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'transfer_items' 
        AND column_name = 'ics_slip_id'
    ) THEN
        ALTER TABLE public.transfer_items 
        ADD COLUMN ics_slip_id UUID REFERENCES public.custodian_slips(id);
    END IF;

    -- Add custodian_slip_item_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'transfer_items' 
        AND column_name = 'custodian_slip_item_id'
    ) THEN
        ALTER TABLE public.transfer_items 
        ADD COLUMN custodian_slip_item_id UUID REFERENCES public.custodian_slip_items(id);
    END IF;

    -- Add from_custodian if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'transfer_items' 
        AND column_name = 'from_custodian'
    ) THEN
        ALTER TABLE public.transfer_items 
        ADD COLUMN from_custodian TEXT;
    END IF;

    -- Add to_custodian if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'transfer_items' 
        AND column_name = 'to_custodian'
    ) THEN
        ALTER TABLE public.transfer_items 
        ADD COLUMN to_custodian TEXT;
    END IF;
END $$;

