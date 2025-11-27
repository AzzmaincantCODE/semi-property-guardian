-- ============================================================================
-- COMPLETE DATABASE SCHEMA SETUP
-- ============================================================================
-- This file combines all schema migrations in the correct order
-- Run this ONCE in Supabase SQL Editor with "No limit" selected
-- ============================================================================

-- ============================================================================
-- PART 1: BASE SCHEMA - Create all core tables
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users and Authentication (Supabase handles this, but we can add custom fields)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    full_name TEXT NOT NULL,
    position TEXT,
    department_id UUID,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Departments
CREATE TABLE IF NOT EXISTS departments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    head_officer TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fund Sources
CREATE TABLE IF NOT EXISTS fund_sources (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Locations
CREATE TABLE IF NOT EXISTS locations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    building TEXT,
    room TEXT,
    floor TEXT,
    department_id UUID REFERENCES departments(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Main Inventory Items
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    property_number TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    serial_number TEXT,
    unit_of_measure TEXT NOT NULL DEFAULT 'piece',
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
    date_acquired DATE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id),
    condition TEXT NOT NULL DEFAULT 'Serviceable' CHECK (condition IN ('Serviceable', 'Unserviceable', 'For Repair', 'Lost', 'Stolen', 'Damaged', 'Destroyed')),
    location_id UUID REFERENCES locations(id),
    custodian_id UUID REFERENCES auth.users(id),
    custodian_position TEXT,
    accountable_officer TEXT,
    fund_source_id UUID REFERENCES fund_sources(id),
    remarks TEXT,
    last_inventory_date DATE,
    category TEXT NOT NULL DEFAULT 'Semi-Expandable' CHECK (category IN ('Semi-Expandable', 'Equipment', 'Furniture')),
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Transferred', 'Disposed', 'Missing')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Property Cards (Semi-Expandable Property Cards)
CREATE TABLE IF NOT EXISTS property_cards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    entity_name TEXT NOT NULL,
    fund_cluster TEXT NOT NULL,
    semi_expendable_property TEXT NOT NULL,
    property_number TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    date_acquired DATE NOT NULL,
    inventory_item_id UUID REFERENCES inventory_items(id),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Property Card Entries (SPC Entries)
CREATE TABLE IF NOT EXISTS property_card_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    property_card_id UUID NOT NULL REFERENCES property_cards(id) ON DELETE CASCADE,
    inventory_item_id UUID REFERENCES inventory_items(id),
    related_slip_id UUID REFERENCES custodian_slips(id),
    related_transfer_id UUID REFERENCES property_transfers(id),
    date DATE NOT NULL,
    reference TEXT NOT NULL,
    receipt_qty INTEGER NOT NULL DEFAULT 0,
    unit_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
    issue_item_no TEXT,
    issue_qty INTEGER NOT NULL DEFAULT 0,
    office_officer TEXT,
    balance_qty INTEGER NOT NULL DEFAULT 0,
    amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Property Transfers
CREATE TABLE IF NOT EXISTS property_transfers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    transfer_number TEXT UNIQUE NOT NULL,
    from_department TEXT NOT NULL,
    to_department TEXT NOT NULL,
    transfer_type TEXT NOT NULL DEFAULT 'Permanent' CHECK (transfer_type IN ('Permanent', 'Temporary', 'Loan')),
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Issued', 'Completed', 'Rejected')),
    requested_by UUID NOT NULL REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    date_requested DATE NOT NULL,
    date_approved DATE,
    date_completed DATE,
    reason TEXT NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transfer Items
CREATE TABLE IF NOT EXISTS transfer_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    transfer_id UUID NOT NULL REFERENCES property_transfers(id) ON DELETE CASCADE,
    property_number TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    condition TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custodian Slips
CREATE TABLE IF NOT EXISTS custodian_slips (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    slip_number TEXT UNIQUE NOT NULL,
    custodian_name TEXT NOT NULL,
    designation TEXT NOT NULL,
    office TEXT NOT NULL,
    date_issued DATE NOT NULL,
    issued_by TEXT NOT NULL,
    received_by TEXT NOT NULL,
    slip_status TEXT NOT NULL DEFAULT 'Draft' CHECK (slip_status IN ('Draft', 'Issued', 'Cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure legacy columns are aligned with latest structure
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'custodian_slips' 
          AND column_name = 'issued_by'
          AND data_type <> 'text'
    ) THEN
        EXECUTE 'ALTER TABLE public.custodian_slips ALTER COLUMN issued_by TYPE TEXT USING issued_by::TEXT';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'custodian_slips' 
          AND column_name = 'office'
          AND data_type <> 'text'
    ) THEN
        EXECUTE 'ALTER TABLE public.custodian_slips ALTER COLUMN office TYPE TEXT USING office::TEXT';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'custodian_slips' 
          AND column_name = 'received_by'
          AND data_type <> 'text'
    ) THEN
        EXECUTE 'ALTER TABLE public.custodian_slips ALTER COLUMN received_by TYPE TEXT USING received_by::TEXT';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'custodian_slips' 
          AND column_name = 'slip_status'
    ) THEN
        EXECUTE $ddl$
            ALTER TABLE public.custodian_slips 
            ADD COLUMN slip_status TEXT NOT NULL DEFAULT 'Draft' 
            CHECK (slip_status IN ('Draft', 'Issued', 'Cancelled'));
        $ddl$;
    END IF;
END $$;

-- Custodian Slip Items
CREATE TABLE IF NOT EXISTS custodian_slip_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    slip_id UUID NOT NULL REFERENCES custodian_slips(id) ON DELETE CASCADE,
    inventory_item_id UUID REFERENCES inventory_items(id),
    property_number TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit TEXT NOT NULL,
    unit_cost DECIMAL(15,2) DEFAULT 0,
    total_cost DECIMAL(15,2) DEFAULT 0,
    amount DECIMAL(15,2) DEFAULT 0,
    item_number TEXT,
    estimated_useful_life TEXT,
    date_issued DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Physical Counts
CREATE TABLE IF NOT EXISTS physical_counts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    count_number TEXT UNIQUE NOT NULL,
    department TEXT NOT NULL,
    count_date DATE NOT NULL,
    count_type TEXT NOT NULL DEFAULT 'Annual' CHECK (count_type IN ('Annual', 'Quarterly', 'Special', 'Spot Check')),
    status TEXT NOT NULL DEFAULT 'Planned' CHECK (status IN ('Planned', 'In Progress', 'Completed', 'Under Review')),
    conducted_by TEXT[] NOT NULL,
    witnessed_by UUID NOT NULL REFERENCES auth.users(id),
    approved_by UUID NOT NULL REFERENCES auth.users(id),
    total_expected INTEGER NOT NULL DEFAULT 0,
    total_actual INTEGER NOT NULL DEFAULT 0,
    total_variance INTEGER NOT NULL DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Physical Count Items
CREATE TABLE IF NOT EXISTS physical_count_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    count_id UUID NOT NULL REFERENCES physical_counts(id) ON DELETE CASCADE,
    property_number TEXT NOT NULL,
    description TEXT NOT NULL,
    expected_quantity INTEGER NOT NULL DEFAULT 0,
    actual_quantity INTEGER NOT NULL DEFAULT 0,
    condition TEXT NOT NULL CHECK (condition IN ('Serviceable', 'For Repair', 'Unserviceable', 'Missing')),
    location TEXT NOT NULL,
    remarks TEXT,
    variance INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Loss Reports
CREATE TABLE IF NOT EXISTS loss_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    report_number TEXT UNIQUE NOT NULL,
    department TEXT NOT NULL,
    report_date DATE NOT NULL,
    incident_date DATE NOT NULL,
    report_type TEXT NOT NULL CHECK (report_type IN ('Lost', 'Stolen', 'Damaged', 'Destroyed')),
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Under Investigation', 'Approved', 'Rejected')),
    reported_by UUID NOT NULL REFERENCES auth.users(id),
    investigated_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    total_loss_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    incident_description TEXT NOT NULL,
    actions_taken TEXT,
    recommendations TEXT,
    attachments TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Loss Report Items
CREATE TABLE IF NOT EXISTS loss_report_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    report_id UUID NOT NULL REFERENCES loss_reports(id) ON DELETE CASCADE,
    property_number TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
    date_acquired DATE NOT NULL,
    condition TEXT NOT NULL CHECK (condition IN ('Lost', 'Stolen', 'Damaged', 'Destroyed')),
    circumstances TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unserviceable Reports
CREATE TABLE IF NOT EXISTS unserviceable_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    report_number TEXT UNIQUE NOT NULL,
    report_date DATE NOT NULL,
    department TEXT NOT NULL,
    inspected_by TEXT[] NOT NULL,
    review_period TEXT NOT NULL,
    total_value DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unserviceable Report Items
CREATE TABLE IF NOT EXISTS unserviceable_report_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    report_id UUID NOT NULL REFERENCES unserviceable_reports(id) ON DELETE CASCADE,
    property_number TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
    date_acquired DATE NOT NULL,
    condition TEXT NOT NULL DEFAULT 'Unserviceable',
    defects TEXT NOT NULL,
    recommendation TEXT NOT NULL CHECK (recommendation IN ('Repair', 'Condemn', 'Donate', 'Sell')),
    estimated_repair_cost DECIMAL(15,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PART 2: LOOKUP TABLES
-- ============================================================================

-- Semi-Expandable Categories Table
CREATE TABLE IF NOT EXISTS semi_expandable_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custodians Table
CREATE TABLE IF NOT EXISTS custodians (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    custodian_no TEXT UNIQUE,
    name TEXT NOT NULL,
    position TEXT,
    department_id UUID REFERENCES departments(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PART 3: ADD COLUMNS TO EXISTING TABLES
-- ============================================================================

-- Ensure property_cards has inventory_item_id (in case table was created before)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'property_cards'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'property_cards' 
        AND column_name = 'inventory_item_id'
    ) THEN
        ALTER TABLE public.property_cards 
        ADD COLUMN inventory_item_id UUID REFERENCES public.inventory_items(id);
    END IF;
END $$;

-- Ensure property_card_entries has inventory_item_id (in case table was created before)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'property_card_entries'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'property_card_entries' 
        AND column_name = 'inventory_item_id'
    ) THEN
        ALTER TABLE public.property_card_entries 
        ADD COLUMN inventory_item_id UUID REFERENCES public.inventory_items(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'property_card_entries' 
        AND column_name = 'related_slip_id'
    ) THEN
        ALTER TABLE public.property_card_entries 
        ADD COLUMN related_slip_id UUID REFERENCES public.custodian_slips(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'property_card_entries' 
        AND column_name = 'related_transfer_id'
    ) THEN
        ALTER TABLE public.property_card_entries 
        ADD COLUMN related_transfer_id UUID REFERENCES public.property_transfers(id);
    END IF;
END $$;

-- Add columns to inventory_items
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS sub_category TEXT,
ADD COLUMN IF NOT EXISTS semi_expandable_category TEXT,
ADD COLUMN IF NOT EXISTS entity_name TEXT,
ADD COLUMN IF NOT EXISTS custodian TEXT,
ADD COLUMN IF NOT EXISTS custodian_position TEXT,
ADD COLUMN IF NOT EXISTS assigned_date DATE,
ADD COLUMN IF NOT EXISTS assignment_status TEXT DEFAULT 'Available',
ADD COLUMN IF NOT EXISTS ics_number TEXT,
ADD COLUMN IF NOT EXISTS ics_date DATE,
ADD COLUMN IF NOT EXISTS estimated_useful_life TEXT,
ADD COLUMN IF NOT EXISTS estimated_useful_life_override TEXT;

-- Add constraint for assignment_status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'inventory_items_assignment_status_check'
    ) THEN
        ALTER TABLE inventory_items 
        ADD CONSTRAINT inventory_items_assignment_status_check 
        CHECK (assignment_status IN ('Available', 'Assigned', 'In-Transit', 'Disposed', 'Damaged', 'Missing', 'Lost', 'Stolen'));
    END IF;
END $$;

-- Update existing items to have proper assignment_status
UPDATE inventory_items 
SET assignment_status = 'Available' 
WHERE assignment_status IS NULL AND custodian IS NULL;

UPDATE inventory_items 
SET assignment_status = 'Assigned' 
WHERE custodian IS NOT NULL AND assignment_status IS NULL;

-- Add constraint for sub_category
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_sub_category'
    ) THEN
        ALTER TABLE inventory_items 
        ADD CONSTRAINT check_sub_category 
        CHECK (
            sub_category IS NULL 
            OR sub_category IN ('Small Value Expendable', 'High Value Expendable')
        );
    END IF;
END $$;

-- Update entity_name for existing records
UPDATE inventory_items 
SET entity_name = TRIM(CONCAT(
    COALESCE(brand, ''), 
    CASE WHEN brand IS NOT NULL AND brand != '' AND model IS NOT NULL AND model != '' THEN ' ' ELSE '' END,
    COALESCE(model, ''),
    CASE WHEN (brand IS NOT NULL AND brand != '') OR (model IS NOT NULL AND model != '') THEN 
        CASE WHEN serial_number IS NOT NULL AND serial_number != '' THEN ' ' ELSE '' END
    ELSE '' END,
    COALESCE(serial_number, '')
))
WHERE entity_name IS NULL OR entity_name = '';

-- Make entity_name NOT NULL with default
ALTER TABLE inventory_items 
ALTER COLUMN entity_name SET DEFAULT '';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'inventory_items' 
        AND column_name = 'entity_name'
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE inventory_items 
        ALTER COLUMN entity_name SET NOT NULL;
    END IF;
END $$;

-- Add columns to property_transfers
ALTER TABLE property_transfers 
ADD COLUMN IF NOT EXISTS entity_name TEXT,
ADD COLUMN IF NOT EXISTS fund_cluster TEXT;

-- Update status constraint for property_transfers
DO $$
BEGIN
    -- Update existing Pending to Draft
    UPDATE property_transfers 
    SET status = 'Draft' 
    WHERE status = 'Pending';
    
    -- Drop and recreate constraint
    ALTER TABLE property_transfers 
    DROP CONSTRAINT IF EXISTS property_transfers_status_check;
    
    ALTER TABLE property_transfers 
    ADD CONSTRAINT property_transfers_status_check 
    CHECK (status IN ('Draft', 'Issued', 'Completed', 'Rejected'));
END $$;

-- Add columns to transfer_items
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'transfer_items' 
        AND column_name = 'inventory_item_id'
    ) THEN
        ALTER TABLE public.transfer_items 
        ADD COLUMN inventory_item_id UUID REFERENCES public.inventory_items(id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'transfer_items' 
        AND column_name = 'ics_slip_id'
    ) THEN
        ALTER TABLE public.transfer_items 
        ADD COLUMN ics_slip_id UUID REFERENCES public.custodian_slips(id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'transfer_items' 
        AND column_name = 'custodian_slip_item_id'
    ) THEN
        ALTER TABLE public.transfer_items 
        ADD COLUMN custodian_slip_item_id UUID REFERENCES public.custodian_slip_items(id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'transfer_items' 
        AND column_name = 'from_custodian'
    ) THEN
        ALTER TABLE public.transfer_items 
        ADD COLUMN from_custodian TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'transfer_items' 
        AND column_name = 'to_custodian'
    ) THEN
        ALTER TABLE public.transfer_items 
        ADD COLUMN to_custodian TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'transfer_items' 
        AND column_name = 'total_cost'
    ) THEN
        ALTER TABLE public.transfer_items 
        ADD COLUMN total_cost NUMERIC(15,2);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'transfer_items' 
        AND column_name = 'date_acquired'
    ) THEN
        ALTER TABLE public.transfer_items 
        ADD COLUMN date_acquired DATE;
    END IF;
END $$;

-- Ensure custodian_slip_items has all columns (in case table was created before)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'custodian_slip_items'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'custodian_slip_items' 
        AND column_name = 'inventory_item_id'
    ) THEN
        ALTER TABLE public.custodian_slip_items 
        ADD COLUMN inventory_item_id UUID REFERENCES public.inventory_items(id);
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'custodian_slip_items'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'custodian_slip_items' 
        AND column_name = 'unit_cost'
    ) THEN
        ALTER TABLE public.custodian_slip_items 
        ADD COLUMN unit_cost DECIMAL(15,2) DEFAULT 0;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'custodian_slip_items'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'custodian_slip_items' 
        AND column_name = 'total_cost'
    ) THEN
        ALTER TABLE public.custodian_slip_items 
        ADD COLUMN total_cost DECIMAL(15,2) DEFAULT 0;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'custodian_slip_items'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'custodian_slip_items' 
        AND column_name = 'amount'
    ) THEN
        ALTER TABLE public.custodian_slip_items 
        ADD COLUMN amount DECIMAL(15,2) DEFAULT 0;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'custodian_slip_items'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'custodian_slip_items' 
        AND column_name = 'item_number'
    ) THEN
        ALTER TABLE public.custodian_slip_items 
        ADD COLUMN item_number TEXT;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'custodian_slip_items'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'custodian_slip_items' 
        AND column_name = 'estimated_useful_life'
    ) THEN
        ALTER TABLE public.custodian_slip_items 
        ADD COLUMN estimated_useful_life TEXT;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'custodian_slip_items'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'custodian_slip_items' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.custodian_slip_items 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Add unique constraint on property_number
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_property_number'
    ) THEN
        ALTER TABLE inventory_items 
        ADD CONSTRAINT unique_property_number UNIQUE (property_number);
    END IF;
END $$;

-- ============================================================================
-- PART 4: INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_inventory_items_property_number ON inventory_items(property_number);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON inventory_items(status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_custodian ON inventory_items(custodian_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_location ON inventory_items(location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_custodian_text ON inventory_items(custodian);
CREATE INDEX IF NOT EXISTS idx_inventory_items_assignment_status ON inventory_items(assignment_status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_semi_expandable_category ON inventory_items(semi_expandable_category);

CREATE INDEX IF NOT EXISTS idx_property_transfers_status ON property_transfers(status);
CREATE INDEX IF NOT EXISTS idx_property_transfers_date ON property_transfers(date_requested);

CREATE INDEX IF NOT EXISTS idx_physical_counts_department ON physical_counts(department);
CREATE INDEX IF NOT EXISTS idx_physical_counts_date ON physical_counts(count_date);

CREATE INDEX IF NOT EXISTS idx_loss_reports_status ON loss_reports(status);
CREATE INDEX IF NOT EXISTS idx_loss_reports_date ON loss_reports(report_date);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Create indexes on inventory_item_id columns (only if columns exist)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'property_cards' 
        AND column_name = 'inventory_item_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_property_cards_inventory_item_id ON property_cards(inventory_item_id);
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'property_card_entries' 
        AND column_name = 'inventory_item_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_property_card_entries_inventory_item_id ON property_card_entries(inventory_item_id);
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'property_card_entries' 
        AND column_name = 'related_slip_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_property_card_entries_related_slip_id ON property_card_entries(related_slip_id);
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'property_card_entries' 
        AND column_name = 'related_transfer_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_property_card_entries_related_transfer_id ON property_card_entries(related_transfer_id);
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'custodian_slip_items' 
        AND column_name = 'inventory_item_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_custodian_slip_items_inventory_item_id ON custodian_slip_items(inventory_item_id);
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_semi_expandable_categories_code 
    ON semi_expandable_categories(code) 
    WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_semi_expandable_categories_active_th 
    ON semi_expandable_categories(is_active, name);

-- ============================================================================
-- PART 5: FUNCTIONS
-- ============================================================================

-- Function for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to generate ICS numbers (supports optional prefix)
CREATE OR REPLACE FUNCTION public.generate_ics_number(sub_category_prefix TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  current_month TEXT;
  base_prefix TEXT;
  year_month_prefix TEXT;
  next_sequence INTEGER;
  formatted_sequence TEXT;
  generated_number TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM NOW())::TEXT;
  current_month := LPAD(EXTRACT(MONTH FROM NOW())::TEXT, 2, '0');
  base_prefix := COALESCE(NULLIF(sub_category_prefix, ''), 'ICS');
  year_month_prefix := base_prefix || '-' || current_year || '-' || current_month || '-';
  
  SELECT COALESCE(MAX(
    CASE 
      WHEN slip_number ~ ('^' || year_month_prefix || '[0-9]{4}$')
      THEN (REGEXP_REPLACE(slip_number, '^' || year_month_prefix, ''))::INTEGER
      ELSE 0
    END
  ), 0) + 1
  INTO next_sequence
  FROM public.custodian_slips
  WHERE slip_number LIKE (year_month_prefix || '%');
  
  formatted_sequence := LPAD(next_sequence::TEXT, 4, '0');
  generated_number := year_month_prefix || formatted_sequence;
  
  RETURN generated_number;
END;
$$ LANGUAGE plpgsql;

-- Function to set ICS number
CREATE OR REPLACE FUNCTION public.set_ics_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slip_number IS NULL OR NEW.slip_number = '' THEN
    NEW.slip_number := public.generate_ics_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate custodian numbers
CREATE OR REPLACE FUNCTION public.generate_custodian_no() 
RETURNS TRIGGER AS $$
DECLARE
  next_num INT;
BEGIN
  IF NEW.custodian_no IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(MAX((REGEXP_REPLACE(custodian_no, '^CUST-', ''))::INT), 0) + 1
  INTO next_num
  FROM public.custodians
  WHERE custodian_no ~ '^CUST-\\d+$';

  NEW.custodian_no := 'CUST-' || LPAD(next_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to set custodian slip item details
CREATE OR REPLACE FUNCTION public.set_custodian_slip_item_details()
RETURNS TRIGGER AS $$
DECLARE
  inventory_record RECORD;
  next_item_number INTEGER;
BEGIN
  IF NEW.inventory_item_id IS NOT NULL THEN
    SELECT unit_cost, total_cost, quantity, category
    INTO inventory_record
    FROM public.inventory_items
    WHERE id = NEW.inventory_item_id;
    
    IF FOUND THEN
      NEW.unit_cost = inventory_record.unit_cost;
      NEW.total_cost = NEW.quantity * inventory_record.unit_cost;
      NEW.amount = NEW.total_cost;
      
      NEW.estimated_useful_life = CASE 
        WHEN inventory_record.category = 'Equipment' THEN '5-10 years'
        WHEN inventory_record.category = 'Furniture' THEN '10-15 years'
        WHEN inventory_record.category = 'Semi-Expandable' THEN '3-5 years'
        ELSE '5 years'
      END;
    END IF;
  END IF;
  
  IF NEW.item_number IS NULL THEN
    SELECT COALESCE(MAX(item_number::INTEGER), 0) + 1
    INTO next_item_number
    FROM public.custodian_slip_items
    WHERE slip_id = NEW.slip_id
    AND item_number ~ '^[0-9]+$';
    
    NEW.item_number = next_item_number::TEXT;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check item availability
CREATE OR REPLACE FUNCTION public.is_item_available_for_assignment(item_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  item_record RECORD;
BEGIN
  SELECT * INTO item_record 
  FROM public.inventory_items 
  WHERE id = item_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  IF item_record.condition IN ('Unserviceable', 'Lost', 'Stolen', 'Damaged', 'Destroyed') THEN
    RETURN FALSE;
  END IF;
  
  IF item_record.assignment_status IN ('Assigned', 'In-Transit', 'Disposed', 'Damaged', 'Missing', 'Lost', 'Stolen') THEN
    RETURN FALSE;
  END IF;
  
  IF item_record.custodian IS NOT NULL AND item_record.custodian != '' THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to validate item availability
CREATE OR REPLACE FUNCTION public.validate_item_availability_before_assignment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.inventory_item_id IS NOT NULL AND NOT public.is_item_available_for_assignment(NEW.inventory_item_id) THEN
    RAISE EXCEPTION 'Item % is not available for assignment. It may be damaged, missing, or already assigned to another custodian.', NEW.inventory_item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update assignment status on condition change
CREATE OR REPLACE FUNCTION public.update_assignment_status_on_condition_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.condition IN ('Unserviceable', 'Lost', 'Stolen', 'Damaged', 'Destroyed') AND 
     OLD.condition NOT IN ('Unserviceable', 'Lost', 'Stolen', 'Damaged', 'Destroyed') THEN
    
    NEW.assignment_status = CASE 
      WHEN NEW.condition = 'Lost' THEN 'Lost'
      WHEN NEW.condition = 'Stolen' THEN 'Stolen' 
      WHEN NEW.condition = 'Damaged' THEN 'Damaged'
      WHEN NEW.condition = 'Destroyed' THEN 'Disposed'
      ELSE 'Damaged'
    END;
    
    NEW.custodian = NULL;
    NEW.custodian_position = NULL;
    NEW.assigned_date = NULL;
  END IF;
  
  IF NEW.condition = 'Serviceable' AND OLD.condition IN ('Unserviceable', 'Damaged') AND
     NEW.assignment_status IN ('Damaged', 'Missing') THEN
    NEW.assignment_status = 'Available';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Safe delete inventory item function
CREATE OR REPLACE FUNCTION public.safe_delete_inventory_item(item_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  item_record RECORD;
  slip_count INTEGER;
  entry_count INTEGER;
BEGIN
  SELECT * INTO item_record 
  FROM public.inventory_items 
  WHERE id = item_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item % not found', item_id;
  END IF;
  
  SELECT COUNT(*) INTO slip_count
  FROM public.custodian_slip_items 
  WHERE inventory_item_id = item_id;
  
  SELECT COUNT(*) INTO entry_count
  FROM public.property_card_entries 
  WHERE inventory_item_id = item_id;
  
  IF slip_count > 0 OR entry_count > 0 THEN
    DELETE FROM public.custodian_slip_items 
    WHERE inventory_item_id = item_id;
    
    DELETE FROM public.property_card_entries 
    WHERE inventory_item_id = item_id;
    
    DELETE FROM public.property_cards 
    WHERE inventory_item_id = item_id;
  END IF;
  
  DELETE FROM public.inventory_items 
  WHERE id = item_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Can delete inventory item function
CREATE OR REPLACE FUNCTION public.can_delete_inventory_item(item_id UUID)
RETURNS TABLE(
  can_delete BOOLEAN,
  reason TEXT,
  custodian_slips INTEGER,
  property_entries INTEGER
) AS $$
DECLARE
  slip_count INTEGER;
  entry_count INTEGER;
  item_record RECORD;
BEGIN
  SELECT * INTO item_record 
  FROM public.inventory_items 
  WHERE id = item_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Item not found', 0, 0;
  END IF;
  
  SELECT COUNT(*) INTO slip_count
  FROM public.custodian_slip_items 
  WHERE inventory_item_id = item_id;
  
  SELECT COUNT(*) INTO entry_count
  FROM public.property_card_entries 
  WHERE inventory_item_id = item_id;
  
  IF slip_count > 0 OR entry_count > 0 THEN
    RETURN QUERY SELECT 
      TRUE,
      'Item has ' || slip_count || ' custodian slip(s) and ' || entry_count || ' property card entry(ies). These will be deleted.',
      slip_count,
      entry_count;
  ELSE
    RETURN QUERY SELECT 
      TRUE,
      'Item can be deleted safely - no references found.',
      slip_count,
      entry_count;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Prevent inventory item deletion function
CREATE OR REPLACE FUNCTION public.prevent_inventory_item_deletion()
RETURNS TRIGGER AS $$
DECLARE
  slip_count INTEGER;
  entry_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO slip_count
  FROM public.custodian_slip_items 
  WHERE inventory_item_id = OLD.id;
  
  SELECT COUNT(*) INTO entry_count
  FROM public.property_card_entries 
  WHERE inventory_item_id = OLD.id;
  
  IF slip_count > 0 OR entry_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete inventory item % - it has % custodian slip(s) and % property card entry(ies). Use safe_delete_inventory_item function instead.', 
      OLD.id, slip_count, entry_count;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 6: TRIGGERS
-- ============================================================================

-- Updated_at triggers
DROP TRIGGER IF EXISTS update_user_profiles_timestamp ON user_profiles;
CREATE TRIGGER update_user_profiles_timestamp 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_departments_timestamp ON departments;
CREATE TRIGGER update_departments_timestamp 
    BEFORE UPDATE ON departments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_suppliers_timestamp ON suppliers;
CREATE TRIGGER update_suppliers_timestamp 
    BEFORE UPDATE ON suppliers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_fund_sources_timestamp ON fund_sources;
CREATE TRIGGER update_fund_sources_timestamp 
    BEFORE UPDATE ON fund_sources 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_locations_timestamp ON locations;
CREATE TRIGGER update_locations_timestamp 
    BEFORE UPDATE ON locations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inventory_items_timestamp ON inventory_items;
CREATE TRIGGER update_inventory_items_timestamp 
    BEFORE UPDATE ON inventory_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_property_cards_timestamp ON property_cards;
CREATE TRIGGER update_property_cards_timestamp 
    BEFORE UPDATE ON property_cards 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_property_card_entries_timestamp ON property_card_entries;
CREATE TRIGGER update_property_card_entries_timestamp 
    BEFORE UPDATE ON property_card_entries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_property_transfers_timestamp ON property_transfers;
CREATE TRIGGER update_property_transfers_timestamp 
    BEFORE UPDATE ON property_transfers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_custodian_slips_timestamp ON custodian_slips;
CREATE TRIGGER update_custodian_slips_timestamp 
    BEFORE UPDATE ON custodian_slips 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_physical_counts_timestamp ON physical_counts;
CREATE TRIGGER update_physical_counts_timestamp 
    BEFORE UPDATE ON physical_counts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_loss_reports_timestamp ON loss_reports;
CREATE TRIGGER update_loss_reports_timestamp 
    BEFORE UPDATE ON loss_reports 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_unserviceable_reports_timestamp ON unserviceable_reports;
CREATE TRIGGER update_unserviceable_reports_timestamp 
    BEFORE UPDATE ON unserviceable_reports 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_semi_expandable_categories_timestamp ON semi_expandable_categories;
CREATE TRIGGER update_semi_expandable_categories_timestamp 
    BEFORE UPDATE ON semi_expandable_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ICS number generation trigger
DROP TRIGGER IF EXISTS trg_set_ics_number ON public.custodian_slips;
CREATE TRIGGER trg_set_ics_number
  BEFORE INSERT ON public.custodian_slips
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ics_number();

-- Custodian number generation trigger
DROP TRIGGER IF EXISTS trg_generate_custodian_no ON public.custodians;
CREATE TRIGGER trg_generate_custodian_no
  BEFORE INSERT ON public.custodians
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_custodian_no();

-- Custodian slip item details trigger
DROP TRIGGER IF EXISTS trg_set_custodian_slip_item_details ON public.custodian_slip_items;
CREATE TRIGGER trg_set_custodian_slip_item_details
  BEFORE INSERT ON public.custodian_slip_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_custodian_slip_item_details();

-- Item availability validation trigger
DROP TRIGGER IF EXISTS trg_validate_item_availability ON public.custodian_slip_items;
CREATE TRIGGER trg_validate_item_availability
  BEFORE INSERT ON public.custodian_slip_items
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_item_availability_before_assignment();

-- Assignment status update trigger
DROP TRIGGER IF EXISTS trg_update_assignment_on_condition_change ON public.inventory_items;
CREATE TRIGGER trg_update_assignment_on_condition_change
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_assignment_status_on_condition_change();

-- Prevent inventory deletion trigger
DROP TRIGGER IF EXISTS trg_prevent_inventory_deletion ON public.inventory_items;
CREATE TRIGGER trg_prevent_inventory_deletion
  BEFORE DELETE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_inventory_item_deletion();

-- ============================================================================
-- PART 7: VIEWS
-- ============================================================================

-- Available inventory items view
DROP VIEW IF EXISTS available_inventory_items;
CREATE VIEW available_inventory_items AS
SELECT 
  ii.id,
  ii.property_number,
  ii.description,
  ii.brand,
  ii.model,
  ii.serial_number,
  COALESCE(ii.entity_name, '') as entity_name,
  ii.unit_of_measure,
  ii.quantity,
  ii.unit_cost,
  ii.total_cost,
  ii.date_acquired,
  ii.supplier_id,
  ii.condition,
  ii.custodian,
  ii.custodian_position,
  ii.accountable_officer,
  ii.fund_source_id,
  ii.remarks,
  ii.last_inventory_date,
  ii.category,
  ii.sub_category,
  ii.semi_expandable_category,
  ii.status,
  ii.estimated_useful_life,
  ii.estimated_useful_life_override,
  ii.created_at,
  ii.updated_at,
  CASE 
    WHEN ii.custodian IS NOT NULL AND ii.custodian != '' THEN 'Assigned'
    ELSE 'Available'
  END as assignment_status,
  CASE 
    WHEN ii.custodian IS NOT NULL AND ii.custodian != '' THEN ii.updated_at
    ELSE NULL
  END as assigned_date
FROM inventory_items ii
WHERE ii.status = 'Active' 
  AND ii.condition = 'Serviceable'
  AND (ii.custodian IS NULL OR ii.custodian = '');

-- Available inventory items with property cards view
DROP VIEW IF EXISTS available_inventory_items_with_property_cards;
CREATE VIEW available_inventory_items_with_property_cards AS
SELECT 
  ii.id,
  ii.property_number,
  ii.description,
  ii.brand,
  ii.model,
  ii.serial_number,
  ii.entity_name,
  ii.unit_of_measure,
  ii.quantity,
  ii.unit_cost,
  ii.total_cost,
  ii.date_acquired,
  ii.supplier_id,
  ii.condition,
  ii.fund_source_id,
  ii.remarks,
  ii.last_inventory_date,
  ii.category,
  ii.sub_category,
  ii.status,
  ii.estimated_useful_life,
  ii.estimated_useful_life_override,
  ii.created_at,
  ii.updated_at,
  ii.custodian,
  ii.custodian_position,
  ii.assignment_status,
  ii.assigned_date,
  pc.id as property_card_id,
  pc.entity_name as property_card_entity_name
FROM inventory_items ii
INNER JOIN property_cards pc ON ii.id = pc.inventory_item_id
WHERE ii.status = 'Active' 
  AND ii.condition = 'Serviceable'
  AND (ii.assignment_status IS NULL OR ii.assignment_status = 'Available')
  AND (ii.custodian IS NULL OR ii.custodian = '');

-- ============================================================================
-- PART 8: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE fund_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_card_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE custodian_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE custodian_slip_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_count_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE loss_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE loss_report_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE unserviceable_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE unserviceable_report_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE semi_expandable_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE custodians ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated users to read all data" ON ' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated users to modify data" ON ' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- Create read policies for all tables
CREATE POLICY "Allow authenticated users to read all data" ON user_profiles
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read all data" ON departments
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read all data" ON suppliers
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read all data" ON fund_sources
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read all data" ON locations
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read all data" ON inventory_items
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read all data" ON property_cards
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read all data" ON property_card_entries
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read all data" ON property_transfers
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read all data" ON transfer_items
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read all data" ON custodian_slips
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read all data" ON custodian_slip_items
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read all data" ON physical_counts
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read all data" ON physical_count_items
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read all data" ON loss_reports
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read all data" ON loss_report_items
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read all data" ON unserviceable_reports
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read all data" ON unserviceable_report_items
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read all data" ON audit_logs
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read all data" ON semi_expandable_categories
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read all data" ON custodians
    FOR SELECT TO authenticated USING (true);

-- Create modify policies for all tables
CREATE POLICY "Allow authenticated users to modify data" ON user_profiles
    FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to modify data" ON departments
    FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to modify data" ON suppliers
    FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to modify data" ON fund_sources
    FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to modify data" ON locations
    FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to modify data" ON inventory_items
    FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to modify data" ON property_cards
    FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to modify data" ON property_card_entries
    FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to modify data" ON property_transfers
    FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to modify data" ON transfer_items
    FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to modify data" ON custodian_slips
    FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to modify data" ON custodian_slip_items
    FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to modify data" ON physical_counts
    FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to modify data" ON physical_count_items
    FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to modify data" ON loss_reports
    FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to modify data" ON loss_report_items
    FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to modify data" ON unserviceable_reports
    FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to modify data" ON unserviceable_report_items
    FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to modify data" ON audit_logs
    FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to modify data" ON semi_expandable_categories
    FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to modify data" ON custodians
    FOR ALL TO authenticated USING (true);

-- Additional custodian policies
DROP POLICY IF EXISTS custodian_select_all ON public.custodians;
DROP POLICY IF EXISTS custodian_insert_all ON public.custodians;
DROP POLICY IF EXISTS custodian_update_all ON public.custodians;
DROP POLICY IF EXISTS custodian_delete_all ON public.custodians;

CREATE POLICY custodian_select_all ON public.custodians FOR SELECT USING (true);
CREATE POLICY custodian_insert_all ON public.custodians FOR INSERT WITH CHECK (true);
CREATE POLICY custodian_update_all ON public.custodians FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY custodian_delete_all ON public.custodians FOR DELETE USING (true);

-- ============================================================================
-- PART 9: SEED DATA
-- ============================================================================

-- Seed semi-expandable categories
INSERT INTO semi_expandable_categories (name, code, is_active)
SELECT * FROM (VALUES
    ('LAND', 'LAND', true),
    ('LAND IMPROVEMENTS, AQUACULTURE STRUCTURE', 'LAND-IMPROVEMENTS-AQUACULTURE', true),
    ('OTHER LAND IMPROVEMENTS', 'OTHER-LAND-IMPROVEMENTS', true),
    ('ROAD NETWORKS', 'ROAD-NETWORKS', true),
    ('WATER SUPPLY SYSTEMS', 'WATER-SUPPLY', true),
    ('POWER SUPPLY SYSTEMS', 'POWER-SUPPLY', true),
    ('COMMUNICATION NETWORK', 'COMMUNICATION-NETWORK', true),
    ('OTHER INFRASTRUCTURE ASSETS', 'OTHER-INFRASTRUCTURE', true),
    ('BUILDINGS', 'BUILDINGS', true),
    ('HOSPITALS AND HEALTH CENTERS', 'HOSPITALS-HEALTH', true),
    ('MARKETS', 'MARKETS', true),
    ('OTHER STRUCTURES', 'OTHER-STRUCTURES', true),
    ('MACHINERY', 'MACHINERY', true),
    ('OFFICE EQUIPMENT', 'OFFICE-EQUIPMENT', true),
    ('INFORMATION AND COMMUNICATION TECHNOLOGY EQUIPMENT', 'ICT-EQUIPMENT', true),
    ('COMPUTER SOFTWARE', 'COMPUTER-SOFTWARE', true),
    ('AGRICULTURAL AND FORESTRY EQUIPMENT', 'AGRICULTURAL-FORESTRY', true),
    ('COMMUNICATION EQUIPMENT', 'COMMUNICATION-EQUIPMENT', true),
    ('CONSTRUCTION AND HEAVY EQUIPMENT', 'CONSTRUCTION-HEAVY', true),
    ('DISASTER RESPONSE AND RESCUE EQUIPMENT', 'DISASTER-RESCUE', true),
    ('MILITARY, POLICE AND SECURITY EQUIPMENT', 'MILITARY-POLICE-SECURITY', true),
    ('MEDICAL EQUIPMENT', 'MEDICAL-EQUIPMENT', true),
    ('PRINTING EQUIPMENT', 'PRINTING-EQUIPMENT', true),
    ('SPORTS EQUIPMENT', 'SPORTS-EQUIPMENT', true),
    ('TECHNICAL AND SCIENTIFIC EQUIPMENT', 'TECHNICAL-SCIENTIFIC', true),
    ('OTHER MACHINERY AND EQUIPMENT', 'OTHER-MACHINERY', true),
    ('MOTOR VEHICLES', 'MOTOR-VEHICLES', true),
    ('WATERCRAFTS', 'WATERCRAFTS', true),
    ('FURNITURE AND FIXTURES', 'FURNITURE-FIXTURES', true),
    ('BOOKS', 'BOOKS', true),
    ('OTHER PROPERTY, PLANT AND EQUIPMENT', 'OTHER-PPE', true)
) AS v(name, code, is_active)
WHERE NOT EXISTS (
    SELECT 1 FROM semi_expandable_categories WHERE name = v.name
);

-- ============================================================================
-- PART 10: GRANTS AND PERMISSIONS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
GRANT SELECT ON available_inventory_items TO anon, authenticated;
GRANT SELECT ON available_inventory_items_with_property_cards TO anon, authenticated;

-- ============================================================================
-- COMPLETE!
-- ============================================================================

SELECT 'Database schema setup complete!' as status;
SELECT COUNT(*) as total_tables FROM information_schema.tables WHERE table_schema = 'public';
SELECT COUNT(*) as total_functions FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

