-- Seed semi_expandable_categories with standard categories
-- Run this in Supabase SQL Editor AFTER creating the table
-- This script inserts all standard semi-expendable property categories

-- Insert all categories (only if they don't already exist)
INSERT INTO semi_expandable_categories (name, code, is_active)
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
    SELECT 1 FROM semi_expandable_categories WHERE name = v.name
);

-- Verify the insert
SELECT COUNT(*) as total_categories FROM semi_expandable_categories;
SELECT name, code FROM semi_expandable_categories ORDER BY name;

