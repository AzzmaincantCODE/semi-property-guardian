-- Safe Property Card Deletion Policy
-- This script creates a safe deletion function for property cards that handles foreign key relationships

-- Step 1: Check if property card can be safely deleted
CREATE OR REPLACE FUNCTION public.can_delete_property_card(card_id uuid)
RETURNS boolean AS $$
DECLARE
  has_custodian_references boolean;
BEGIN
  -- Check if any custodian slip items reference this property card's entries
  SELECT EXISTS(
    SELECT 1 
    FROM public.custodian_slip_items csi
    JOIN public.property_card_entries pce ON csi.property_card_entry_id = pce.id
    WHERE pce.property_card_id = card_id
  ) INTO has_custodian_references;
  
  -- Can delete if no custodian slip references exist
  RETURN NOT has_custodian_references;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Safe delete function for property cards
CREATE OR REPLACE FUNCTION public.safe_delete_property_card(card_id uuid)
RETURNS boolean AS $$
DECLARE
  can_delete boolean;
  entry_record record;
BEGIN
  -- Check if property card can be deleted
  SELECT public.can_delete_property_card(card_id) INTO can_delete;
  
  IF NOT can_delete THEN
    RAISE EXCEPTION 'Cannot delete property card % - it has custodian slip references', card_id;
  END IF;
  
  -- Step 1: Set property_card_entry_id to NULL in custodian_slip_items
  -- This preserves the slip item but removes the property card reference
  UPDATE public.custodian_slip_items 
  SET property_card_entry_id = NULL
  WHERE property_card_entry_id IN (
    SELECT id FROM public.property_card_entries 
    WHERE property_card_id = card_id
  );
  
  -- Step 2: Delete the property card (entries will cascade automatically)
  DELETE FROM public.property_cards WHERE id = card_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger to prevent direct deletion (optional - for protection)
CREATE OR REPLACE FUNCTION public.prevent_property_card_deletion()
RETURNS trigger AS $$
BEGIN
  -- Only prevent deletion if there are custodian slip references
  IF NOT public.can_delete_property_card(OLD.id) THEN
    RAISE EXCEPTION 'Cannot delete property card % - it has custodian slip references. Use safe_delete_property_card function instead.', OLD.id;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create the trigger (comment out if you want to allow direct deletion)
-- CREATE TRIGGER trg_prevent_property_card_deletion
--   BEFORE DELETE ON public.property_cards
--   FOR EACH ROW
--   EXECUTE FUNCTION public.prevent_property_card_deletion();

-- Step 5: Create RLS policy for safe deletion
CREATE POLICY "Allow safe property card deletion" ON public.property_cards
FOR DELETE
USING (true); -- Allow deletion through RPC function

-- Step 6: Create view for deletable property cards
CREATE OR REPLACE VIEW public.deletable_property_cards AS
SELECT pc.*
FROM public.property_cards pc
WHERE public.can_delete_property_card(pc.id);

-- Step 7: Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.safe_delete_property_card(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_delete_property_card(uuid) TO authenticated;
GRANT SELECT ON public.deletable_property_cards TO authenticated;

-- Step 8: Test the function (optional)
-- SELECT public.can_delete_property_card('your-test-card-id-here');
-- SELECT public.safe_delete_property_card('your-test-card-id-here');
