-- Improved Estimated Useful Life Calculation
-- Run this in Supabase SQL Editor

-- Create a lookup table for estimated useful life by category and cost range
create table if not exists public.estimated_useful_life_rules (
  id uuid primary key default uuid_generate_v4(),
  category text not null,
  min_cost decimal(15,2) default 0,
  max_cost decimal(15,2) default 999999999,
  estimated_life text not null,
  description text,
  created_at timestamptz default now()
);

-- Insert standard government property useful life rules
insert into public.estimated_useful_life_rules (category, min_cost, max_cost, estimated_life, description) values
-- Equipment rules based on cost
('Equipment', 0, 5000, '3-5 years', 'Low-cost equipment'),
('Equipment', 5000, 50000, '5-7 years', 'Medium-cost equipment'),
('Equipment', 50000, 999999999, '7-10 years', 'High-cost equipment'),

-- Furniture rules
('Furniture', 0, 10000, '10-15 years', 'Standard furniture'),
('Furniture', 10000, 999999999, '15-20 years', 'High-quality furniture'),

-- Semi-Expandable rules based on type and cost
('Semi-Expandable', 0, 1000, '1-3 years', 'Low-cost semi-expandable'),
('Semi-Expandable', 1000, 10000, '3-5 years', 'Medium-cost semi-expandable'),
('Semi-Expandable', 10000, 999999999, '5-7 years', 'High-cost semi-expandable'),

-- Specific item type rules (can be added based on description patterns)
('Equipment', 0, 999999999, '3-5 years', 'Computer/IT Equipment')
where 'computer' = any(string_to_array(lower(description), ' '))
   or 'laptop' = any(string_to_array(lower(description), ' '))
   or 'printer' = any(string_to_array(lower(description), ' '));

-- Function to calculate estimated useful life based on multiple factors
create or replace function public.calculate_estimated_useful_life(
  item_category text,
  item_cost decimal(15,2) default 0,
  item_description text default ''
)
returns text as $$
declare
  calculated_life text;
  rule_record record;
begin
  -- First, try to find a specific rule based on description keywords
  if item_description is not null and item_description != '' then
    -- Check for specific item types
    if lower(item_description) ~ '(computer|laptop|desktop|pc)' then
      return '3-5 years';
    elsif lower(item_description) ~ '(vehicle|car|truck)' then
      return '5-10 years';
    elsif lower(item_description) ~ '(printer|scanner|copier)' then
      return '3-5 years';
    elsif lower(item_description) ~ '(furniture|chair|table|desk)' then
      return '10-15 years';
    elsif lower(item_description) ~ '(building|structure)' then
      return '20-50 years';
    end if;
  end if;
  
  -- Find matching rule based on category and cost
  select estimated_life into calculated_life
  from public.estimated_useful_life_rules
  where category = item_category
    and item_cost >= min_cost
    and item_cost <= max_cost
  order by min_cost desc -- Get the most specific (highest minimum) rule
  limit 1;
  
  -- Return calculated life or default
  return coalesce(calculated_life, 
    case 
      when item_category = 'Equipment' then '5-7 years'
      when item_category = 'Furniture' then '10-15 years'
      when item_category = 'Semi-Expandable' then '3-5 years'
      else '5 years'
    end
  );
end;
$$ language plpgsql;

-- Update the custodian slip item trigger to use the improved calculation
create or replace function public.set_custodian_slip_item_details()
returns trigger as $$
declare
  inventory_record record;
  next_item_number integer;
begin
  -- Get inventory item details for cost calculation
  select unit_cost, total_cost, quantity, category, description
  into inventory_record
  from public.inventory_items
  where id = NEW.inventory_item_id;
  
  if found then
    -- Set costs from inventory item
    NEW.unit_cost = inventory_record.unit_cost;
    NEW.total_cost = NEW.quantity * inventory_record.unit_cost;
    NEW.amount = NEW.total_cost; -- Amount is same as total cost for Annex compliance
    
    -- Calculate estimated useful life using improved logic
    NEW.estimated_useful_life = public.calculate_estimated_useful_life(
      inventory_record.category,
      inventory_record.unit_cost,
      inventory_record.description
    );
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

-- Update existing records with improved useful life calculation
update public.custodian_slip_items csi
set estimated_useful_life = public.calculate_estimated_useful_life(
  ii.category,
  ii.unit_cost,
  ii.description
)
from public.inventory_items ii
where csi.inventory_item_id = ii.id;

-- Grant necessary permissions
grant select on public.estimated_useful_life_rules to anon, authenticated;
grant execute on function public.calculate_estimated_useful_life(text, decimal, text) to anon, authenticated;

-- Add helpful comments
comment on table public.estimated_useful_life_rules is 'Rules for calculating estimated useful life based on category, cost, and description';
comment on function public.calculate_estimated_useful_life(text, decimal, text) is 'Calculates estimated useful life based on category, cost, and description patterns';

-- Show some examples
select 
  category,
  min_cost,
  max_cost,
  estimated_life,
  description
from public.estimated_useful_life_rules
order by category, min_cost;
