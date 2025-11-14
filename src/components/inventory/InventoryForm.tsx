import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { InventoryItem } from "@/types/inventory";
import { lookupService, LookupItem } from "@/services/lookupService";
import { PropertyNumberService } from "@/services/propertyNumberService";
import { calculateEstimatedUsefulLife, getCalculationSummary, validateManualOverride } from "@/lib/estimatedLifeCalculator";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

interface InventoryFormProps {
  item?: InventoryItem;
  onSave: (item: InventoryItem, autoCreatePropertyCard?: boolean) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export const InventoryForm = ({ item, onSave, onCancel, isSaving = false }: InventoryFormProps) => {
  const [suppliers, setSuppliers] = useState<LookupItem[]>([]);
  const [fundSources, setFundSources] = useState<LookupItem[]>([]);
  const [semiExpandableCategories, setSemiExpandableCategories] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAddLookup, setOpenAddLookup] = useState<{ type: 'supplier' | 'fundSource' | null }>({ type: null });
  const [newLookup, setNewLookup] = useState<{ name: string; code?: string }>({ name: "" });
  const [estimatedLifeOverride, setEstimatedLifeOverride] = useState<string>(item?.estimatedUsefulLifeOverride?.toString() || "");
  const [estimatedLifeCalculation, setEstimatedLifeCalculation] = useState<any>(null);
  const [overrideError, setOverrideError] = useState<string>("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [propertyNumberPrefix, setPropertyNumberPrefix] = useState<string>('');
  const [autoCreatePropertyCard, setAutoCreatePropertyCard] = useState<boolean>(false);

  const createLookup = async () => {
    if (!newLookup.name.trim() || !openAddLookup.type) return;
    const map: any = { supplier: 'suppliers', fundSource: 'fund_sources' };
    const created = await lookupService.create(map[openAddLookup.type], newLookup);
    if (openAddLookup.type === 'supplier') setSuppliers([created, ...suppliers]);
    if (openAddLookup.type === 'fundSource') setFundSources([created, ...fundSources]);
    setNewLookup({ name: "" });
    setOpenAddLookup({ type: null });
  };

  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    propertyNumber: item?.propertyNumber || "",
    description: item?.description || "",
    brand: item?.brand || "",
    model: item?.model || "",
    serialNumber: item?.serialNumber || "",
    unitOfMeasure: item?.unitOfMeasure || "piece",
    quantity: item?.quantity || 1,
    unitCost: item?.unitCost || undefined,
    dateAcquired: item?.dateAcquired || new Date().toISOString().split('T')[0],
    supplier: item?.supplier || "",
    condition: item?.condition || "Serviceable",
    fundSource: item?.fundSource || "",
    remarks: item?.remarks || "",
    semiExpandableCategory: item?.semiExpandableCategory || "", // Store the selected category name
    subCategory: item?.subCategory || undefined,
    status: item?.status || "Active",
    lastInventoryDate: item?.lastInventoryDate || "",
    entityName: item?.entityName || "PROVINCIAL GOVERNMENT OF APAYAO",
  });

  const computedEntityName = useMemo(() => {
    const parts = [formData.brand?.trim(), formData.model?.trim(), formData.serialNumber?.trim()]
      .filter(Boolean) as string[];
    return parts.join(" ");
  }, [formData.brand, formData.model, formData.serialNumber]);

  // Helper function to determine sub-category from unit cost
  const determineSubCategory = (unitCost: number | undefined): 'Small Value Expendable' | 'High Value Expendable' | undefined => {
    if (unitCost === undefined || unitCost === null) {
      return undefined;
    }
    return unitCost <= 5000 ? 'Small Value Expendable' : 'High Value Expendable';
  };

  // Initialize property number prefix when editing an existing item
  useEffect(() => {
    if (item?.propertyNumber && !propertyNumberPrefix) {
      const parts = item.propertyNumber.split('-');
      if (parts[0] === 'SPLV' || parts[0] === 'SPHV') {
        setPropertyNumberPrefix(parts[0]);
      }
    }
  }, [item?.propertyNumber, propertyNumberPrefix]);

  // Generate property number when sub-category changes
  const generatePropertyNumber = async (subCategory: 'Small Value Expendable' | 'High Value Expendable') => {
    console.log('generatePropertyNumber called with subCategory:', subCategory);
    const prefix = PropertyNumberService.getPrefixForSubCategory(subCategory);
    setPropertyNumberPrefix(prefix);
    
    try {
      // Use the new unique property number generation to prevent duplicates
      const propertyNumber = await PropertyNumberService.generateUniquePropertyNumber(subCategory);
      console.log('Generated unique property number:', propertyNumber);
      setFormData(prev => ({ ...prev, propertyNumber }));
      console.log('Updated formData with property number:', propertyNumber);
    } catch (error) {
      console.error('Error generating unique property number:', error);
      // Fallback to basic generation
      try {
        const propertyNumber = await PropertyNumberService.generateNextPropertyNumber(subCategory);
        console.log('Generated fallback property number:', propertyNumber);
        setFormData(prev => ({ ...prev, propertyNumber }));
      } catch (fallbackError) {
        console.error('Fallback generation also failed:', fallbackError);
        // Final fallback to manual format
        const now = new Date();
        const year = now.getFullYear().toString();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const fallbackNumber = `${prefix}-${year}-${month}-0001`;
        console.log('Using final fallback number:', fallbackNumber);
        setFormData(prev => ({ ...prev, propertyNumber: fallbackNumber }));
      }
    }
  };

  // Auto-determine sub-category and generate property number when unit cost changes
  useEffect(() => {
    if (formData.unitCost !== undefined && formData.unitCost !== null && formData.unitCost >= 0.01) {
      const determinedSubCategory = determineSubCategory(formData.unitCost);
      
      // Only update if sub-category changed or is not set
      if (determinedSubCategory) {
        setFormData(prev => {
          // Only update if sub-category actually changed
          if (prev.subCategory !== determinedSubCategory) {
            console.log('Auto-determining sub-category:', determinedSubCategory, 'from unit cost:', formData.unitCost);
            // Generate property number for the determined sub-category
            generatePropertyNumber(determinedSubCategory);
            return { ...prev, subCategory: determinedSubCategory };
          }
          return prev;
        });
      }
    } else if (formData.unitCost === undefined || formData.unitCost === null) {
      // Clear sub-category and property number if unit cost is cleared
      setFormData(prev => {
        if (prev.subCategory) {
          setPropertyNumberPrefix('');
          return { ...prev, subCategory: undefined, propertyNumber: '' };
        }
        return prev;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.unitCost]);

  // Validate property number format while allowing editing
  const validatePropertyNumber = (value: string): string => {
    if (!value) return '';
    
    const parts = value.split('-');
    if (parts.length !== 4) return value;
    
    const [prefix, year, month, sequence] = parts;
    
    // Enforce that the prefix must be SPLV or SPHV
    if (prefix !== 'SPLV' && prefix !== 'SPHV') {
      // Invalid prefix, restore original if we have one
      if (propertyNumberPrefix) {
        return `${propertyNumberPrefix}-${year}-${month}-${sequence}`;
      }
      return value;
    }
    
    // If the prefix changed from what was generated, prevent it
    if (propertyNumberPrefix && prefix !== propertyNumberPrefix) {
      // Restore the original prefix
      return `${propertyNumberPrefix}-${year}-${month}-${sequence}`;
    }
    
    return value;
  };

  // Handle property number input change
  const handlePropertyNumberChange = (value: string) => {
    const validated = validatePropertyNumber(value);
    setFormData(prev => ({ ...prev, propertyNumber: validated }));
  };

  // Validation for unit cost (simplified since sub-category is auto-determined)
  const unitCostValidation = useMemo(() => {
    const unitCost = formData.unitCost;
    
    // Only validate if user has actually entered a value
    if (unitCost === undefined || unitCost === null) {
      return { isValid: true, message: '' };
    }
    
    // Check minimum value only if user has entered something
    if (unitCost < 0.01) {
      return {
        isValid: false,
        message: 'Unit cost must be at least ₱0.01'
      };
    }
    
    // Sub-category is auto-determined, so no need to validate mismatch
    return { isValid: true, message: '' };
  }, [formData.unitCost]);


  // Load lookup data
  useEffect(() => {
    const loadLookupData = async () => {
      try {
        const [suppliersData, fundSourcesData, categoriesData] = await Promise.all([
          lookupService.getSuppliers(),
          lookupService.getFundSources(),
          lookupService.getSemiExpandableCategories(),
        ]);

        setSuppliers(suppliersData);
        setFundSources(fundSourcesData);
        setSemiExpandableCategories(categoriesData);
      } catch (error) {
        console.error('Error loading lookup data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLookupData();
  }, []);

  // Calculate estimated useful life when form data changes
  useEffect(() => {
    if (formData.description && formData.unitCost !== undefined) {
      const calculation = calculateEstimatedUsefulLife({
        description: formData.description,
        cost: formData.unitCost,
        category: 'Semi-Expendable', // Always Semi-Expendable
        manualOverride: estimatedLifeOverride ? parseFloat(estimatedLifeOverride) : undefined
      });
      setEstimatedLifeCalculation(calculation);
    }
  }, [formData.description, formData.unitCost, estimatedLifeOverride]);

  const handleOverrideChange = (value: string) => {
    setEstimatedLifeOverride(value);
    const validation = validateManualOverride(value);
    setOverrideError(validation.error || "");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate semi-expendable category is selected
    if (!formData.semiExpandableCategory) {
      setOverrideError("Please select a Semi-Expendable Category");
      return;
    }
    
    // Validate unit cost is provided (required for sub-category determination)
    if (!formData.unitCost || formData.unitCost < 0.01) {
      setOverrideError("Please enter a valid unit cost (minimum ₱0.01)");
      return;
    }
    
    // Ensure sub-category is determined
    if (!formData.subCategory) {
      const determinedSubCategory = determineSubCategory(formData.unitCost);
      if (determinedSubCategory) {
        setFormData(prev => ({ ...prev, subCategory: determinedSubCategory }));
        setOverrideError("Please wait for property number to be generated...");
        // Generate property number and retry submission
        generatePropertyNumber(determinedSubCategory).then(() => {
          // Retry submission after property number is generated
          setTimeout(() => {
            const newItem: InventoryItem = {
              id: item?.id || `INV-${Date.now()}`,
              ...formData,
              subCategory: determinedSubCategory,
              totalCost: (formData.quantity || 0) * (formData.unitCost || 0),
              estimatedUsefulLifeOverride: estimatedLifeOverride ? parseFloat(estimatedLifeOverride) : null,
              createdAt: item?.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as InventoryItem;
            onSave(newItem, autoCreatePropertyCard);
          }, 500);
        });
        return;
      }
      setOverrideError("Unable to determine sub-category. Please check unit cost.");
      return;
    }
    
    // Validate unit cost
    if (!unitCostValidation.isValid) {
      setOverrideError(unitCostValidation.message);
      return;
    }
    
    // Validate property number is set
    if (!formData.propertyNumber) {
      setOverrideError("Property number is required. Please wait for it to be generated or enter manually.");
      return;
    }
    
    // Clear any previous validation errors
    setOverrideError("");
    
    const newItem: InventoryItem = {
      id: item?.id || `INV-${Date.now()}`,
      ...formData,
      totalCost: (formData.quantity || 0) * (formData.unitCost || 0),
      estimatedUsefulLifeOverride: estimatedLifeOverride ? parseFloat(estimatedLifeOverride) : null,
      createdAt: item?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as InventoryItem;
    
    onSave(newItem, autoCreatePropertyCard);
  };

  if (loading) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="text-muted-foreground">Loading form data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
        <CardTitle>{item ? "Edit Inventory Item" : "Add New Inventory Item"}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Category Selection */}
          <div className="space-y-4 p-5 border rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">1</div>
              <h3 className="text-lg font-semibold text-blue-900">Category Selection</h3>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="semiExpandableCategory" className="text-sm font-medium">Semi-Expendable Category *</Label>
              <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={categoryOpen}
                    className="w-full justify-between h-auto min-h-10 py-2 bg-white"
                  >
                    <span className="truncate text-left flex-1 mr-2">
                      {formData.semiExpandableCategory
                        ? semiExpandableCategories.find((cat) => cat.name === formData.semiExpandableCategory)?.name || formData.semiExpandableCategory
                        : "Select category..."}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Search categories..." 
                      value={categorySearch}
                      onValueChange={setCategorySearch}
                    />
                    <CommandList>
                      <CommandEmpty>No category found.</CommandEmpty>
                      <CommandGroup>
                        {semiExpandableCategories
                          .filter((cat) => 
                            categorySearch === "" || 
                            cat.name.toLowerCase().includes(categorySearch.toLowerCase())
                          )
                          .map((cat) => (
                            <CommandItem
                              key={cat.id}
                              value={cat.name}
                              onSelect={() => {
                                setFormData({...formData, semiExpandableCategory: cat.name});
                                setCategoryOpen(false);
                                setCategorySearch("");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.semiExpandableCategory === cat.name
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {cat.name}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Search and select the appropriate semi-expendable category
              </p>
            </div>
          </div>

          {/* Step 2: Item Identification */}
          <div className="space-y-4 p-5 border rounded-lg bg-gradient-to-br from-green-50 to-green-100/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">2</div>
              <h3 className="text-lg font-semibold text-green-900">Item Identification</h3>
            </div>

          {/* Brand, Model, Serial Number */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => setFormData({...formData, brand: e.target.value})}
                placeholder="e.g., Dell, HP, Apple"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => setFormData({...formData, model: e.target.value})}
                placeholder="e.g., OptiPlex 7090"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input
                id="serialNumber"
                value={formData.serialNumber}
                onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
                placeholder="e.g., DL12345678"
              />
            </div>
          </div>

          

            {/* Description - Auto-generated from Brand, Model, Serial */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (auto-generated) *</Label>
              <Input
                id="description"
                value={computedEntityName}
                disabled
                placeholder="Auto-generated from Brand, Model, Serial Number"
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Description is automatically generated from Brand, Model, and Serial Number fields above
              </p>
            </div>

            {/* Entity Name - Inputable */}
            <div className="space-y-2">
              <Label htmlFor="entityName">Entity Name *</Label>
              <Input
                id="entityName"
                value={formData.entityName || ""}
                onChange={(e) => setFormData({...formData, entityName: e.target.value})}
                placeholder="PROVINCIAL GOVERNMENT OF APAYAO"
                required
              />
              <p className="text-xs text-muted-foreground">
                Recommended: PROVINCIAL GOVERNMENT OF APAYAO - This will be used as the entity name when creating property cards
              </p>
            </div>
          </div>

          {/* Step 3: Financial Information */}
          <div className="space-y-4 p-5 border rounded-lg bg-gradient-to-br from-yellow-50 to-yellow-100/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-yellow-600 text-white flex items-center justify-center text-sm font-bold">3</div>
              <h3 className="text-lg font-semibold text-yellow-900">Financial Information</h3>
            </div>

          {/* Quantity, Unit of Measure, Unit Cost, Total Cost */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="unitOfMeasure">Unit of Measure *</Label>
              <Select value={formData.unitOfMeasure} onValueChange={(value) => setFormData({...formData, unitOfMeasure: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="piece">Piece</SelectItem>
                  <SelectItem value="set">Set</SelectItem>
                  <SelectItem value="unit">Unit</SelectItem>
                  <SelectItem value="lot">Lot</SelectItem>
                  <SelectItem value="pair">Pair</SelectItem>
                  <SelectItem value="dozen">Dozen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="unitCost">Unit Cost *</Label>
              <Input
                id="unitCost"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.unitCost || ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  // Allow empty input while typing
                  if (isNaN(value)) {
                    setFormData({...formData, unitCost: undefined});
                  } else {
                    setFormData({...formData, unitCost: value});
                  }
                }}
                onBlur={(e) => {
                  const value = parseFloat(e.target.value);
                  // Ensure minimum value on blur
                  if (!value || value <= 0) {
                    setFormData({...formData, unitCost: 0.01});
                  }
                }}
                required
                placeholder="Enter amount (minimum ₱0.01)"
                className={!unitCostValidation.isValid ? "border-red-500" : ""}
              />
              {!unitCostValidation.isValid && (
                <div className="text-sm text-red-600">{unitCostValidation.message}</div>
              )}
              {formData.unitCost !== undefined && formData.unitCost !== null && formData.unitCost >= 0.01 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className={`px-2 py-1 rounded ${
                    formData.unitCost <= 5000 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {formData.unitCost <= 5000 
                      ? '✓ Small Value (SPLV)' 
                      : '✓ High Value (SPHV)'}
                  </span>
                  <span className="text-muted-foreground">
                    Sub-category and property number will be auto-generated
                  </span>
                </div>
              )}
              {(!formData.unitCost || formData.unitCost < 0.01) && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <span>💡</span>
                  <span>Enter unit cost to automatically determine sub-category and generate property number</span>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Total Cost</Label>
              <div className="px-3 py-2 bg-muted rounded-md text-sm font-medium">
                ₱{((formData.quantity || 0) * (formData.unitCost || 0)).toFixed(2)}
              </div>
            </div>
          </div>
          </div>

          {/* Step 4: Property Details (Auto-determined) */}
          <div className="space-y-4 p-5 border rounded-lg bg-gradient-to-br from-purple-50 to-purple-100/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">4</div>
              <h3 className="text-lg font-semibold text-purple-900">Property Details</h3>
              <span className="text-xs text-muted-foreground ml-auto">(Auto-determined from unit cost)</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sub-Category Display */}
              <div className="space-y-2">
                <Label htmlFor="subCategory" className="text-sm font-medium">Sub-Category</Label>
                <div className={`px-4 py-3 rounded-md text-sm font-medium flex items-center justify-between ${
                  formData.subCategory === 'High Value Expendable' 
                    ? 'bg-blue-100 text-blue-800 border-2 border-blue-300' 
                    : formData.subCategory === 'Small Value Expendable'
                    ? 'bg-green-100 text-green-800 border-2 border-green-300'
                    : 'bg-muted text-muted-foreground border-2 border-gray-200'
                }`}>
                  {formData.subCategory ? (
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {formData.subCategory === 'High Value Expendable' ? '🔵' : '🟢'}
                      </span>
                      <span>
                        {formData.subCategory === 'Small Value Expendable' 
                          ? 'Small Value Expendable (SPLV)' 
                          : 'High Value Expendable (SPHV)'}
                      </span>
                    </div>
                  ) : (
                    <span>Enter unit cost above to determine</span>
                  )}
                </div>
                {formData.unitCost !== undefined && formData.unitCost !== null && formData.unitCost >= 0.01 && (
                  <p className="text-xs text-muted-foreground">
                    {formData.unitCost <= 5000
                      ? '✓ Determined as Small Value (≤ ₱5,000)'
                      : '✓ Determined as High Value (> ₱5,000)'}
                  </p>
                )}
              </div>

              {/* Property Number */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="propertyNumber" className="text-sm font-medium">Property Number *</Label>
                  {formData.subCategory && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (formData.subCategory) {
                          generatePropertyNumber(formData.subCategory as 'Small Value Expendable' | 'High Value Expendable');
                        }
                      }}
                      className="text-xs h-7"
                    >
                      🎲 Regenerate
                    </Button>
                  )}
                </div>
                <Input
                  id="propertyNumber"
                  value={formData.propertyNumber}
                  onChange={(e) => handlePropertyNumberChange(e.target.value)}
                  required
                  placeholder={formData.subCategory ? "Auto-generated from unit cost" : "Enter unit cost to generate"}
                  className={formData.subCategory ? "bg-green-50 border-green-300 font-mono" : "bg-muted"}
                />
                {formData.subCategory && (
                  <p className="text-xs text-green-700">
                    ✅ Format: {PropertyNumberService.getPrefixForSubCategory(formData.subCategory)}-YYYY-MM-NNNN
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Step 5: Acquisition Details */}
          <div className="space-y-4 p-5 border rounded-lg bg-gradient-to-br from-orange-50 to-orange-100/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center text-sm font-bold">5</div>
              <h3 className="text-lg font-semibold text-orange-900">Acquisition Details</h3>
            </div>

          {/* Date Acquired and Supplier */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateAcquired">Date Acquired *</Label>
              <Input
                id="dateAcquired"
                type="date"
                value={formData.dateAcquired}
                onChange={(e) => setFormData({...formData, dateAcquired: e.target.value})}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Select value={formData.supplier} onValueChange={(value) => setFormData({...formData, supplier: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                    <div className="p-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setOpenAddLookup({ type: 'supplier' })}>+ Add supplier</Button>
                    </div>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Fund Source */}
            <div className="space-y-2">
              <Label htmlFor="fundSource">Fund Source</Label>
              <Select value={formData.fundSource} onValueChange={(value) => setFormData({...formData, fundSource: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select fund source" />
                </SelectTrigger>
                <SelectContent>
                  {fundSources.map((fundSource) => (
                    <SelectItem key={fundSource.id} value={fundSource.id}>
                      {fundSource.name}
                    </SelectItem>
                  ))}
                  <div className="p-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setOpenAddLookup({ type: 'fundSource' })}>+ Add fund source</Button>
                  </div>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Step 6: Status and Condition */}
          <div className="space-y-4 p-5 border rounded-lg bg-gradient-to-br from-red-50 to-red-100/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center text-sm font-bold">6</div>
              <h3 className="text-lg font-semibold text-red-900">Status and Condition</h3>
            </div>

          {/* Condition and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="condition">Condition *</Label>
              <Select value={formData.condition} onValueChange={(value) => setFormData({...formData, condition: value as any})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Serviceable">Serviceable</SelectItem>
                  <SelectItem value="Unserviceable">Unserviceable</SelectItem>
                  <SelectItem value="For Repair">For Repair</SelectItem>
                  <SelectItem value="Lost">Lost</SelectItem>
                  <SelectItem value="Stolen">Stolen</SelectItem>
                  <SelectItem value="Damaged">Damaged</SelectItem>
                  <SelectItem value="Destroyed">Destroyed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value as any})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Transferred">Transferred</SelectItem>
                  <SelectItem value="Disposed">Disposed</SelectItem>
                  <SelectItem value="Missing">Missing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

            {/* Last Inventory Date */}
            <div className="space-y-2">
              <Label htmlFor="lastInventoryDate">Last Inventory Date</Label>
            <Input
              id="lastInventoryDate"
              type="date"
              value={formData.lastInventoryDate}
              onChange={(e) => setFormData({...formData, lastInventoryDate: e.target.value})}
            />
          </div>
          </div>

          {/* Step 7: Additional Information */}
          <div className="space-y-4 p-5 border rounded-lg bg-gradient-to-br from-gray-50 to-gray-100/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-gray-600 text-white flex items-center justify-center text-sm font-bold">7</div>
              <h3 className="text-lg font-semibold text-gray-900">Additional Information</h3>
            </div>

          {/* Remarks */}
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => setFormData({...formData, remarks: e.target.value})}
              rows={3}
              placeholder="Additional notes or comments about this item"
            />
            </div>

          </div>

          {/* Step 8: Property Card Creation Option */}
          {!item && (
            <div className="space-y-4 p-5 border rounded-lg bg-gradient-to-br from-teal-50 to-teal-100/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-bold">8</div>
                <h3 className="text-lg font-semibold text-teal-900">Property Card Creation</h3>
              </div>
              <div className="flex items-start space-x-3 p-3 bg-background rounded-md border">
                <Checkbox
                  id="autoCreatePropertyCard"
                  checked={autoCreatePropertyCard}
                  onCheckedChange={(checked) => setAutoCreatePropertyCard(checked === true)}
                />
                <div className="space-y-1 flex-1">
                  <Label 
                    htmlFor="autoCreatePropertyCard" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Automatically create property card
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    If checked, a property card will be created automatically using the entity name and fund source from this inventory item. 
                    You can still edit the property card later if needed.
                  </p>
                  {autoCreatePropertyCard && (
                    <div className="mt-2 p-2 bg-teal-50 rounded text-xs">
                      <p className="font-medium text-teal-800">Property card will be created with:</p>
                      <ul className="list-disc list-inside mt-1 space-y-1 text-teal-700">
                        <li>Entity Name: {formData.entityName || "PROVINCIAL GOVERNMENT OF APAYAO"}</li>
                        <li>Fund Cluster: {formData.fundSource 
                          ? (fundSources.find(fs => fs.id === formData.fundSource)?.name || "From selected fund source")
                          : "General Fund (default)"}</li>
                        <li>Property Number: {formData.propertyNumber || "Will use generated number"}</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 9: Estimated Useful Life */}
          <div className="space-y-4 p-5 border rounded-lg bg-gradient-to-br from-indigo-50 to-indigo-100/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">{item ? '8' : '9'}</div>
              <h3 className="text-lg font-semibold text-indigo-900">Estimated Useful Life</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Intelligent calculation based on description and cost, with manual override option
            </p>
            
            {/* Current Calculation Display */}
            {estimatedLifeCalculation && (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-background rounded-md border">
                  <div>
                    <div className="font-medium">
                      {estimatedLifeCalculation.years} years ({estimatedLifeCalculation.months} months)
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {getCalculationSummary(estimatedLifeCalculation)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-green-600">
                      {estimatedLifeCalculation.method === 'manual' ? 'Manual Override' : 
                        estimatedLifeCalculation.method === 'intelligent' ? 'AI Analysis' : 'Category-Based'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {estimatedLifeCalculation.confidence} confidence
                    </div>
                  </div>
                </div>
                
                {estimatedLifeCalculation.reasoning && (
                  <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                    <strong>Reasoning:</strong> {estimatedLifeCalculation.reasoning}
                  </div>
                )}
              </div>
            )}
            
            {/* Manual Override Input */}
            <div className="space-y-2">
              <Label htmlFor="estimatedLifeOverride">Manual Override (Optional)</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="estimatedLifeOverride"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="50"
                  value={estimatedLifeOverride}
                  onChange={(e) => handleOverrideChange(e.target.value)}
                  placeholder="Enter years (e.g., 5.5)"
                  className={overrideError ? "border-red-500" : ""}
                />
                <span className="text-sm text-muted-foreground">years</span>
              </div>
              {overrideError && (
                <div className="text-sm text-red-600">{overrideError}</div>
              )}
              {!overrideError && estimatedLifeOverride && (
                <div className="text-sm text-green-600">
                  ✓ Manual override will be used instead of intelligent calculation
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {item ? "Updating..." : "Adding..."}
                </>
              ) : (
                item ? "Update Item" : "Add Item"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
    
    <Dialog open={!!openAddLookup.type} onOpenChange={() => setOpenAddLookup({ type: null })}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add {openAddLookup.type === 'supplier' ? 'Supplier' : 'Fund Source'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Input placeholder="Name" value={newLookup.name} onChange={e => setNewLookup({ ...newLookup, name: e.target.value })} />
          <Input placeholder="Code (optional)" value={newLookup.code || ''} onChange={e => setNewLookup({ ...newLookup, code: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpenAddLookup({ type: null })}>Cancel</Button>
          <Button onClick={createLookup} disabled={!newLookup.name.trim()}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};


