-- Ensure inventory_items.unit_cost is capped for Semi-Expendable items
-- This enforces that unit_cost cannot be greater than 50,000.00
-- Run this script in Supabase after deployment.

DO $$
BEGIN
  -- Add a CHECK constraint only if it does not already exist
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conname = 'inventory_items_unit_cost_max_50000'
  ) THEN
    ALTER TABLE public.inventory_items
    ADD CONSTRAINT inventory_items_unit_cost_max_50000
    CHECK (unit_cost <= 50000.00);
  END IF;
END;
$$;


