-- Safe deletion script for transfers, inventory items, and property cards
-- Run inside the Supabase SQL editor.
-- This version skips tables/functions that do not exist so it works even if
-- your schema is missing some modules.

BEGIN;

SET LOCAL search_path = public;

-- Step 1: show current counts (printed as notices to avoid missing-table errors)
DO $count$
DECLARE
  tbl text;
  cnt bigint;
  tables CONSTANT text[] := ARRAY[
    'property_transfers',
    'transfer_items',
    'property_cards',
    'property_card_entries',
    'inventory_items'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      EXECUTE format('SELECT COUNT(*) FROM public.%I', tbl) INTO cnt;
      RAISE NOTICE '%: % rows', tbl, cnt;
    ELSE
      RAISE NOTICE '%: table not found, skipping count', tbl;
    END IF;
  END LOOP;
END
$count$;

-- Step 2: drop delete-prevention triggers only if their tables exist
DO $drop_triggers$
BEGIN
  IF to_regclass('public.inventory_items') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_prevent_inventory_deletion ON public.inventory_items;';
    EXECUTE 'DROP TRIGGER IF EXISTS trg_set_estimated_life ON public.inventory_items;';
  ELSE
    RAISE NOTICE 'inventory_items table missing; skipping inventory trigger drops.';
  END IF;

  IF to_regclass('public.custodian_slip_items') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_validate_and_assign_item ON public.custodian_slip_items;';
  ELSE
    RAISE NOTICE 'custodian_slip_items table missing; skipping trigger drop.';
  END IF;

  IF to_regclass('public.custodian_slips') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_prevent_issued_slip_deletion ON public.custodian_slips;';
  ELSE
    RAISE NOTICE 'custodian_slips table missing; skipping trigger drop.';
  END IF;
END
$drop_triggers$;

-- Step 3: detach optional references so deletions succeed
DO $detach$
DECLARE
  cols CONSTANT text[] := ARRAY[
    'related_slip_id',
    'related_transfer_id',
    'inventory_item_id',
    'custodian_slip_item_id'
  ];
  col_name text;
BEGIN
  IF to_regclass('public.property_card_entries') IS NOT NULL THEN
    FOREACH col_name IN ARRAY cols LOOP
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'property_card_entries'
          AND column_name = col_name
      ) THEN
        EXECUTE format(
          'UPDATE public.property_card_entries SET %I = NULL WHERE %I IS NOT NULL;',
          col_name, col_name
        );
      END IF;
    END LOOP;
  ELSE
    RAISE NOTICE 'property_card_entries table missing; skipping reference cleanup.';
  END IF;

  IF to_regclass('public.property_cards') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'property_cards'
         AND column_name = 'inventory_item_id'
     ) THEN
    EXECUTE 'UPDATE public.property_cards SET inventory_item_id = NULL WHERE inventory_item_id IS NOT NULL;';
  END IF;

  IF to_regclass('public.transfer_items') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'transfer_items'
         AND column_name = 'inventory_item_id'
     ) THEN
    EXECUTE 'UPDATE public.transfer_items SET inventory_item_id = NULL WHERE inventory_item_id IS NOT NULL;';
  END IF;
END
$detach$;

-- Step 4: delete data in dependency order (each step checks for table existence)
DO $deletes$
BEGIN
  IF to_regclass('public.transfer_items') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.transfer_items;';
  END IF;

  IF to_regclass('public.property_transfers') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.property_transfers;';
  END IF;

  IF to_regclass('public.property_card_entries') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.property_card_entries;';
  END IF;

  IF to_regclass('public.property_cards') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.property_cards;';
  END IF;

  IF to_regclass('public.custodian_slip_items') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.custodian_slip_items;';
  END IF;

  IF to_regclass('public.custodian_slips') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.custodian_slips;';
  END IF;

  IF to_regclass('public.inventory_items') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.inventory_items;';
  END IF;
END
$deletes$;

-- Step 5: show counts after cleanup (again via notices)
DO $after_counts$
DECLARE
  tbl text;
  cnt bigint;
  tables CONSTANT text[] := ARRAY[
    'property_transfers',
    'transfer_items',
    'property_cards',
    'property_card_entries',
    'inventory_items'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      EXECUTE format('SELECT COUNT(*) FROM public.%I', tbl) INTO cnt;
      RAISE NOTICE '% (after): % rows', tbl, cnt;
    ELSE
      RAISE NOTICE '% (after): table not found, skipping count', tbl;
    END IF;
  END LOOP;
END
$after_counts$;

COMMIT;

-- Step 6: recreate triggers only when both the table and backing function exist
DO $recreate_triggers$
BEGIN
  IF to_regclass('public.custodian_slip_items') IS NOT NULL
     AND to_regproc('public.validate_and_assign_item()') IS NOT NULL THEN
    EXECUTE '
      CREATE TRIGGER trg_validate_and_assign_item
        BEFORE INSERT ON public.custodian_slip_items
        FOR EACH ROW
        EXECUTE FUNCTION public.validate_and_assign_item();';
  ELSE
    RAISE NOTICE 'Skipping trg_validate_and_assign_item recreation (table or function missing).';
  END IF;

  IF to_regclass('public.custodian_slips') IS NOT NULL
     AND to_regproc('public.prevent_issued_slip_deletion()') IS NOT NULL THEN
    EXECUTE '
      CREATE TRIGGER trg_prevent_issued_slip_deletion
        BEFORE DELETE ON public.custodian_slips
        FOR EACH ROW
        EXECUTE FUNCTION public.prevent_issued_slip_deletion();';
  ELSE
    RAISE NOTICE 'Skipping trg_prevent_issued_slip_deletion recreation (table or function missing).';
  END IF;

  IF to_regclass('public.inventory_items') IS NOT NULL THEN
    IF to_regproc('public.trg_calculate_estimated_life()') IS NOT NULL THEN
      EXECUTE '
        CREATE TRIGGER trg_set_estimated_life
          BEFORE INSERT OR UPDATE ON public.inventory_items
          FOR EACH ROW
          EXECUTE FUNCTION public.trg_calculate_estimated_life();';
    ELSE
      RAISE NOTICE 'Skipping trg_set_estimated_life recreation (function missing).';
    END IF;

    IF to_regproc('public.prevent_inventory_item_deletion()') IS NOT NULL THEN
      EXECUTE '
        CREATE TRIGGER trg_prevent_inventory_deletion
          BEFORE DELETE ON public.inventory_items
          FOR EACH ROW
          EXECUTE FUNCTION public.prevent_inventory_item_deletion();';
    ELSE
      RAISE NOTICE 'Skipping trg_prevent_inventory_deletion recreation (function missing).';
    END IF;
  ELSE
    RAISE NOTICE 'inventory_items table missing; skipping inventory trigger recreation.';
  END IF;
END
$recreate_triggers$;

-- Final sanity check message
SELECT 'SAFE DELETE COMPLETE' AS status;

