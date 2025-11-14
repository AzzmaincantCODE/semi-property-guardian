-- Fix Custodians Dependencies
-- Run this if you're getting foreign key errors

-- Create departments table if it doesn't exist
create table if not exists public.departments (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  code text unique,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS for departments if not already enabled
alter table public.departments enable row level security;

-- Create policies for departments table (if they don't exist)
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'departments' and policyname = 'department_select_all') then
    create policy department_select_all on public.departments for select using (true);
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'departments' and policyname = 'department_insert_all') then
    create policy department_insert_all on public.departments for insert with check (true);
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'departments' and policyname = 'department_update_all') then
    create policy department_update_all on public.departments for update using (true) with check (true);
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'departments' and policyname = 'department_delete_all') then
    create policy department_delete_all on public.departments for delete using (true);
  end if;
end $$;

-- Insert some basic departments if they don't exist
insert into public.departments (name, code) values
  ('Information Technology', 'IT'),
  ('Finance', 'FIN'),
  ('Operations', 'OPS'),
  ('Administration', 'ADMIN'),
  ('Maintenance', 'MAINT')
on conflict (code) do nothing;

-- Update existing custodians to have a default department if they don't have one
update public.custodians 
set department_id = (select id from public.departments where code = 'ADMIN' limit 1)
where department_id is null;

-- Verify the setup
select 
  c.id, 
  c.custodian_no, 
  c.name, 
  c.position,
  d.name as department_name,
  c.is_active, 
  c.created_at 
from public.custodians c
left join public.departments d on c.department_id = d.id
order by c.custodian_no;
