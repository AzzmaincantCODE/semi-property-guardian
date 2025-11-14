-- Reset Non-Lookup Data
-- ------------------------------------------------------------
-- This script removes transaction data (inventory, property cards,
-- custodian slips, etc.) while keeping lookup tables such as
-- suppliers, fund sources, departments, custodians, and categories.
--
-- ⚠️ WARNING:
-- * This is destructive. Run only if you are sure you want a clean slate.
-- * Always export a backup before executing.
-- * Execute in the Supabase SQL editor or psql console connected to your project.
--
-- The script deliberately avoids TRUNCATE ... CASCADE so that lookup
-- tables remain intact and only the targeted tables are cleared.

begin;

-- -----------------------------------------------------------------
-- 1. Show current totals (optional sanity check)
select 'BEFORE RESET' as stage;
select count(*) as inventory_items from public.inventory_items;
select count(*) as property_cards from public.property_cards;
select count(*) as property_card_entries from public.property_card_entries;
select count(*) as custodian_slips from public.custodian_slips;
select count(*) as custodian_slip_items from public.custodian_slip_items;

-- -----------------------------------------------------------------
-- 2. Detach foreign-key references so deletes succeed cleanly
update public.custodian_slip_items
set property_card_entry_id = null
where property_card_entry_id is not null;

-- If any property card entries still point at slips, clear the links
update public.property_card_entries
set related_slip_id = null,
    related_transfer_id = null
where related_slip_id is not null
   or related_transfer_id is not null;

-- -----------------------------------------------------------------
-- 3. Delete transactional data in dependency order
delete from public.property_card_entries;
delete from public.custodian_slip_items;
delete from public.custodian_slips;
delete from public.property_cards;
delete from public.inventory_items;

-- -----------------------------------------------------------------
-- 4. Confirm the tables are empty
select 'AFTER RESET' as stage;
select count(*) as inventory_items from public.inventory_items;
select count(*) as property_cards from public.property_cards;
select count(*) as property_card_entries from public.property_card_entries;
select count(*) as custodian_slips from public.custodian_slips;
select count(*) as custodian_slip_items from public.custodian_slip_items;

commit;

-- The system now has no inventory, property cards, or custodian slips.
-- Lookup tables (suppliers, fund_sources, departments, custodians,
-- semi_expandable_categories, etc.) remain untouched.

