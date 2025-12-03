-- Ensure Annex A.5 transfer printouts know the exact UI-selected transfer type
ALTER TABLE public.property_transfers
ADD COLUMN IF NOT EXISTS transfer_type_choice TEXT;

COMMENT ON COLUMN public.property_transfers.transfer_type_choice IS
  'Stores the UI-selected Annex transfer type (Donation/Reassignment/Relocate/Others) for printing.';

-- Provide a reasonable default for legacy rows
UPDATE public.property_transfers
SET transfer_type_choice = CASE
  WHEN transfer_type_choice IS NOT NULL THEN transfer_type_choice
  WHEN transfer_type ILIKE 'Temporary' THEN 'Relocate'
  WHEN transfer_type ILIKE 'Loan' THEN 'Others'
  WHEN transfer_type ILIKE 'Permanent' THEN 'Reassignment'
  ELSE transfer_type
END
WHERE transfer_type_choice IS NULL;