-- Item Availability Logic - Prevent damaged/missing/assigned items from being reassigned
-- Run this in Supabase SQL Editor

-- Update the assignment_status check constraint to be more comprehensive
alter table public.inventory_items 
drop constraint if exists inventory_items_assignment_status_check;

alter table public.inventory_items 
add constraint inventory_items_assignment_status_check 
check (assignment_status in ('Available', 'Assigned', 'In-Transit', 'Disposed', 'Damaged', 'Missing', 'Lost', 'Stolen'));

-- Create a function to determine if an item is available for assignment
create or replace function public.is_item_available_for_assignment(item_id uuid)
returns boolean as $$
declare
  item_record record;
begin
  -- Get the inventory item details
  select * into item_record 
  from public.inventory_items 
  where id = item_id;
  
  -- Item doesn't exist
  if not found then
    return false;
  end if;
  
  -- Check if item is in a condition that prevents assignment
  if item_record.condition in ('Unserviceable', 'Lost', 'Stolen', 'Damaged', 'Destroyed') then
    return false;
  end if;
  
  -- Check if item is already assigned or disposed
  if item_record.assignment_status in ('Assigned', 'In-Transit', 'Disposed', 'Damaged', 'Missing', 'Lost', 'Stolen') then
    return false;
  end if;
  
  -- Check if item already has a custodian assigned
  if item_record.custodian is not null and item_record.custodian != '' then
    return false;
  end if;
  
  -- Item is available
  return true;
end;
$$ language plpgsql;

-- Create a view for available items only
create or replace view public.available_inventory_items as
select *
from public.inventory_items
where public.is_item_available_for_assignment(id) = true
order by created_at desc;

-- Update the custodian slip item creation function to validate availability
create or replace function public.validate_item_availability_before_assignment()
returns trigger as $$
begin
  -- Check if the item is available for assignment
  if not public.is_item_available_for_assignment(NEW.inventory_item_id) then
    raise exception 'Item % is not available for assignment. It may be damaged, missing, or already assigned to another custodian.', NEW.inventory_item_id;
  end if;
  
  return NEW;
end;
$$ language plpgsql;

-- Create trigger to validate item availability before creating custodian slip items
drop trigger if exists trg_validate_item_availability on public.custodian_slip_items;
create trigger trg_validate_item_availability
  before insert on public.custodian_slip_items
  for each row
  execute function public.validate_item_availability_before_assignment();

-- Update the inventory assignment status function to handle different conditions
create or replace function public.update_inventory_assignment_status()
returns trigger as $$
declare
  slip_record record;
begin
  -- Get the custodian slip details
  select * into slip_record from public.custodian_slips where id = NEW.slip_id;
  
  -- Validate that the item is available before assignment
  if not public.is_item_available_for_assignment(NEW.inventory_item_id) then
    raise exception 'Cannot assign item % - it is not available (may be damaged, missing, or already assigned)', NEW.inventory_item_id;
  end if;
  
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

-- Create a function to handle item condition changes
create or replace function public.update_assignment_status_on_condition_change()
returns trigger as $$
begin
  -- If item condition becomes unserviceable, update assignment status
  if NEW.condition in ('Unserviceable', 'Lost', 'Stolen', 'Damaged', 'Destroyed') and 
     OLD.condition not in ('Unserviceable', 'Lost', 'Stolen', 'Damaged', 'Destroyed') then
    
    -- Update assignment status to match condition
    NEW.assignment_status = case 
      when NEW.condition = 'Lost' then 'Lost'
      when NEW.condition = 'Stolen' then 'Stolen' 
      when NEW.condition = 'Damaged' then 'Damaged'
      when NEW.condition = 'Destroyed' then 'Disposed'
      else 'Damaged'
    end;
    
    -- Clear custodian if item becomes unavailable
    NEW.custodian = null;
    NEW.custodian_position = null;
    NEW.assigned_date = null;
  end if;
  
  -- If item condition becomes serviceable and was previously damaged, make it available
  if NEW.condition = 'Serviceable' and OLD.condition in ('Unserviceable', 'Damaged') and
     NEW.assignment_status in ('Damaged', 'Missing') then
    NEW.assignment_status = 'Available';
  end if;
  
  return NEW;
end;
$$ language plpgsql;

-- Create trigger to automatically update assignment status when condition changes
drop trigger if exists trg_update_assignment_on_condition_change on public.inventory_items;
create trigger trg_update_assignment_on_condition_change
  before update on public.inventory_items
  for each row
  execute function public.update_assignment_status_on_condition_change();

-- Add helpful comments
comment on function public.is_item_available_for_assignment(uuid) is 'Determines if an inventory item is available for assignment to a custodian';
comment on view public.available_inventory_items is 'View showing only inventory items that are available for assignment';
comment on function public.validate_item_availability_before_assignment() is 'Validates that an item is available before creating a custodian slip item';
comment on function public.update_assignment_status_on_condition_change() is 'Automatically updates assignment status when item condition changes';

-- Grant necessary permissions
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant all on all functions in schema public to anon, authenticated;
grant select on public.available_inventory_items to anon, authenticated;
