import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { calculateEstimatedUsefulLife, getCalculationSummary } from '@/lib/estimatedLifeCalculator';

export const HybridEstimatedLifeDemo = () => {
  const [description, setDescription] = useState('Laptop computer used for administrative tasks');
  const [cost, setCost] = useState(45000);
  const [category, setCategory] = useState('IT Equipment');
  const [manualOverride, setManualOverride] = useState('');
  const [calculation, setCalculation] = useState<any>(null);

  const calculate = () => {
    const result = calculateEstimatedUsefulLife({
      description,
      cost,
      category,
      manualOverride: manualOverride ? parseFloat(manualOverride) : undefined
    });
    setCalculation(result);
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'manual': return 'bg-blue-100 text-blue-800';
      case 'intelligent': return 'bg-purple-100 text-purple-800';
      case 'category_fallback': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Hybrid Estimated Useful Life Calculator</CardTitle>
        <p className="text-sm text-muted-foreground">
          Intelligent calculation based on description and cost, with manual override option
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="description">Item Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Laptop computer, Office desk, Vehicle"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="cost">Unit Cost (₱)</Label>
            <Input
              id="cost"
              type="number"
              value={cost}
              onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., IT Equipment, Furniture, Vehicles"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="manualOverride">Manual Override (years)</Label>
            <Input
              id="manualOverride"
              type="number"
              step="0.1"
              value={manualOverride}
              onChange={(e) => setManualOverride(e.target.value)}
              placeholder="Leave empty for automatic calculation"
            />
          </div>
        </div>

        <Button onClick={calculate} className="w-full">
          Calculate Estimated Useful Life
        </Button>

        {/* Results Display */}
        {calculation && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Calculation Results</h3>
              <div className="flex gap-2">
                <Badge className={getMethodColor(calculation.method)}>
                  {calculation.method === 'manual' ? 'Manual Override' : 
                   calculation.method === 'intelligent' ? 'AI Analysis' : 'Category-Based'}
                </Badge>
                <Badge className={getConfidenceColor(calculation.confidence)}>
                  {calculation.confidence} confidence
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-background rounded-lg border">
                <div className="text-2xl font-bold text-blue-600">{calculation.years}</div>
                <div className="text-sm text-muted-foreground">Years</div>
              </div>
              <div className="text-center p-4 bg-background rounded-lg border">
                <div className="text-2xl font-bold text-green-600">{calculation.months}</div>
                <div className="text-sm text-muted-foreground">Months</div>
              </div>
              <div className="text-center p-4 bg-background rounded-lg border">
                <div className="text-2xl font-bold text-purple-600">
                  {getCalculationSummary(calculation)}
                </div>
                <div className="text-sm text-muted-foreground">Summary</div>
              </div>
            </div>
            
            {calculation.reasoning && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm font-medium mb-1">Reasoning:</div>
                <div className="text-sm text-muted-foreground">{calculation.reasoning}</div>
              </div>
            )}
          </div>
        )}

        {/* Examples */}
        <div className="space-y-2">
          <h4 className="font-medium">Try these examples:</h4>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setDescription('Dell OptiPlex desktop computer');
                setCost(35000);
                setCategory('IT Equipment');
                setManualOverride('');
              }}
            >
              Desktop Computer
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setDescription('Office desk with drawers');
                setCost(15000);
                setCategory('Furniture');
                setManualOverride('');
              }}
            >
              Office Desk
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setDescription('Company vehicle for transportation');
                setCost(800000);
                setCategory('Vehicles');
                setManualOverride('');
              }}
            >
              Company Vehicle
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setDescription('Air conditioning unit for office');
                setCost(25000);
                setCategory('HVAC');
                setManualOverride('');
              }}
            >
              Air Conditioning
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
