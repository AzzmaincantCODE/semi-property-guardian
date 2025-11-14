-- Fix items immediately getting assigned issue
-- Run this in Supabase SQL Editor

-- Reset all items to Available status (except genuinely assigned ones)
update public.inventory_items
set 
  assignment_status = 'Available',
  updated_at = now()
where 
  condition = 'Serviceable' 
  and status = 'Active'
  and (custodian is null or custodian = '')
  and assignment_status != 'Available';

-- Create or replace function to properly handle assignment status on insert/update
create or replace function public.set_assignment_status_on_change()
returns trigger as $$
begin
  -- If custodian is being set (not null and not empty)
  if NEW.custodian is not null and NEW.custodian != '' then
    -- Only set to assigned if item is available for assignment
    if NEW.condition = 'Serviceable' and NEW.status = 'Active' then
      NEW.assignment_status = 'Assigned';
      if NEW.assigned_date is null then
        NEW.assigned_date = current_date;
      end if;
    else
      -- Item is not in good condition, don't allow assignment
      NEW.custodian = null;
      NEW.custodian_position = null;
      NEW.assigned_date = null;
      NEW.assignment_status = case 
        when NEW.condition in ('Lost', 'Stolen') then NEW.condition
        when NEW.condition in ('Damaged', 'Destroyed', 'Unserviceable') then 'Damaged'
        when NEW.status in ('Disposed', 'Missing') then NEW.status
        else 'Available'
      end;
    end if;
  else
    -- Custodian is being cleared
    NEW.assignment_status = case 
      when NEW.condition = 'Serviceable' and NEW.status = 'Active' then 'Available'
      when NEW.condition in ('Lost', 'Stolen') then NEW.condition
      when NEW.condition in ('Damaged', 'Destroyed', 'Unserviceable') then 'Damaged'
      when NEW.status in ('Disposed', 'Missing') then NEW.status
      else 'Available'
    end;
    NEW.assigned_date = null;
  end if;
  
  return NEW;
end;
$$ language plpgsql;

-- Drop existing trigger if it exists
drop trigger if exists trg_set_assignment_status_on_change on public.inventory_items;

-- Create trigger to automatically manage assignment status
create trigger trg_set_assignment_status_on_change
  before insert or update on public.inventory_items
  for each row
  execute function public.set_assignment_status_on_change();

-- Verify the results
select 
  property_number,
  description,
  custodian,
  custodian_position,
  assignment_status,
  condition,
  status
from public.inventory_items
where condition = 'Serviceable' and status = 'Active'
order by created_at desc
limit 10;

-- Count items by assignment status
select 
  assignment_status, 
  count(*) as count
from public.inventory_items 
group by assignment_status 
order by assignment_status;
