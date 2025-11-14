-- Reset inventory items assignment status to make them available for custodian slips
-- Run this in Supabase SQL Editor

-- Reset all inventory items to Available status (except those specifically marked as damaged/missing)
update public.inventory_items
set 
  custodian = null,
  custodian_position = null,
  assignment_status = 'Available',
  assigned_date = null,
  updated_at = now()
where 
  -- Only reset items that are in good condition
  condition = 'Serviceable' 
  and status = 'Active'
  -- Don't reset items that are genuinely damaged/missing/lost
  and assignment_status not in ('Damaged', 'Missing', 'Lost', 'Stolen', 'Disposed');

-- Show the updated count
select 
  assignment_status, 
  count(*) as count
from public.inventory_items 
group by assignment_status 
order by assignment_status;

-- Verify available items
select 
  property_number,
  description,
  condition,
  status,
  assignment_status,
  custodian
from public.inventory_items
where condition = 'Serviceable' 
  and status = 'Active'
  and assignment_status = 'Available'
limit 10;
