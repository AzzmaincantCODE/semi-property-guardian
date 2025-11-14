-- Force cleanup of all property cards and related data
-- Run this in Supabase SQL Editor

-- Step 1: Check what property cards exist and their relationships
SELECT 
  'CURRENT STATE' as status,
  pc.id,
  pc.property_number,
  pc.entity_name,
  pc.fund_cluster,
  pc.inventory_item_id,
  pc.created_at
FROM public.property_cards pc
ORDER BY pc.created_at DESC;

-- Step 2: Check if there are any property card entries
SELECT 
  'PROPERTY CARD ENTRIES' as status,
  COUNT(*) as total_entries
FROM public.property_card_entries;

-- Step 3: Check if there are any custodian slip items
SELECT 
  'CUSTODIAN SLIP ITEMS' as status,
  COUNT(*) as total_slip_items
FROM public.custodian_slip_items;

-- Step 4: Temporarily disable foreign key constraints and delete everything
-- First, delete property card entries
DELETE FROM public.property_card_entries;

-- Second, delete custodian slip items
DELETE FROM public.custodian_slip_items;

-- Third, delete custodian slips
DELETE FROM public.custodian_slips;

-- Fourth, delete property cards
DELETE FROM public.property_cards;

-- Step 5: Verify everything is cleaned up
SELECT 
  'AFTER FORCE CLEANUP' as status,
  (SELECT COUNT(*) FROM public.property_cards) as property_cards_count,
  (SELECT COUNT(*) FROM public.property_card_entries) as property_card_entries_count,
  (SELECT COUNT(*) FROM public.custodian_slips) as custodian_slips_count,
  (SELECT COUNT(*) FROM public.custodian_slip_items) as custodian_slip_items_count,
  (SELECT COUNT(*) FROM public.inventory_items) as inventory_items_count;

-- Step 6: Show final status
SELECT 'Force cleanup completed - all property cards and related data deleted' as result;
