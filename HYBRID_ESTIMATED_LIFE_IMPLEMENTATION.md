# Hybrid Estimated Useful Life Implementation

## Overview
Implemented a hybrid approach for calculating estimated useful life that combines:
1. **Intelligent Analysis** - AI-powered calculation based on item description and cost
2. **Manual Override** - User can specify custom values when needed
3. **Category Fallback** - Uses category-based defaults when intelligent analysis is uncertain

## Files Created/Modified

### 1. Core Calculation Engine
- **`src/lib/estimatedLifeCalculator.ts`** - Main calculation logic with intelligent analysis
  - Analyzes item descriptions for keywords (server, laptop, furniture, etc.)
  - Adjusts estimates based on cost (high-value items last longer)
  - Provides confidence levels (high/medium/low)
  - Includes manual override validation

### 2. Database Schema Updates
- **`database/hybrid-estimated-life-supabase.sql`** - Database setup script
  - Adds `estimated_useful_life_override` column to `inventory_items` and `custodian_slip_items`
  - Creates `calculate_hybrid_estimated_life()` function
  - Sets up automatic trigger to calculate estimated life on item creation/update
  - Updates existing items with calculated values

### 3. Frontend Integration
- **`src/components/inventory/InventoryForm.tsx`** - Enhanced inventory form
  - Added hybrid calculation display with real-time updates
  - Manual override input with validation
  - Shows calculation reasoning and confidence levels
  - Visual indicators for calculation method (AI/Manual/Category)

- **`src/types/inventory.ts`** - Updated type definitions
  - Added `estimatedUsefulLife` and `estimatedUsefulLifeOverride` fields

- **`src/services/simpleInventoryService.ts`** - Updated service layer
  - Includes override field in create/update operations
  - Maps database fields to frontend types

### 4. Demo Component
- **`src/components/HybridEstimatedLifeDemo.tsx`** - Interactive demonstration
  - Shows how the hybrid calculation works
  - Interactive examples for different item types
  - Visual display of calculation results and reasoning

## How It Works

### 1. Intelligent Analysis
The system analyzes item descriptions for keywords and patterns:
- **IT Equipment**: Laptops (4 years), Desktops (5 years), Servers (5 years)
- **Furniture**: Desks, chairs, cabinets (10 years)
- **Vehicles**: Cars, trucks (8 years)
- **HVAC**: Air conditioning, cooling systems (15 years)
- **Safety Equipment**: Fire alarms, safety gear (10 years)
- **Tools**: Power tools, equipment (8 years)

### 2. Cost-Based Adjustments
- **High-value items** (₱100,000+): +2 years
- **Medium-high value** (₱50,000+): +1 year
- **Standard value** (₱10,000+): No adjustment
- **Lower value** (₱1,000+): -1 year
- **Low value** (<₱1,000): -2 years

### 3. Manual Override
Users can specify custom estimated useful life values:
- Validates input (0.1 to 50 years)
- Overrides intelligent calculation when provided
- Shows clear indication when manual override is active

### 4. Database Integration
- Automatic calculation via database triggers
- Stores both calculated and override values
- Updates custodian slip items with calculated values
- Maintains data consistency across the system

## Usage Examples

### Example 1: Laptop Computer
- **Description**: "Dell laptop computer for office use"
- **Cost**: ₱45,000
- **Result**: 4 years (high confidence - laptops typically last 4 years)

### Example 2: Office Desk
- **Description**: "Wooden office desk with drawers"
- **Cost**: ₱15,000
- **Result**: 10 years (high confidence - furniture typically lasts 10 years)

### Example 3: Manual Override
- **Description**: "Custom server rack"
- **Cost**: ₱200,000
- **Manual Override**: 8 years
- **Result**: 8 years (manual override takes precedence)

## Benefits

1. **Accuracy**: Intelligent analysis provides more accurate estimates than simple category-based rules
2. **Flexibility**: Manual override allows for special cases and expert knowledge
3. **Transparency**: Clear reasoning and confidence levels help users understand calculations
4. **Consistency**: Database triggers ensure all items get calculated values
5. **User-Friendly**: Real-time calculation display with visual feedback

## Next Steps

1. **Run Database Setup**: Execute `database/hybrid-estimated-life-supabase.sql` in Supabase SQL Editor
2. **Test Integration**: Create inventory items to verify automatic calculation
3. **Customize Rules**: Adjust intelligent analysis patterns based on organization needs
4. **Training**: Educate users on when to use manual override vs. automatic calculation

## Technical Notes

- Calculation happens both client-side (for real-time feedback) and server-side (for data consistency)
- Database triggers ensure estimated useful life is always calculated
- Offline support maintained through existing offline queue system
- Compatible with existing Annex A.3 printing format requirements
