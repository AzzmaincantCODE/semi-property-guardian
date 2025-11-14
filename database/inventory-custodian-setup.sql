-- Add custodian tracking to inventory_items table
-- Run this in Supabase SQL Editor

-- Add custodian column to inventory_items if it doesn't exist
alter table public.inventory_items 
add column if not exists custodian text,
add column if not exists custodian_position text,
add column if not exists assigned_date date,
add column if not exists assignment_status text default 'Available';

-- Create an index for better performance on custodian queries
create index if not exists idx_inventory_items_custodian on public.inventory_items(custodian);
create index if not exists idx_inventory_items_assignment_status on public.inventory_items(assignment_status);

-- Update existing items to have 'Available' status if they don't have a custodian
update public.inventory_items 
set assignment_status = 'Available' 
where assignment_status is null and custodian is null;

-- Update existing items to have 'Assigned' status if they have a custodian
update public.inventory_items 
set assignment_status = 'Assigned' 
where custodian is not null and assignment_status is null;

-- Verify the setup
select 
  id, 
  property_number, 
  description, 
  custodian, 
  custodian_position, 
  assignment_status,
  assigned_date
from public.inventory_items 
limit 10;
