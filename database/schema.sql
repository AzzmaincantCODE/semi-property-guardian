-- Property Management System Database Schema
-- This schema covers all input forms and data structures in the application

-- Users and Authentication
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    position TEXT,
    department TEXT,
    role TEXT NOT NULL DEFAULT 'user', -- admin, manager, user
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Departments
CREATE TABLE departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    head_officer TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers
CREATE TABLE suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Fund Sources
CREATE TABLE fund_sources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Locations
CREATE TABLE locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    building TEXT,
    room TEXT,
    floor TEXT,
    department_id TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- Main Inventory Items
CREATE TABLE inventory_items (
    id TEXT PRIMARY KEY,
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
    supplier_id TEXT,
    condition TEXT NOT NULL DEFAULT 'Serviceable', -- Serviceable, Unserviceable, For Repair, Lost, Stolen, Damaged, Destroyed
    location_id TEXT,
    custodian_id TEXT,
    custodian_position TEXT,
    accountable_officer TEXT,
    fund_source_id TEXT,
    remarks TEXT,
    last_inventory_date DATE,
    category TEXT NOT NULL DEFAULT 'Semi-Expandable', -- Semi-Expandable, Equipment, Furniture
    status TEXT NOT NULL DEFAULT 'Active', -- Active, Transferred, Disposed, Missing
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (custodian_id) REFERENCES users(id),
    FOREIGN KEY (fund_source_id) REFERENCES fund_sources(id)
);

-- Property Cards (Semi-Expandable Property Cards)
CREATE TABLE property_cards (
    id TEXT PRIMARY KEY,
    entity_name TEXT NOT NULL,
    fund_cluster TEXT NOT NULL,
    semi_expendable_property TEXT NOT NULL,
    property_number TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    date_acquired DATE NOT NULL,
    remarks TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Property Card Entries (SPC Entries)
CREATE TABLE property_card_entries (
    id TEXT PRIMARY KEY,
    property_card_id TEXT NOT NULL,
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_card_id) REFERENCES property_cards(id) ON DELETE CASCADE
);

-- Property Transfers
CREATE TABLE property_transfers (
    id TEXT PRIMARY KEY,
    transfer_number TEXT UNIQUE NOT NULL,
    from_department TEXT NOT NULL,
    to_department TEXT NOT NULL,
    transfer_type TEXT NOT NULL DEFAULT 'Permanent', -- Permanent, Temporary, Loan
    status TEXT NOT NULL DEFAULT 'Pending', -- Pending, In Transit, Completed, Rejected
    requested_by TEXT NOT NULL,
    approved_by TEXT,
    date_requested DATE NOT NULL,
    date_approved DATE,
    date_completed DATE,
    reason TEXT NOT NULL,
    remarks TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requested_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Transfer Items
CREATE TABLE transfer_items (
    id TEXT PRIMARY KEY,
    transfer_id TEXT NOT NULL,
    property_number TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    condition TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transfer_id) REFERENCES property_transfers(id) ON DELETE CASCADE
);

-- Custodian Slips
CREATE TABLE custodian_slips (
    id TEXT PRIMARY KEY,
    slip_number TEXT UNIQUE NOT NULL,
    custodian_name TEXT NOT NULL,
    designation TEXT NOT NULL,
    office TEXT NOT NULL,
    date_issued DATE NOT NULL,
    issued_by TEXT NOT NULL,
    received_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (issued_by) REFERENCES users(id)
);

-- Custodian Slip Items
CREATE TABLE custodian_slip_items (
    id TEXT PRIMARY KEY,
    slip_id TEXT NOT NULL,
    property_number TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit TEXT NOT NULL,
    date_issued DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (slip_id) REFERENCES custodian_slips(id) ON DELETE CASCADE
);

-- Physical Counts
CREATE TABLE physical_counts (
    id TEXT PRIMARY KEY,
    count_number TEXT UNIQUE NOT NULL,
    department TEXT NOT NULL,
    count_date DATE NOT NULL,
    count_type TEXT NOT NULL DEFAULT 'Annual', -- Annual, Quarterly, Special, Spot Check
    status TEXT NOT NULL DEFAULT 'Planned', -- Planned, In Progress, Completed, Under Review
    conducted_by TEXT NOT NULL, -- JSON array of user IDs
    witnessed_by TEXT NOT NULL,
    approved_by TEXT NOT NULL,
    total_expected INTEGER NOT NULL DEFAULT 0,
    total_actual INTEGER NOT NULL DEFAULT 0,
    total_variance INTEGER NOT NULL DEFAULT 0,
    remarks TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Physical Count Items
CREATE TABLE physical_count_items (
    id TEXT PRIMARY KEY,
    count_id TEXT NOT NULL,
    property_number TEXT NOT NULL,
    description TEXT NOT NULL,
    expected_quantity INTEGER NOT NULL DEFAULT 0,
    actual_quantity INTEGER NOT NULL DEFAULT 0,
    condition TEXT NOT NULL, -- Serviceable, For Repair, Unserviceable, Missing
    location TEXT NOT NULL,
    remarks TEXT,
    variance INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (count_id) REFERENCES physical_counts(id) ON DELETE CASCADE
);

-- Loss Reports
CREATE TABLE loss_reports (
    id TEXT PRIMARY KEY,
    report_number TEXT UNIQUE NOT NULL,
    department TEXT NOT NULL,
    report_date DATE NOT NULL,
    incident_date DATE NOT NULL,
    report_type TEXT NOT NULL, -- Lost, Stolen, Damaged, Destroyed
    status TEXT NOT NULL DEFAULT 'Draft', -- Draft, Submitted, Under Investigation, Approved, Rejected
    reported_by TEXT NOT NULL,
    investigated_by TEXT,
    approved_by TEXT,
    total_loss_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    incident_description TEXT NOT NULL,
    actions_taken TEXT,
    recommendations TEXT,
    attachments TEXT, -- JSON array of file paths
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reported_by) REFERENCES users(id),
    FOREIGN KEY (investigated_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Loss Report Items
CREATE TABLE loss_report_items (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL,
    property_number TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
    date_acquired DATE NOT NULL,
    condition TEXT NOT NULL, -- Lost, Stolen, Damaged, Destroyed
    circumstances TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES loss_reports(id) ON DELETE CASCADE
);

-- Unserviceable Reports
CREATE TABLE unserviceable_reports (
    id TEXT PRIMARY KEY,
    report_number TEXT UNIQUE NOT NULL,
    report_date DATE NOT NULL,
    department TEXT NOT NULL,
    inspected_by TEXT NOT NULL, -- JSON array of user IDs
    review_period TEXT NOT NULL,
    total_value DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Unserviceable Report Items
CREATE TABLE unserviceable_report_items (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL,
    property_number TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
    date_acquired DATE NOT NULL,
    condition TEXT NOT NULL DEFAULT 'Unserviceable',
    defects TEXT NOT NULL,
    recommendation TEXT NOT NULL, -- Repair, Condemn, Donate, Sell
    estimated_repair_cost DECIMAL(15,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES unserviceable_reports(id) ON DELETE CASCADE
);

-- Audit Log
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL, -- INSERT, UPDATE, DELETE
    old_values TEXT, -- JSON
    new_values TEXT, -- JSON
    user_id TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
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

-- Triggers for updated_at timestamps
CREATE TRIGGER update_users_timestamp 
    AFTER UPDATE ON users 
    BEGIN 
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_inventory_items_timestamp 
    AFTER UPDATE ON inventory_items 
    BEGIN 
        UPDATE inventory_items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_property_transfers_timestamp 
    AFTER UPDATE ON property_transfers 
    BEGIN 
        UPDATE property_transfers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_physical_counts_timestamp 
    AFTER UPDATE ON physical_counts 
    BEGIN 
        UPDATE physical_counts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_loss_reports_timestamp 
    AFTER UPDATE ON loss_reports 
    BEGIN 
        UPDATE loss_reports SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
