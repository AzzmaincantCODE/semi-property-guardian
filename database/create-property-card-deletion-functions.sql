-- ============================================================================
-- CREATE PROPERTY CARD DELETION FUNCTIONS
-- ============================================================================
-- This script creates the functions needed for safe property card deletion
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Function to check if a property card can be deleted
CREATE OR REPLACE FUNCTION public.can_delete_property_card(card_id uuid)
RETURNS boolean AS $$
DECLARE
  has_custodian_references boolean;
  has_transfer_references boolean;
BEGIN
  -- Check if any custodian slip items reference this property card's entries
  SELECT EXISTS(
    SELECT 1 
    FROM public.custodian_slip_items csi
    JOIN public.property_card_entries pce ON csi.property_card_entry_id = pce.id
    WHERE pce.property_card_id = card_id
  ) INTO has_custodian_references;
  
  -- Check if any transfer items reference this property card
  SELECT EXISTS(
    SELECT 1 
    FROM public.transfer_items ti
    WHERE ti.property_card_id = card_id
  ) INTO has_transfer_references;
  
  -- Can delete if no custodian slip or transfer references exist
  RETURN NOT (has_custodian_references OR has_transfer_references);
END;
$$ LANGUAGE plpgsql;

-- Function to safely delete a property card
CREATE OR REPLACE FUNCTION public.safe_delete_property_card(card_id uuid)
RETURNS boolean AS $$
DECLARE
  can_delete boolean;
BEGIN
  -- Check if property card can be deleted
  SELECT public.can_delete_property_card(card_id) INTO can_delete;
  
  IF NOT can_delete THEN
    RAISE EXCEPTION 'Cannot delete property card % - it has custodian slip or transfer references', card_id;
  END IF;
  
  -- Set property_card_entry_id to NULL in custodian_slip_items (if any)
  UPDATE public.custodian_slip_items 
  SET property_card_entry_id = NULL
  WHERE property_card_entry_id IN (
    SELECT id FROM public.property_card_entries 
    WHERE property_card_id = card_id
  );
  
  -- Delete the property card (entries will cascade automatically due to ON DELETE CASCADE)
  DELETE FROM public.property_cards WHERE id = card_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.can_delete_property_card(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.safe_delete_property_card(uuid) TO authenticated;

-- Verify functions were created
SELECT 
  'Functions created successfully' as status,
  proname as function_name
FROM pg_proc 
WHERE proname IN ('can_delete_property_card', 'safe_delete_property_card')
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

