-- Add missing fields to custodian slip items for Annex A.3 compliance
-- Run this in Supabase SQL Editor

-- Add missing columns to custodian_slip_items table
alter table public.custodian_slip_items 
add column if not exists unit_cost decimal(15,2) default 0,
add column if not exists total_cost decimal(15,2) default 0,
add column if not exists amount decimal(15,2) default 0,
add column if not exists item_number text,
add column if not exists estimated_useful_life text;

-- Create function to auto-generate item numbers and calculate costs
create or replace function public.set_custodian_slip_item_details()
returns trigger as $$
declare
  inventory_record record;
  next_item_number integer;
begin
  -- Get inventory item details for cost calculation
  select unit_cost, total_cost, quantity, category
  into inventory_record
  from public.inventory_items
  where id = NEW.inventory_item_id;
  
  if found then
    -- Set costs from inventory item
    NEW.unit_cost = inventory_record.unit_cost;
    NEW.total_cost = NEW.quantity * inventory_record.unit_cost;
    NEW.amount = NEW.total_cost; -- Amount is same as total cost for Annex compliance
    
    -- Set estimated useful life based on category
    NEW.estimated_useful_life = case 
      when inventory_record.category = 'Equipment' then '5-10 years'
      when inventory_record.category = 'Furniture' then '10-15 years'
      when inventory_record.category = 'Semi-Expandable' then '3-5 years'
      else '5 years'
    end;
  end if;
  
  -- Generate sequential item number for this slip
  if NEW.item_number is null then
    select coalesce(max(item_number::integer), 0) + 1
    into next_item_number
    from public.custodian_slip_items
    where slip_id = NEW.slip_id
    and item_number ~ '^[0-9]+$';
    
    NEW.item_number = next_item_number::text;
  end if;
  
  return NEW;
end;
$$ language plpgsql;

-- Create trigger to auto-populate item details
drop trigger if exists trg_set_custodian_slip_item_details on public.custodian_slip_items;
create trigger trg_set_custodian_slip_item_details
  before insert on public.custodian_slip_items
  for each row
  execute function public.set_custodian_slip_item_details();

-- Update existing records with calculated values
update public.custodian_slip_items csi
set 
  unit_cost = ii.unit_cost,
  total_cost = csi.quantity * ii.unit_cost,
  amount = csi.quantity * ii.unit_cost,
  estimated_useful_life = case 
    when ii.category = 'Equipment' then '5-10 years'
    when ii.category = 'Furniture' then '10-15 years'
    when ii.category = 'Semi-Expandable' then '3-5 years'
    else '5 years'
  end
from public.inventory_items ii
where csi.inventory_item_id = ii.id
and (csi.unit_cost is null or csi.unit_cost = 0);

-- Generate item numbers for existing records
with numbered_items as (
  select 
    id,
    slip_id,
    row_number() over (partition by slip_id order by created_at) as item_num
  from public.custodian_slip_items
  where item_number is null
)
update public.custodian_slip_items
set item_number = numbered_items.item_num::text
from numbered_items
where custodian_slip_items.id = numbered_items.id;

-- Add helpful comments
comment on column public.custodian_slip_items.unit_cost is 'Unit cost of the inventory item (from inventory_items table)';
comment on column public.custodian_slip_items.total_cost is 'Calculated total cost (quantity × unit_cost)';
comment on column public.custodian_slip_items.amount is 'Amount field for Annex A.3 compliance (same as total_cost)';
comment on column public.custodian_slip_items.item_number is 'Sequential item number within the custodian slip';
comment on column public.custodian_slip_items.estimated_useful_life is 'Estimated useful life based on item category';

-- Verify the updates
select 
  csi.property_number,
  csi.description,
  csi.quantity,
  csi.unit,
  csi.unit_cost,
  csi.total_cost,
  csi.amount,
  csi.item_number,
  csi.estimated_useful_life
from public.custodian_slip_items csi
join public.custodian_slips cs on csi.slip_id = cs.id
order by cs.created_at desc, csi.item_number::integer
limit 10;
