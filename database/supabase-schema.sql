-- Supabase PostgreSQL Schema for Property Management System
-- This schema is optimized for Supabase with proper PostgreSQL features

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
CREATE TABLE departments (
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
CREATE TABLE suppliers (
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
CREATE TABLE fund_sources (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Locations
CREATE TABLE locations (
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
CREATE TABLE inventory_items (
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
CREATE TABLE property_cards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    entity_name TEXT NOT NULL,
    fund_cluster TEXT NOT NULL,
    semi_expendable_property TEXT NOT NULL,
    property_number TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    date_acquired DATE NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Property Card Entries (SPC Entries)
CREATE TABLE property_card_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    property_card_id UUID NOT NULL REFERENCES property_cards(id) ON DELETE CASCADE,
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
CREATE TABLE property_transfers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    transfer_number TEXT UNIQUE NOT NULL,
    from_department TEXT NOT NULL,
    to_department TEXT NOT NULL,
    transfer_type TEXT NOT NULL DEFAULT 'Permanent' CHECK (transfer_type IN ('Permanent', 'Temporary', 'Loan')),
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Transit', 'Completed', 'Rejected')),
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
CREATE TABLE transfer_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    transfer_id UUID NOT NULL REFERENCES property_transfers(id) ON DELETE CASCADE,
    property_number TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    condition TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custodian Slips
CREATE TABLE custodian_slips (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    slip_number TEXT UNIQUE NOT NULL,
    custodian_name TEXT NOT NULL,
    designation TEXT NOT NULL,
    office TEXT NOT NULL,
    date_issued DATE NOT NULL,
    issued_by UUID NOT NULL REFERENCES auth.users(id),
    received_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custodian Slip Items
CREATE TABLE custodian_slip_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    slip_id UUID NOT NULL REFERENCES custodian_slips(id) ON DELETE CASCADE,
    property_number TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit TEXT NOT NULL,
    date_issued DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Physical Counts
CREATE TABLE physical_counts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    count_number TEXT UNIQUE NOT NULL,
    department TEXT NOT NULL,
    count_date DATE NOT NULL,
    count_type TEXT NOT NULL DEFAULT 'Annual' CHECK (count_type IN ('Annual', 'Quarterly', 'Special', 'Spot Check')),
    status TEXT NOT NULL DEFAULT 'Planned' CHECK (status IN ('Planned', 'In Progress', 'Completed', 'Under Review')),
    conducted_by TEXT[] NOT NULL, -- Array of user IDs
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
CREATE TABLE physical_count_items (
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
CREATE TABLE loss_reports (
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
    attachments TEXT[], -- Array of file paths
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Loss Report Items
CREATE TABLE loss_report_items (
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
CREATE TABLE unserviceable_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    report_number TEXT UNIQUE NOT NULL,
    report_date DATE NOT NULL,
    department TEXT NOT NULL,
    inspected_by TEXT[] NOT NULL, -- Array of user IDs
    review_period TEXT NOT NULL,
    total_value DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unserviceable Report Items
CREATE TABLE unserviceable_report_items (
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
CREATE TABLE audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_inventory_items_property_number ON inventory_items(property_number);
CREATE INDEX idx_inventory_items_category ON inventory_items(category);
CREATE INDEX idx_inventory_items_status ON inventory_items(status);
CREATE INDEX idx_inventory_items_custodian ON inventory_items(custodian_id);
CREATE INDEX idx_inventory_items_location ON inventory_items(location_id);

CREATE INDEX idx_property_transfers_status ON property_transfers(status);
CREATE INDEX idx_property_transfers_date ON property_transfers(date_requested);

CREATE INDEX idx_physical_counts_department ON physical_counts(department);
CREATE INDEX idx_physical_counts_date ON physical_counts(count_date);

CREATE INDEX idx_loss_reports_status ON loss_reports(status);
CREATE INDEX idx_loss_reports_date ON loss_reports(report_date);

CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at timestamps
CREATE TRIGGER update_user_profiles_timestamp 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_departments_timestamp 
    BEFORE UPDATE ON departments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_timestamp 
    BEFORE UPDATE ON suppliers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fund_sources_timestamp 
    BEFORE UPDATE ON fund_sources 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_timestamp 
    BEFORE UPDATE ON locations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_items_timestamp 
    BEFORE UPDATE ON inventory_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_cards_timestamp 
    BEFORE UPDATE ON property_cards 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_card_entries_timestamp 
    BEFORE UPDATE ON property_card_entries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_transfers_timestamp 
    BEFORE UPDATE ON property_transfers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custodian_slips_timestamp 
    BEFORE UPDATE ON custodian_slips 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_physical_counts_timestamp 
    BEFORE UPDATE ON physical_counts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loss_reports_timestamp 
    BEFORE UPDATE ON loss_reports 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_unserviceable_reports_timestamp 
    BEFORE UPDATE ON unserviceable_reports 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
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

-- Basic RLS policies (adjust based on your security requirements)
-- Allow authenticated users to read all data
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

-- Allow authenticated users to insert/update/delete (adjust based on your needs)
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
