-- Fix the property card entry creation trigger to only create entries for ISSUED slips
-- This prevents property card entries from being created for draft slips

-- Drop the existing trigger
DROP TRIGGER IF EXISTS trg_create_property_card_entry_for_slip ON public.custodian_slip_items;

-- Create a new function that checks slip status before creating property card entries
CREATE OR REPLACE FUNCTION public.create_property_card_entry_for_slip()
RETURNS TRIGGER AS $$
DECLARE
  property_card_id uuid;
  slip_record record;
BEGIN
  -- Get the custodian slip details
  SELECT * INTO slip_record FROM public.custodian_slips WHERE id = NEW.slip_id;
  
  -- ONLY create property card entries for ISSUED slips, not DRAFT slips
  IF slip_record.slip_status != 'Issued' THEN
    RETURN NEW; -- Exit early for draft slips
  END IF;
  
  -- Find property card for this inventory item (if it exists)
  SELECT id INTO property_card_id 
  FROM public.property_cards 
  WHERE inventory_item_id = NEW.inventory_item_id;
  
  -- Only create property card entries if a property card exists
  -- Items without property cards can still be assigned via custodian slips
  IF property_card_id IS NOT NULL THEN
    -- Create property card entry for this custodian slip item
    INSERT INTO public.property_card_entries (
      property_card_id,
      date,
      reference,
      receipt_qty,
      unit_cost,
      total_cost,
      issue_item_no,
      issue_qty,
      office_officer,
      balance_qty,
      amount,
      remarks,
      related_slip_id
    ) VALUES (
      property_card_id,
      slip_record.date_issued,
      slip_record.slip_number,
      0, -- This is an issue, not a receipt
      0,
      0,
      (SELECT property_number FROM public.inventory_items WHERE id = NEW.inventory_item_id),
      NEW.quantity,
      slip_record.custodian_name || ' (' || slip_record.designation || ')',
      0, -- Item is now with custodian
      0,
      'Issued via ICS ' || slip_record.slip_number,
      NEW.slip_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trg_create_property_card_entry_for_slip
  AFTER INSERT ON public.custodian_slip_items
  FOR EACH ROW
  EXECUTE FUNCTION public.create_property_card_entry_for_slip();

-- Also create a function to handle when slips are issued (status changes from Draft to Issued)
CREATE OR REPLACE FUNCTION public.create_property_card_entries_on_slip_issue()
RETURNS TRIGGER AS $$
DECLARE
  slip_item record;
  property_card_id uuid;
BEGIN
  -- Only process when status changes to 'Issued'
  IF NEW.slip_status = 'Issued' AND (OLD.slip_status IS NULL OR OLD.slip_status != 'Issued') THEN
    
    -- Get all slip items for this slip
    FOR slip_item IN 
      SELECT * FROM public.custodian_slip_items WHERE slip_id = NEW.id
    LOOP
      -- Find property card for this inventory item (if it exists)
      SELECT id INTO property_card_id 
      FROM public.property_cards 
      WHERE inventory_item_id = slip_item.inventory_item_id;
      
      -- Only create property card entry if property card exists
      -- Items without property cards can still be assigned via custodian slips
      IF property_card_id IS NOT NULL THEN
        INSERT INTO public.property_card_entries (
          property_card_id,
          date,
          reference,
          receipt_qty,
          unit_cost,
          total_cost,
          issue_item_no,
          issue_qty,
          office_officer,
          balance_qty,
          amount,
          remarks,
          related_slip_id
        ) VALUES (
          property_card_id,
          NEW.date_issued,
          NEW.slip_number,
          0, -- This is an issue, not a receipt
          0,
          0,
          (SELECT property_number FROM public.inventory_items WHERE id = slip_item.inventory_item_id),
          slip_item.quantity,
          NEW.custodian_name || ' (' || NEW.designation || ')',
          0, -- Item is now with custodian
          0,
          'Issued via ICS ' || NEW.slip_number,
          NEW.id
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for when slip status changes to Issued
DROP TRIGGER IF EXISTS trg_create_property_card_entries_on_slip_issue ON public.custodian_slips;
CREATE TRIGGER trg_create_property_card_entries_on_slip_issue
  AFTER UPDATE ON public.custodian_slips
  FOR EACH ROW
  EXECUTE FUNCTION public.create_property_card_entries_on_slip_issue();
