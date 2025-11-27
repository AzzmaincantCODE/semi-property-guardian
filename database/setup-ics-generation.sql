-- Quick setup for ICS number generation
-- Run this FIRST before trying to create custodian slips

-- Drop legacy versions first so we can recreate cleanly
DROP FUNCTION IF EXISTS public.generate_ics_number();
DROP FUNCTION IF EXISTS public.generate_ics_number(TEXT);

-- Create function to generate proper ICS numbers (PREFIX-YYYY-MM-NNNN)
CREATE OR REPLACE FUNCTION public.generate_ics_number(sub_category_prefix TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  current_month TEXT;
  base_prefix TEXT;
  year_month_prefix TEXT;
  next_sequence INTEGER;
  formatted_sequence TEXT;
  generated_number TEXT;
BEGIN
  -- Determine prefix (default to ICS when not provided)
  base_prefix := COALESCE(NULLIF(sub_category_prefix, ''), 'ICS');

  -- Get current year and month
  current_year := EXTRACT(YEAR FROM NOW())::TEXT;
  current_month := LPAD(EXTRACT(MONTH FROM NOW())::TEXT, 2, '0');
  year_month_prefix := base_prefix || '-' || current_year || '-' || current_month || '-';
  
  -- Find the highest sequence number for this year-month combination
  SELECT COALESCE(MAX(
    CASE 
      WHEN slip_number ~ ('^' || year_month_prefix || '[0-9]{4}$')
      THEN (REGEXP_REPLACE(slip_number, '^' || year_month_prefix, ''))::INTEGER
      ELSE 0
    END
  ), 0) + 1
  INTO next_sequence
  FROM public.custodian_slips
  WHERE slip_number LIKE (year_month_prefix || '%');
  
  -- Format sequence as 4-digit number
  formatted_sequence := LPAD(next_sequence::TEXT, 4, '0');
  
  -- Generate final ICS number
  generated_number := year_month_prefix || formatted_sequence;
  
  RETURN generated_number;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate ICS numbers
CREATE OR REPLACE FUNCTION public.set_ics_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set slip_number if it's null or empty
  IF NEW.slip_number IS NULL OR NEW.slip_number = '' THEN
    NEW.slip_number := public.generate_ics_number();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_set_ics_number ON public.custodian_slips;

-- Create trigger to auto-generate ICS numbers
CREATE TRIGGER trg_set_ics_number
  BEFORE INSERT ON public.custodian_slips
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ics_number();

-- Test the function
SELECT 'ICS number generation setup complete!' as status;
SELECT public.generate_ics_number('SPHV') as sample_high_value_ics_number;
SELECT public.generate_ics_number('SPLV') as sample_low_value_ics_number;
