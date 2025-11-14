-- Annex Format Alignment Schema Updates
-- Run this in Supabase SQL Editor to align database with Annex format requirements

-- Add missing columns to inventory_items for proper Annex compliance
alter table public.inventory_items 
add column if not exists assignment_status text default 'Available' check (assignment_status in ('Available', 'Assigned', 'In-Transit', 'Disposed'));

alter table public.inventory_items 
add column if not exists assigned_date date;

-- Add inventory_item_id to property_cards to link them properly
alter table public.property_cards 
add column if not exists inventory_item_id uuid references public.inventory_items(id);

-- Add missing columns to property_card_entries for full Annex A.1 compliance
alter table public.property_card_entries 
add column if not exists remarks text;

alter table public.property_card_entries 
add column if not exists related_slip_id uuid references public.custodian_slips(id);

alter table public.property_card_entries 
add column if not exists related_transfer_id uuid;

-- Add missing columns to custodian_slip_items for proper linking
alter table public.custodian_slip_items 
add column if not exists inventory_item_id uuid references public.inventory_items(id);

alter table public.custodian_slip_items 
add column if not exists property_card_entry_id uuid references public.property_card_entries(id);

-- Create indexes for better performance
create index if not exists idx_property_cards_inventory_item_id on public.property_cards(inventory_item_id);
create index if not exists idx_property_card_entries_related_slip_id on public.property_card_entries(related_slip_id);
create index if not exists idx_custodian_slip_items_inventory_item_id on public.custodian_slip_items(inventory_item_id);
create index if not exists idx_inventory_items_assignment_status on public.inventory_items(assignment_status);

-- Update existing inventory items to have proper assignment status
update public.inventory_items 
set assignment_status = case 
  when custodian is not null and custodian != '' then 'Assigned'
  else 'Available'
end
where assignment_status is null;

-- Create a function to automatically generate property card entries when custodian slips are created
create or replace function public.create_property_card_entry_for_slip()
returns trigger as $$
declare
  property_card_id uuid;
  slip_record record;
begin
  -- Get the custodian slip details
  select * into slip_record from public.custodian_slips where id = NEW.slip_id;
  
  -- Find or create property card for this inventory item
  select id into property_card_id 
  from public.property_cards 
  where inventory_item_id = NEW.inventory_item_id;
  
  -- If no property card exists, we'll need to create one
  -- This would typically be handled by the application layer
  
  if property_card_id is not null then
    -- Create property card entry for this custodian slip item
    insert into public.property_card_entries (
      property_card_id,
      date,
      reference,
      receipt_qty,
      unit_cost,
      total_cost,
      issue_item_no,
      issue_qty,
      office_officer,
      balance_qty,
      amount,
      remarks,
      related_slip_id
    ) values (
      property_card_id,
      slip_record.date_issued,
      slip_record.slip_number,
      0, -- This is an issue, not a receipt
      0,
      0,
      slip_record.slip_number,
      NEW.quantity,
      slip_record.custodian_name || ' (' || slip_record.designation || ')',
      0, -- Item is now with custodian
      0,
      'Issued via ICS ' || slip_record.slip_number,
      NEW.slip_id
    );
  end if;
  
  return NEW;
end;
$$ language plpgsql;

-- Create trigger to automatically create property card entries
drop trigger if exists trg_create_property_card_entry_for_slip on public.custodian_slip_items;
create trigger trg_create_property_card_entry_for_slip
  after insert on public.custodian_slip_items
  for each row
  execute function public.create_property_card_entry_for_slip();

-- Create a function to update inventory assignment status when custodian slips are created
create or replace function public.update_inventory_assignment_status()
returns trigger as $$
declare
  slip_record record;
begin
  -- Get the custodian slip details
  select * into slip_record from public.custodian_slips where id = NEW.slip_id;
  
  -- Update the inventory item assignment status
  update public.inventory_items
  set 
    custodian = slip_record.custodian_name,
    custodian_position = slip_record.designation,
    assignment_status = 'Assigned',
    assigned_date = slip_record.date_issued,
    updated_at = now()
  where id = NEW.inventory_item_id;
  
  return NEW;
end;
$$ language plpgsql;

-- Create trigger to update inventory assignment status
drop trigger if exists trg_update_inventory_assignment_status on public.custodian_slip_items;
create trigger trg_update_inventory_assignment_status
  after insert on public.custodian_slip_items
  for each row
  execute function public.update_inventory_assignment_status();

-- Create a function to handle custodian slip deletion (release inventory items)
create or replace function public.release_inventory_on_slip_deletion()
returns trigger as $$
begin
  -- Update all inventory items associated with this slip
  update public.inventory_items
  set 
    custodian = null,
    custodian_position = null,
    assignment_status = 'Available',
    assigned_date = null,
    updated_at = now()
  where id in (
    select inventory_item_id 
    from public.custodian_slip_items 
    where slip_id = OLD.id
  );
  
  return OLD;
end;
$$ language plpgsql;

-- Create trigger to release inventory items when slip is deleted
drop trigger if exists trg_release_inventory_on_slip_deletion on public.custodian_slips;
create trigger trg_release_inventory_on_slip_deletion
  before delete on public.custodian_slips
  for each row
  execute function public.release_inventory_on_slip_deletion();

-- Add RLS policies for new columns (if RLS is enabled)
-- These policies assume the same access patterns as existing tables

-- Grant necessary permissions
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant all on all functions in schema public to anon, authenticated;

-- Add helpful comments
comment on column public.inventory_items.assignment_status is 'Tracks the assignment status of inventory items for Annex compliance';
comment on column public.inventory_items.assigned_date is 'Date when the item was assigned to a custodian';
comment on column public.property_cards.inventory_item_id is 'Links property card to its source inventory item';
comment on column public.property_card_entries.related_slip_id is 'Links entry to the custodian slip that created it';
comment on column public.custodian_slip_items.inventory_item_id is 'Links slip item to its source inventory item';
comment on column public.custodian_slip_items.property_card_entry_id is 'Links slip item to the property card entry it created';

-- Create a view for easy Annex-compliant reporting
create or replace view public.annex_property_card_view as
select 
  pc.id as property_card_id,
  pc.entity_name,
  pc.fund_cluster,
  pc.semi_expendable_property,
  pc.property_number,
  pc.description,
  pc.date_acquired,
  pc.remarks as card_remarks,
  ii.brand,
  ii.model,
  ii.serial_number,
  ii.unit_of_measure,
  ii.unit_cost,
  ii.total_cost,
  coalesce(s.name, ii.supplier_id::text) as supplier,
  coalesce(l.name, ii.location_id::text) as location,
  coalesce(u.full_name, ii.custodian_id::text) as custodian,
  ii.custodian_position,
  ii.accountable_officer,
  coalesce(f.name, ii.fund_source_id::text) as fund_source,
  ii.assignment_status,
  ii.assigned_date,
  pc.created_at,
  pc.updated_at
from public.property_cards pc
left join public.inventory_items ii on pc.inventory_item_id = ii.id
left join public.suppliers s on ii.supplier_id = s.id
left join public.locations l on ii.location_id = l.id
left join public.user_profiles u on ii.custodian_id = u.id
left join public.fund_sources f on ii.fund_source_id = f.id;

comment on view public.annex_property_card_view is 'Unified view of property cards with their linked inventory item details for Annex reporting';
