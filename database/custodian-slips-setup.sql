-- Custodian Slips Tables Setup
-- Run this in Supabase SQL Editor

-- Create custodian_slips table
create table if not exists public.custodian_slips (
  id uuid primary key default uuid_generate_v4(),
  slip_number text not null,
  custodian_name text not null,
  designation text,
  office text,
  date_issued date,
  issued_by text,
  received_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create custodian_slip_items table
create table if not exists public.custodian_slip_items (
  id uuid primary key default uuid_generate_v4(),
  slip_id uuid references public.custodian_slips(id) on delete cascade,
  property_number text,
  description text,
  quantity integer default 1,
  unit text default 'pcs',
  date_issued date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.custodian_slips enable row level security;
alter table public.custodian_slip_items enable row level security;

-- Create policies for custodian_slips table
drop policy if exists custodian_slip_select_all on public.custodian_slips;
drop policy if exists custodian_slip_insert_all on public.custodian_slips;
drop policy if exists custodian_slip_update_all on public.custodian_slips;
drop policy if exists custodian_slip_delete_all on public.custodian_slips;

create policy custodian_slip_select_all on public.custodian_slips for select using (true);
create policy custodian_slip_insert_all on public.custodian_slips for insert with check (true);
create policy custodian_slip_update_all on public.custodian_slips for update using (true) with check (true);
create policy custodian_slip_delete_all on public.custodian_slips for delete using (true);

-- Create policies for custodian_slip_items table
drop policy if exists custodian_slip_item_select_all on public.custodian_slip_items;
drop policy if exists custodian_slip_item_insert_all on public.custodian_slip_items;
drop policy if exists custodian_slip_item_update_all on public.custodian_slip_items;
drop policy if exists custodian_slip_item_delete_all on public.custodian_slip_items;

create policy custodian_slip_item_select_all on public.custodian_slip_items for select using (true);
create policy custodian_slip_item_insert_all on public.custodian_slip_items for insert with check (true);
create policy custodian_slip_item_update_all on public.custodian_slip_items for update using (true) with check (true);
create policy custodian_slip_item_delete_all on public.custodian_slip_items for delete using (true);

-- Insert some sample custodian slips for testing
insert into public.custodian_slips (slip_number, custodian_name, designation, office, date_issued, issued_by, received_by) values
  ('CS-2024-001', 'John Smith', 'IT Manager', 'Information Technology Department', '2024-01-15', 'Jane Doe', 'John Smith'),
  ('CS-2024-002', 'Sarah Wilson', 'Finance Officer', 'Finance Department', '2024-01-16', 'Mike Johnson', 'Sarah Wilson'),
  ('CS-2024-003', 'David Brown', 'Operations Supervisor', 'Operations Department', '2024-01-17', 'Lisa Garcia', 'David Brown')
on conflict (slip_number) do nothing;

-- Insert sample items for the slips
insert into public.custodian_slip_items (slip_id, property_number, description, quantity, unit, date_issued)
select 
  cs.id,
  'PROP-001',
  'Desktop Computer - Dell OptiPlex',
  1,
  'unit',
  cs.date_issued
from public.custodian_slips cs 
where cs.slip_number = 'CS-2024-001'
on conflict do nothing;

insert into public.custodian_slip_items (slip_id, property_number, description, quantity, unit, date_issued)
select 
  cs.id,
  'PROP-002',
  'Laptop Computer - HP EliteBook',
  1,
  'unit',
  cs.date_issued
from public.custodian_slips cs 
where cs.slip_number = 'CS-2024-002'
on conflict do nothing;

-- Verify the setup
select 
  cs.id,
  cs.slip_number,
  cs.custodian_name,
  cs.designation,
  cs.office,
  cs.date_issued,
  cs.issued_by,
  cs.received_by,
  count(csi.id) as item_count
from public.custodian_slips cs
left join public.custodian_slip_items csi on cs.id = csi.slip_id
group by cs.id, cs.slip_number, cs.custodian_name, cs.designation, cs.office, cs.date_issued, cs.issued_by, cs.received_by
order by cs.created_at desc;
