-- ============================================================================
-- SEED LOOKUP DATA
-- ============================================================================
-- This script restores all lookup data (departments, suppliers, fund sources, etc.)
-- Run this in Supabase SQL Editor if your lookup data was deleted
-- 
-- NOTE: For custodians, use the dedicated script: database/seed-custodians.sql
-- ============================================================================

-- ============================================================================
-- DEPARTMENTS
-- ============================================================================
-- First, make sure code column is optional (in case it's required)
DO $$
BEGIN
  -- Try to make code optional if it's currently required
  BEGIN
    ALTER TABLE public.departments ALTER COLUMN code DROP NOT NULL;
  EXCEPTION WHEN OTHERS THEN
    -- Column might already be optional, or constraint might not exist
    NULL;
  END;
END $$;

WITH desired_departments AS (
  SELECT * FROM (VALUES
    ('APH-DAGA', 'APH-DAGA', true),
    ('ADH', 'ADH', true),
    ('AJDH', 'AJDH', true),
    ('APH', 'APH', true),
    ('ASLIC', 'ASLIC', true),
    ('ATC', 'ATC', true),
    ('FDH', 'FDH', true),
    ('GSO', 'GSO', true),
    ('HRMO', 'HRMO', true),
    ('OAS', 'OAS', true),
    ('OPA', 'OPA', true),
    ('OVG', 'OVG', true),
    ('PACCO', 'PACCO', true),
    ('PASSO', 'PASSO', true),
    ('PBMO', 'PBMO', true),
    ('PEO', 'PEO', true),
    ('PGO', 'PGO', true),
    ('PHO', 'PHO', true),
    ('PIASO', 'PIASO', true),
    ('PLO', 'PLO', true),
    ('PPDO', 'PPDO', true),
    ('PSWDO', 'PSWDO', true),
    ('PTO', 'PTO', true),
    ('PTSO', 'PTSO', true),
    ('PVET', 'PVET', true),
    ('SMDH', 'SMDH', true),
    ('SPO', 'SPO', true),
    ('TLIC', 'TLIC', true),
    ('AJDH-MARAG', 'AJDH-MARAG', true),
    ('AJDH-MATAGUISI', 'AJDH-MATAGUISI', true)
  ) AS v(name, code, is_active)
)
INSERT INTO public.departments (name, code, is_active)
SELECT name, code, is_active FROM desired_departments
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    is_active = EXCLUDED.is_active;

-- Deactivate departments that are no longer in the desired list
WITH desired_departments AS (
  SELECT code FROM (VALUES
    ('APH-DAGA'),
    ('ADH'),
    ('AJDH'),
    ('APH'),
    ('ASLIC'),
    ('ATC'),
    ('FDH'),
    ('GSO'),
    ('HRMO'),
    ('OAS'),
    ('OPA'),
    ('OVG'),
    ('PACCO'),
    ('PASSO'),
    ('PBMO'),
    ('PEO'),
    ('PGO'),
    ('PHO'),
    ('PIASO'),
    ('PLO'),
    ('PPDO'),
    ('PSWDO'),
    ('PTO'),
    ('PTSO'),
    ('PVET'),
    ('SMDH'),
    ('SPO'),
    ('TLIC'),
    ('AJDH-MARAG'),
    ('AJDH-MATAGUISI')
  ) AS v(code)
)
UPDATE public.departments
SET is_active = false
WHERE code IS NOT NULL
  AND code NOT IN (SELECT code FROM desired_departments);

-- ============================================================================
-- FUND SOURCES
-- ============================================================================
-- Insert common fund sources (only if they don't already exist)
INSERT INTO public.fund_sources (name, code, is_active)
SELECT * FROM (VALUES
    ('General Fund', 'GF', true),
    ('Special Education Fund', 'SEF', true),
    ('Trust Fund', 'TF', true),
    ('Internal Revenue Allotment', 'IRA', true),
    ('Local Revenue', 'LR', true),
    ('Donations', 'DON', true),
    ('Grants', 'GRANT', true),
    ('20% Development Fund', '20DF', true),
    ('5% Calamity Fund', '5CF', true),
    ('Gender and Development Fund', 'GAD', true)
) AS v(name, code, is_active)
WHERE NOT EXISTS (
    SELECT 1 FROM public.fund_sources WHERE code = v.code
);

-- ============================================================================
-- SUPPLIERS
-- ============================================================================
-- Insert sample suppliers (only if they don't already exist)
-- Note: You may want to customize these based on your actual suppliers
INSERT INTO public.suppliers (name, is_active)
SELECT * FROM (VALUES
    ('Local Supplier 1', true),
    ('Local Supplier 2', true),
    ('National Supplier', true),
    ('Online Supplier', true),
    ('Government Supplier', true)
) AS v(name, is_active)
WHERE NOT EXISTS (
    SELECT 1 FROM public.suppliers WHERE name = v.name
);

-- ============================================================================
-- SEMI-EXPANDABLE CATEGORIES
-- ============================================================================
-- Insert semi-expandable categories (only if they don't already exist)
INSERT INTO public.semi_expandable_categories (name, code, is_active)
SELECT * FROM (VALUES
    ('LAND', 'LAND', true),
    ('LAND IMPROVEMENTS, AQUACULTURE STRUCTURE', 'LAND-IMPROVEMENTS-AQUACULTURE', true),
    ('OTHER LAND IMPROVEMENTS', 'OTHER-LAND-IMPROVEMENTS', true),
    ('ROAD NETWORKS', 'ROAD-NETWORKS', true),
    ('WATER SUPPLY SYSTEMS', 'WATER-SUPPLY', true),
    ('POWER SUPPLY SYSTEMS', 'POWER-SUPPLY', true),
    ('COMMUNICATION NETWORK', 'COMMUNICATION-NETWORK', true),
    ('OTHER INFRASTRUCTURE ASSETS', 'OTHER-INFRASTRUCTURE', true),
    ('BUILDINGS', 'BUILDINGS', true),
    ('HOSPITALS AND HEALTH CENTERS', 'HOSPITALS-HEALTH', true),
    ('MARKETS', 'MARKETS', true),
    ('OTHER STRUCTURES', 'OTHER-STRUCTURES', true),
    ('MACHINERY', 'MACHINERY', true),
    ('OFFICE EQUIPMENT', 'OFFICE-EQUIPMENT', true),
    ('INFORMATION AND COMMUNICATION TECHNOLOGY EQUIPMENT', 'ICT-EQUIPMENT', true),
    ('COMPUTER SOFTWARE', 'COMPUTER-SOFTWARE', true),
    ('AGRICULTURAL AND FORESTRY EQUIPMENT', 'AGRICULTURAL-FORESTRY', true),
    ('COMMUNICATION EQUIPMENT', 'COMMUNICATION-EQUIPMENT', true),
    ('CONSTRUCTION AND HEAVY EQUIPMENT', 'CONSTRUCTION-HEAVY', true),
    ('DISASTER RESPONSE AND RESCUE EQUIPMENT', 'DISASTER-RESCUE', true),
    ('MILITARY, POLICE AND SECURITY EQUIPMENT', 'MILITARY-POLICE-SECURITY', true),
    ('MEDICAL EQUIPMENT', 'MEDICAL-EQUIPMENT', true),
    ('PRINTING EQUIPMENT', 'PRINTING-EQUIPMENT', true),
    ('SPORTS EQUIPMENT', 'SPORTS-EQUIPMENT', true),
    ('TECHNICAL AND SCIENTIFIC EQUIPMENT', 'TECHNICAL-SCIENTIFIC', true),
    ('OTHER MACHINERY AND EQUIPMENT', 'OTHER-MACHINERY', true),
    ('MOTOR VEHICLES', 'MOTOR-VEHICLES', true),
    ('WATERCRAFTS', 'WATERCRAFTS', true),
    ('FURNITURE AND FIXTURES', 'FURNITURE-FIXTURES', true),
    ('BOOKS', 'BOOKS', true),
    ('OTHER PROPERTY, PLANT AND EQUIPMENT', 'OTHER-PPE', true)
) AS v(name, code, is_active)
WHERE NOT EXISTS (
    SELECT 1 FROM public.semi_expandable_categories WHERE name = v.name
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check what was inserted
SELECT 'Departments' as table_name, COUNT(*) as count FROM public.departments WHERE is_active = true
UNION ALL
SELECT 'Fund Sources', COUNT(*) FROM public.fund_sources WHERE is_active = true
UNION ALL
SELECT 'Suppliers', COUNT(*) FROM public.suppliers WHERE is_active = true
UNION ALL
SELECT 'Semi-Expandable Categories', COUNT(*) FROM public.semi_expandable_categories WHERE is_active = true;

-- Show all departments
SELECT '=== DEPARTMENTS ===' as info;
SELECT id, name, code, is_active FROM public.departments ORDER BY name;

-- Show all fund sources
SELECT '=== FUND SOURCES ===' as info;
SELECT id, name, code, is_active FROM public.fund_sources ORDER BY name;

-- Show all suppliers
SELECT '=== SUPPLIERS ===' as info;
SELECT id, name, is_active FROM public.suppliers ORDER BY name;

-- Show all semi-expandable categories
SELECT '=== SEMI-EXPANDABLE CATEGORIES ===' as info;
SELECT id, name, code, is_active FROM public.semi_expandable_categories ORDER BY name;

