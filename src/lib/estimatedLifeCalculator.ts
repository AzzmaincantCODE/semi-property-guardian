/**
 * Hybrid Estimated Useful Life Calculator
 * 
 * This module provides intelligent calculation of estimated useful life
 * based on item description and cost analysis, with manual override capability.
 */

export interface EstimatedLifeCalculation {
  years: number;
  months: number;
  method: 'intelligent' | 'manual' | 'category_fallback';
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface ItemAnalysis {
  description: string;
  cost: number;
  category?: string;
  manualOverride?: number; // in years
}

/**
 * Intelligent analysis of item description to determine useful life
 */
function analyzeDescription(description: string): Partial<EstimatedLifeCalculation> {
  const desc = description.toLowerCase();
  
  // High-value, long-lasting items
  if (desc.includes('server') || desc.includes('computer') || desc.includes('workstation')) {
    return { years: 5, confidence: 'high', reasoning: 'IT equipment typically lasts 5 years' };
  }
  
  if (desc.includes('vehicle') || desc.includes('car') || desc.includes('truck')) {
    return { years: 8, confidence: 'high', reasoning: 'Vehicles typically last 8 years' };
  }
  
  if (desc.includes('furniture') || desc.includes('desk') || desc.includes('chair') || desc.includes('cabinet')) {
    return { years: 10, confidence: 'high', reasoning: 'Furniture typically lasts 10 years' };
  }
  
  if (desc.includes('air conditioning') || desc.includes('hvac') || desc.includes('cooling')) {
    return { years: 15, confidence: 'high', reasoning: 'HVAC systems typically last 15 years' };
  }
  
  if (desc.includes('generator') || desc.includes('backup power')) {
    return { years: 20, confidence: 'high', reasoning: 'Generators typically last 20 years' };
  }
  
  // Electronics and appliances
  if (desc.includes('refrigerator') || desc.includes('freezer')) {
    return { years: 12, confidence: 'high', reasoning: 'Refrigeration equipment typically lasts 12 years' };
  }
  
  if (desc.includes('printer') || desc.includes('copier') || desc.includes('scanner')) {
    return { years: 7, confidence: 'medium', reasoning: 'Office equipment typically lasts 7 years' };
  }
  
  if (desc.includes('monitor') || desc.includes('display') || desc.includes('screen')) {
    return { years: 5, confidence: 'medium', reasoning: 'Displays typically last 5 years' };
  }
  
  if (desc.includes('laptop') || desc.includes('notebook')) {
    return { years: 4, confidence: 'high', reasoning: 'Laptops typically last 4 years' };
  }
  
  if (desc.includes('tablet') || desc.includes('ipad')) {
    return { years: 3, confidence: 'medium', reasoning: 'Tablets typically last 3 years' };
  }
  
  // Tools and equipment
  if (desc.includes('drill') || desc.includes('saw') || desc.includes('tool')) {
    return { years: 8, confidence: 'medium', reasoning: 'Power tools typically last 8 years' };
  }
  
  if (desc.includes('camera') || desc.includes('video') || desc.includes('recording')) {
    return { years: 6, confidence: 'medium', reasoning: 'A/V equipment typically lasts 6 years' };
  }
  
  // Safety equipment
  if (desc.includes('fire') || desc.includes('safety') || desc.includes('alarm')) {
    return { years: 10, confidence: 'high', reasoning: 'Safety equipment typically lasts 10 years' };
  }
  
  // Office supplies and consumables
  if (desc.includes('paper') || desc.includes('pen') || desc.includes('supply')) {
    return { years: 1, confidence: 'low', reasoning: 'Consumables typically last 1 year' };
  }
  
  return { years: 5, confidence: 'low', reasoning: 'Default estimate based on general equipment' };
}

/**
 * Cost-based analysis to adjust estimated life
 */
function analyzeCost(cost: number, baseYears: number): Partial<EstimatedLifeCalculation> {
  let adjustment = 0;
  let reasoning = '';
  
  if (cost >= 100000) {
    adjustment = 2;
    reasoning = 'High-value items typically last longer';
  } else if (cost >= 50000) {
    adjustment = 1;
    reasoning = 'Medium-high value items may last longer';
  } else if (cost >= 10000) {
    adjustment = 0;
    reasoning = 'Standard value items';
  } else if (cost >= 1000) {
    adjustment = -1;
    reasoning = 'Lower value items may have shorter life';
  } else {
    adjustment = -2;
    reasoning = 'Low value items typically have shorter life';
  }
  
  const adjustedYears = Math.max(1, baseYears + adjustment);
  
  return {
    years: adjustedYears,
    confidence: cost >= 10000 ? 'high' : cost >= 1000 ? 'medium' : 'low',
    reasoning: reasoning
  };
}

/**
 * Category-based fallback calculation
 */
function getCategoryFallback(category?: string): Partial<EstimatedLifeCalculation> {
  const categoryMap: Record<string, number> = {
    'IT Equipment': 5,
    'Furniture': 10,
    'Vehicles': 8,
    'Machinery': 15,
    'Electronics': 4,
    'Tools': 8,
    'Appliances': 12,
    'Safety Equipment': 10,
    'Office Equipment': 7,
    'Building Equipment': 20
  };
  
  const years = categoryMap[category || ''] || 5;
  return {
    years,
    confidence: 'medium',
    reasoning: `Category-based estimate for ${category || 'unknown category'}`
  };
}

/**
 * Main hybrid calculation function
 */
export function calculateEstimatedUsefulLife(item: ItemAnalysis): EstimatedLifeCalculation {
  // If manual override is provided, use it
  if (item.manualOverride && item.manualOverride > 0) {
    return {
      years: item.manualOverride,
      months: Math.round(item.manualOverride * 12),
      method: 'manual',
      confidence: 'high',
      reasoning: 'Manual override provided by user'
    };
  }
  
  // Try intelligent analysis first
  const descriptionAnalysis = analyzeDescription(item.description);
  const costAnalysis = analyzeCost(item.cost, descriptionAnalysis.years || 5);
  
  // If we have high confidence from description analysis, use it
  if (descriptionAnalysis.confidence === 'high') {
    const finalYears = costAnalysis.years || descriptionAnalysis.years || 5;
    return {
      years: finalYears,
      months: Math.round(finalYears * 12),
      method: 'intelligent',
      confidence: costAnalysis.confidence || 'high',
      reasoning: `${descriptionAnalysis.reasoning}. ${costAnalysis.reasoning}`
    };
  }
  
  // Fall back to category-based if available
  if (item.category) {
    const categoryFallback = getCategoryFallback(item.category);
    const finalYears = costAnalysis.years || categoryFallback.years || 5;
    return {
      years: finalYears,
      months: Math.round(finalYears * 12),
      method: 'category_fallback',
      confidence: costAnalysis.confidence || 'medium',
      reasoning: `${categoryFallback.reasoning}. ${costAnalysis.reasoning}`
    };
  }
  
  // Final fallback
  const finalYears = costAnalysis.years || 5;
  return {
    years: finalYears,
    months: Math.round(finalYears * 12),
    method: 'intelligent',
    confidence: 'low',
    reasoning: `Default estimate based on cost analysis. ${costAnalysis.reasoning}`
  };
}

/**
 * Get a human-readable summary of the calculation
 */
export function getCalculationSummary(calculation: EstimatedLifeCalculation): string {
  const methodText = {
    'intelligent': 'AI Analysis',
    'manual': 'Manual Override',
    'category_fallback': 'Category-Based'
  };
  
  const confidenceText = {
    'high': 'High Confidence',
    'medium': 'Medium Confidence', 
    'low': 'Low Confidence'
  };
  
  return `${calculation.years} years (${calculation.months} months) - ${methodText[calculation.method]} - ${confidenceText[calculation.confidence]}`;
}

/**
 * Validate manual override input
 */
export function validateManualOverride(value: string): { valid: boolean; years?: number; error?: string } {
  if (!value || value.trim() === '') {
    return { valid: true }; // Empty is valid (no override)
  }
  
  const num = parseFloat(value);
  
  if (isNaN(num)) {
    return { valid: false, error: 'Must be a valid number' };
  }
  
  if (num <= 0) {
    return { valid: false, error: 'Must be greater than 0' };
  }
  
  if (num > 50) {
    return { valid: false, error: 'Must be 50 years or less' };
  }
  
  return { valid: true, years: num };
}
