-- Update ICS Number Generation to include sub-category prefix
-- Format: ICS-YYYY-MM-SPREFIX-SEQUENCE (e.g., ICS-2025-01-SPHV-0001)
-- Run this in Supabase SQL Editor

-- Drop the old function
DROP FUNCTION IF EXISTS public.generate_ics_number();

-- Create new function that accepts sub-category prefix
CREATE OR REPLACE FUNCTION public.generate_ics_number(sub_category_prefix TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  current_month TEXT;
  month_prefix TEXT;
  next_sequence INTEGER;
  formatted_sequence TEXT;
  generated_number TEXT;
  prefix TEXT;
BEGIN
  -- Get current year and month
  current_year := EXTRACT(YEAR FROM NOW())::TEXT;
  current_month := LPAD(EXTRACT(MONTH FROM NOW())::TEXT, 2, '0');
  
  -- Determine prefix from sub-category
  -- sub_category_prefix should be 'SPLV' or 'SPHV', or NULL
  IF sub_category_prefix IS NULL OR sub_category_prefix = '' THEN
    -- Default to SPHV if not specified
    prefix := 'SPHV';
  ELSE
    prefix := UPPER(sub_category_prefix);
    -- Validate prefix
    IF prefix NOT IN ('SPLV', 'SPHV') THEN
      prefix := 'SPHV'; -- Default fallback
    END IF;
  END IF;
  
  -- Build month prefix: ICS-YYYY-MM-SPREFIX-
  month_prefix := 'ICS-' || current_year || '-' || current_month || '-' || prefix || '-';
  
  -- Find the highest sequence number for this year, month, and prefix
  SELECT COALESCE(MAX(
    CASE 
      WHEN slip_number ~ ('^' || month_prefix || '[0-9]{4}$')
      THEN (REGEXP_REPLACE(slip_number, '^' || month_prefix, ''))::INTEGER
      ELSE 0
    END
  ), 0) + 1
  INTO next_sequence
  FROM public.custodian_slips
  WHERE slip_number LIKE (month_prefix || '%');
  
  -- Format sequence as 4-digit number
  formatted_sequence := LPAD(next_sequence::TEXT, 4, '0');
  
  -- Generate final ICS number
  generated_number := month_prefix || formatted_sequence;
  
  RETURN generated_number;
END;
$$ LANGUAGE plpgsql;

-- Create a function that generates ICS number based on slip's items sub-category
CREATE OR REPLACE FUNCTION public.generate_ics_number_for_slip(slip_id UUID)
RETURNS TEXT AS $$
DECLARE
  sub_category_prefix TEXT;
  first_item_sub_category TEXT;
BEGIN
  -- Get the sub-category from the first item in the slip
  SELECT ii.sub_category INTO first_item_sub_category
  FROM public.custodian_slip_items csi
  JOIN public.inventory_items ii ON csi.inventory_item_id = ii.id
  WHERE csi.slip_id = generate_ics_number_for_slip.slip_id
  LIMIT 1;
  
  -- Map sub-category to prefix
  IF first_item_sub_category = 'Small Value Expendable' THEN
    sub_category_prefix := 'SPLV';
  ELSIF first_item_sub_category = 'High Value Expendable' THEN
    sub_category_prefix := 'SPHV';
  ELSE
    -- Default to SPHV if unknown
    sub_category_prefix := 'SPHV';
  END IF;
  
  -- Generate ICS number with the prefix
  RETURN public.generate_ics_number(sub_category_prefix);
END;
$$ LANGUAGE plpgsql;

-- Update the trigger function to use the new format
CREATE OR REPLACE FUNCTION public.set_ics_number()
RETURNS TRIGGER AS $$
DECLARE
  generated_number TEXT;
BEGIN
  -- Only generate if slip_number is empty
  IF NEW.slip_number IS NULL OR NEW.slip_number = '' THEN
    -- For new slips, we'll use a default prefix (SPHV)
    -- The actual prefix will be determined when items are added
    -- For now, generate with default and update later if needed
    generated_number := public.generate_ics_number('SPHV');
    NEW.slip_number := generated_number;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to update ICS number after items are added
CREATE OR REPLACE FUNCTION public.update_ics_number_from_items()
RETURNS TRIGGER AS $$
DECLARE
  slip_record RECORD;
  sub_category_prefix TEXT;
  new_ics_number TEXT;
BEGIN
  -- Get the slip
  SELECT * INTO slip_record FROM public.custodian_slips WHERE id = NEW.slip_id;
  
  -- Only update if slip is still in Draft status and has a default-generated number
  IF slip_record.slip_status = 'Draft' OR slip_record.slip_status IS NULL THEN
    -- Get sub-category from the item
    SELECT 
      CASE 
        WHEN ii.sub_category = 'Small Value Expendable' THEN 'SPLV'
        WHEN ii.sub_category = 'High Value Expendable' THEN 'SPHV'
        ELSE 'SPHV'
      END
    INTO sub_category_prefix
    FROM public.inventory_items ii
    WHERE ii.id = NEW.inventory_item_id;
    
    -- Generate new ICS number with correct prefix
    new_ics_number := public.generate_ics_number(sub_category_prefix);
    
    -- Update the slip number if it's still using the default format
    IF slip_record.slip_number LIKE 'ICS-%' AND NOT (slip_record.slip_number LIKE 'ICS-%-%-SP%') THEN
      UPDATE public.custodian_slips
      SET slip_number = new_ics_number
      WHERE id = NEW.slip_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update ICS number when items are added
DROP TRIGGER IF EXISTS trg_update_ics_number_from_items ON public.custodian_slip_items;
CREATE TRIGGER trg_update_ics_number_from_items
  AFTER INSERT ON public.custodian_slip_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ics_number_from_items();

-- Comment on functions
COMMENT ON FUNCTION public.generate_ics_number(TEXT) IS 'Generates ICS numbers in format ICS-YYYY-MM-SPREFIX-SEQUENCE (e.g., ICS-2025-01-SPHV-0001)';
COMMENT ON FUNCTION public.generate_ics_number_for_slip(UUID) IS 'Generates ICS number for a slip based on its items sub-category';
COMMENT ON FUNCTION public.update_ics_number_from_items() IS 'Updates ICS number when items are added to a slip, using the item sub-category prefix';

-- Test the function
SELECT public.generate_ics_number('SPHV') as sample_high_value;
SELECT public.generate_ics_number('SPLV') as sample_low_value;

