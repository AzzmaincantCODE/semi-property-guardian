-- Change ICS and Property Number Generation to Yearly Reset
-- Run this in Supabase SQL Editor to change from monthly to yearly numbering

-- ============================================
-- 1. Update ICS Number Generation (ICS-YYYY-NNNN)
-- ============================================

-- Create function to generate ICS numbers with yearly reset (ICS-YYYY-NNNN)
create or replace function public.generate_ics_number()
returns text as $$
declare
  current_year text;
  year_prefix text;
  next_sequence integer;
  formatted_sequence text;
  generated_number text;
begin
  -- Get current year
  current_year := extract(year from now())::text;
  year_prefix := 'ICS-' || current_year || '-';
  
  -- Find the highest sequence number for this year
  select coalesce(max(
    case 
      when slip_number ~ ('^' || year_prefix || '[0-9]{4}$')
      then (regexp_replace(slip_number, '^' || year_prefix, ''))::integer
      else 0
    end
  ), 0) + 1
  into next_sequence
  from public.custodian_slips
  where slip_number like (year_prefix || '%');
  
  -- Format sequence as 4-digit number
  formatted_sequence := lpad(next_sequence::text, 4, '0');
  
  -- Generate final ICS number
  generated_number := year_prefix || formatted_sequence;
  
  return generated_number;
end;
$$ language plpgsql;

-- Update comment
comment on function public.generate_ics_number() is 'Generates ICS numbers in format ICS-YYYY-NNNN with yearly reset (e.g., ICS-2025-0001)';

-- ============================================
-- 2. Test the updated function
-- ============================================
select public.generate_ics_number() as sample_ics_number;

-- ============================================
-- Note: Property numbers are generated in the application code
-- The format has been changed from SPLV-YYYY-MM-NNNN to SPLV-YYYY-NNNN
-- and from SPHV-YYYY-MM-NNNN to SPHV-YYYY-NNNN
-- ============================================

