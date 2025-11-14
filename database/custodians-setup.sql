-- Custodians Table Setup
-- Run this in Supabase SQL Editor when connection is restored

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- Create departments table first (if it doesn't exist)
create table if not exists public.departments (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  code text unique,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create custodians table
create table if not exists public.custodians (
  id uuid primary key default uuid_generate_v4(),
  custodian_no text unique,
  name text not null,
  position text,
  department_id uuid references public.departments(id),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Function to generate custodian numbers (CUST-000001, CUST-000002, etc.)
create or replace function public.generate_custodian_no() returns trigger as $$
declare
  next_num int;
begin
  -- If custodian_no is already provided, use it
  if new.custodian_no is not null then
    return new;
  end if;

  -- Extract numeric suffix from existing custodian numbers and compute next
  select coalesce(max((regexp_replace(custodian_no, '^CUST-', ''))::int), 0) + 1
  into next_num
  from public.custodians
  where custodian_no ~ '^CUST-\\d+$';

  -- Format as CUST-000001, CUST-000002, etc.
  new.custodian_no := 'CUST-' || lpad(next_num::text, 6, '0');
  return new;
end;
$$ language plpgsql;

-- Create trigger to auto-generate custodian numbers
drop trigger if exists trg_generate_custodian_no on public.custodians;
create trigger trg_generate_custodian_no
before insert on public.custodians
for each row execute function public.generate_custodian_no();

-- Enable Row Level Security
alter table public.departments enable row level security;
alter table public.custodians enable row level security;

-- Create policies for departments table
drop policy if exists department_select_all on public.departments;
drop policy if exists department_insert_all on public.departments;
drop policy if exists department_update_all on public.departments;
drop policy if exists department_delete_all on public.departments;

create policy department_select_all on public.departments for select using (true);
create policy department_insert_all on public.departments for insert with check (true);
create policy department_update_all on public.departments for update using (true) with check (true);
create policy department_delete_all on public.departments for delete using (true);

-- Create policies for custodians table
drop policy if exists custodian_select_all on public.custodians;
drop policy if exists custodian_insert_all on public.custodians;
drop policy if exists custodian_update_all on public.custodians;
drop policy if exists custodian_delete_all on public.custodians;

create policy custodian_select_all on public.custodians for select using (true);
create policy custodian_insert_all on public.custodians for insert with check (true);
create policy custodian_update_all on public.custodians for update using (true) with check (true);
create policy custodian_delete_all on public.custodians for delete using (true);

-- Insert some sample departments first
insert into public.departments (name, code) values
  ('Information Technology', 'IT'),
  ('Finance', 'FIN'),
  ('Operations', 'OPS'),
  ('Administration', 'ADMIN'),
  ('Maintenance', 'MAINT')
on conflict (code) do nothing;

-- Insert some sample custodians for testing (only if they don't exist)
insert into public.custodians (name, position, department_id) 
select 
  c.name, 
  c.position, 
  d.id
from (values
  ('John Smith', 'IT Manager'),
  ('Jane Doe', 'Finance Officer'),
  ('Mike Johnson', 'Operations Supervisor'),
  ('Sarah Wilson', 'Administrative Assistant'),
  ('David Brown', 'Maintenance Lead')
) as c(name, position)
join public.departments d on 
  (c.name = 'John Smith' and d.code = 'IT') or
  (c.name = 'Jane Doe' and d.code = 'FIN') or
  (c.name = 'Mike Johnson' and d.code = 'OPS') or
  (c.name = 'Sarah Wilson' and d.code = 'ADMIN') or
  (c.name = 'David Brown' and d.code = 'MAINT')
where not exists (
  select 1 from public.custodians existing 
  where existing.name = c.name
);

-- Verify the setup
select id, custodian_no, name, position, is_active, created_at 
from public.custodians 
order by custodian_no;
