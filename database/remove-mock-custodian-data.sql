-- Remove Mock Data from Custodian Slips
-- Run this in Supabase SQL Editor to clean up sample data

-- Remove sample custodian slip items first (due to foreign key constraints)
delete from public.custodian_slip_items 
where slip_id in (
  select id from public.custodian_slips 
  where slip_number in ('CS-2024-001', 'CS-2024-002', 'CS-2024-003')
);

-- Remove sample custodian slips
delete from public.custodian_slips 
where slip_number in ('CS-2024-001', 'CS-2024-002', 'CS-2024-003');

-- Verify cleanup
select 
  count(*) as remaining_slips,
  array_agg(slip_number) as slip_numbers
from public.custodian_slips;

-- Show any remaining custodian slip items
select 
  count(*) as remaining_items,
  array_agg(distinct property_number) as property_numbers
from public.custodian_slip_items;
