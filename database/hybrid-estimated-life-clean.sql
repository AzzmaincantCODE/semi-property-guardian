-- Hybrid Estimated Useful Life Setup for Supabase
-- Run this in the Supabase SQL Editor

-- Step 1: Add missing columns
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS estimated_useful_life DECIMAL(5,2);

ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS estimated_useful_life_override DECIMAL(5,2);

ALTER TABLE custodian_slip_items
ADD COLUMN IF NOT EXISTS estimated_useful_life DECIMAL(5,2);

ALTER TABLE custodian_slip_items
ADD COLUMN IF NOT EXISTS estimated_useful_life_override DECIMAL(5,2);

-- Step 2: Create the calculation function
CREATE OR REPLACE FUNCTION calculate_hybrid_estimated_life(
    p_description TEXT,
    p_cost DECIMAL(12,2),
    p_category TEXT DEFAULT NULL,
    p_manual_override DECIMAL(5,2) DEFAULT NULL
) RETURNS TABLE(
    years DECIMAL(5,2),
    months INTEGER,
    method TEXT,
    confidence TEXT,
    reasoning TEXT
) AS $$
DECLARE
    v_years DECIMAL(5,2);
    v_months INTEGER;
    v_method TEXT;
    v_confidence TEXT;
    v_reasoning TEXT;
BEGIN
    -- If manual override is provided, use it
    IF p_manual_override IS NOT NULL AND p_manual_override > 0 THEN
        v_years := p_manual_override;
        v_months := ROUND(p_manual_override * 12);
        v_method := 'manual';
        v_confidence := 'high';
        v_reasoning := 'Manual override provided by user';
        
        RETURN QUERY SELECT v_years, v_months, v_method, v_confidence, v_reasoning;
        RETURN;
    END IF;
    
    -- Intelligent analysis based on description
    v_years := 5; -- Default
    v_confidence := 'low';
    v_reasoning := 'Default estimate';
    
    -- Analyze description for intelligent estimates
    IF LOWER(p_description) LIKE '%server%' OR LOWER(p_description) LIKE '%computer%' OR LOWER(p_description) LIKE '%workstation%' THEN
        v_years := 5;
        v_confidence := 'high';
        v_reasoning := 'IT equipment typically lasts 5 years';
    ELSIF LOWER(p_description) LIKE '%vehicle%' OR LOWER(p_description) LIKE '%car%' OR LOWER(p_description) LIKE '%truck%' THEN
        v_years := 8;
        v_confidence := 'high';
        v_reasoning := 'Vehicles typically last 8 years';
    ELSIF LOWER(p_description) LIKE '%furniture%' OR LOWER(p_description) LIKE '%desk%' OR LOWER(p_description) LIKE '%chair%' OR LOWER(p_description) LIKE '%cabinet%' THEN
        v_years := 10;
        v_confidence := 'high';
        v_reasoning := 'Furniture typically lasts 10 years';
    ELSIF LOWER(p_description) LIKE '%air conditioning%' OR LOWER(p_description) LIKE '%hvac%' OR LOWER(p_description) LIKE '%cooling%' THEN
        v_years := 15;
        v_confidence := 'high';
        v_reasoning := 'HVAC systems typically last 15 years';
    ELSIF LOWER(p_description) LIKE '%generator%' OR LOWER(p_description) LIKE '%backup power%' THEN
        v_years := 20;
        v_confidence := 'high';
        v_reasoning := 'Generators typically last 20 years';
    ELSIF LOWER(p_description) LIKE '%refrigerator%' OR LOWER(p_description) LIKE '%freezer%' THEN
        v_years := 12;
        v_confidence := 'high';
        v_reasoning := 'Refrigeration equipment typically lasts 12 years';
    ELSIF LOWER(p_description) LIKE '%printer%' OR LOWER(p_description) LIKE '%copier%' OR LOWER(p_description) LIKE '%scanner%' THEN
        v_years := 7;
        v_confidence := 'medium';
        v_reasoning := 'Office equipment typically lasts 7 years';
    ELSIF LOWER(p_description) LIKE '%monitor%' OR LOWER(p_description) LIKE '%display%' OR LOWER(p_description) LIKE '%screen%' THEN
        v_years := 5;
        v_confidence := 'medium';
        v_reasoning := 'Displays typically last 5 years';
    ELSIF LOWER(p_description) LIKE '%laptop%' OR LOWER(p_description) LIKE '%notebook%' THEN
        v_years := 4;
        v_confidence := 'high';
        v_reasoning := 'Laptops typically last 4 years';
    ELSIF LOWER(p_description) LIKE '%tablet%' OR LOWER(p_description) LIKE '%ipad%' THEN
        v_years := 3;
        v_confidence := 'medium';
        v_reasoning := 'Tablets typically last 3 years';
    ELSIF LOWER(p_description) LIKE '%drill%' OR LOWER(p_description) LIKE '%saw%' OR LOWER(p_description) LIKE '%tool%' THEN
        v_years := 8;
        v_confidence := 'medium';
        v_reasoning := 'Power tools typically last 8 years';
    ELSIF LOWER(p_description) LIKE '%camera%' OR LOWER(p_description) LIKE '%video%' OR LOWER(p_description) LIKE '%recording%' THEN
        v_years := 6;
        v_confidence := 'medium';
        v_reasoning := 'A/V equipment typically lasts 6 years';
    ELSIF LOWER(p_description) LIKE '%fire%' OR LOWER(p_description) LIKE '%safety%' OR LOWER(p_description) LIKE '%alarm%' THEN
        v_years := 10;
        v_confidence := 'high';
        v_reasoning := 'Safety equipment typically lasts 10 years';
    ELSIF LOWER(p_description) LIKE '%paper%' OR LOWER(p_description) LIKE '%pen%' OR LOWER(p_description) LIKE '%supply%' THEN
        v_years := 1;
        v_confidence := 'low';
        v_reasoning := 'Consumables typically last 1 year';
    END IF;
    
    -- Adjust based on cost
    IF p_cost >= 100000 THEN
        v_years := v_years + 2;
        v_reasoning := v_reasoning || '. High-value items typically last longer';
    ELSIF p_cost >= 50000 THEN
        v_years := v_years + 1;
        v_reasoning := v_reasoning || '. Medium-high value items may last longer';
    ELSIF p_cost >= 10000 THEN
        -- No adjustment
        v_reasoning := v_reasoning || '. Standard value items';
    ELSIF p_cost >= 1000 THEN
        v_years := v_years - 1;
        v_reasoning := v_reasoning || '. Lower value items may have shorter life';
    ELSE
        v_years := v_years - 2;
        v_reasoning := v_reasoning || '. Low value items typically have shorter life';
    END IF;
    
    -- Ensure minimum of 1 year
    v_years := GREATEST(1, v_years);
    v_months := ROUND(v_years * 12);
    
    -- Set method
    IF v_confidence = 'high' THEN
        v_method := 'intelligent';
    ELSE
        v_method := 'category_fallback';
    END IF;
    
    RETURN QUERY SELECT v_years, v_months, v_method, v_confidence, v_reasoning;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger function
CREATE OR REPLACE FUNCTION trg_calculate_estimated_life()
RETURNS TRIGGER AS $$
DECLARE
    v_calculation RECORD;
BEGIN
    -- Always calculate estimated useful life for new items or when relevant fields change
    IF TG_OP = 'INSERT' OR 
       (TG_OP = 'UPDATE' AND (
           OLD.estimated_useful_life_override IS DISTINCT FROM NEW.estimated_useful_life_override OR
           OLD.description IS DISTINCT FROM NEW.description OR
           OLD.total_cost IS DISTINCT FROM NEW.total_cost OR
           NEW.estimated_useful_life IS NULL
       )) THEN
        
        SELECT * INTO v_calculation
        FROM calculate_hybrid_estimated_life(
            NEW.description,
            NEW.total_cost,
            NULL, -- category not available in inventory_items
            NEW.estimated_useful_life_override
        );
        
        NEW.estimated_useful_life := v_calculation.years;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS trg_set_estimated_life ON inventory_items;

CREATE TRIGGER trg_set_estimated_life
    BEFORE INSERT OR UPDATE ON inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION trg_calculate_estimated_life();

-- Step 5: Update existing inventory items
UPDATE inventory_items 
SET estimated_useful_life = (
    SELECT years 
    FROM calculate_hybrid_estimated_life(
        description,
        total_cost,
        NULL,
        estimated_useful_life_override
    )
)
WHERE estimated_useful_life IS NULL OR estimated_useful_life = 0;

-- Step 6: Add documentation
COMMENT ON COLUMN inventory_items.estimated_useful_life_override IS 'Manual override for estimated useful life in years. If set, this value will be used instead of intelligent calculation.';
COMMENT ON COLUMN custodian_slip_items.estimated_useful_life_override IS 'Manual override for estimated useful life in years for this specific custodian slip item.';
COMMENT ON FUNCTION calculate_hybrid_estimated_life IS 'Calculates estimated useful life using hybrid approach: manual override > intelligent analysis > category fallback';
