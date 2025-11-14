-- Unified ICS Number Generation System
-- Run this in Supabase SQL Editor to implement proper ICS number generation

-- Create function to generate proper ICS numbers (ICS-YYYY-MM-NNNN)
create or replace function public.generate_ics_number()
returns text as $$
declare
  current_year text;
  current_month text;
  year_month_prefix text;
  next_sequence integer;
  formatted_sequence text;
  generated_number text;
begin
  -- Get current year and month
  current_year := extract(year from now())::text;
  current_month := lpad(extract(month from now())::text, 2, '0');
  year_month_prefix := 'ICS-' || current_year || '-' || current_month || '-';
  
  -- Find the highest sequence number for this year-month combination
  select coalesce(max(
    case 
      when slip_number ~ ('^' || year_month_prefix || '[0-9]{4}$')
      then (regexp_replace(slip_number, '^' || year_month_prefix, ''))::integer
      else 0
    end
  ), 0) + 1
  into next_sequence
  from public.custodian_slips
  where slip_number like (year_month_prefix || '%');
  
  -- Format sequence as 4-digit number
  formatted_sequence := lpad(next_sequence::text, 4, '0');
  
  -- Generate final ICS number
  generated_number := year_month_prefix || formatted_sequence;
  
  return generated_number;
end;
$$ language plpgsql;

-- Create trigger to auto-generate ICS numbers
create or replace function public.set_ics_number()
returns trigger as $$
begin
  -- Only set slip_number if it's null or empty
  if NEW.slip_number is null or NEW.slip_number = '' then
    NEW.slip_number := public.generate_ics_number();
  end if;
  
  return NEW;
end;
$$ language plpgsql;

-- Drop existing trigger if it exists
drop trigger if exists trg_set_ics_number on public.custodian_slips;

-- Create trigger to auto-generate ICS numbers
create trigger trg_set_ics_number
  before insert on public.custodian_slips
  for each row
  execute function public.set_ics_number();

-- Add comment explaining the function
comment on function public.generate_ics_number() is 'Generates ICS numbers in format ICS-YYYY-MM-NNNN (e.g., ICS-2025-01-0001)';
comment on function public.set_ics_number() is 'Trigger function to auto-generate ICS numbers when creating custodian slips';

-- Test the function
select public.generate_ics_number() as sample_ics_number;
