import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Search, Plus, Check, Trash2, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { InventoryCustodianSlipReport } from "@/components/reports/InventoryCustodianSlipReport";
import { simpleInventoryService } from "@/services/simpleInventoryService";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { annexService } from "@/services/annexService";
import { AnnexCustodianSlip, AnnexICSPrintData, CreateCustodianSlipRequest } from "@/types/annex";
import { CustodianSelector } from "@/components/ui/custodian-selector";
import { DepartmentSelector } from "@/components/ui/department-selector";
import { ReceivedBySelector } from "@/components/ui/received-by-selector";
import { Custodian } from "@/services/custodianService";
import { LookupItem } from "@/services/lookupService";

interface CustodianSlip {
  id: string;
  slipNumber: string;
  custodianName: string;
  designation: string;
  office: string;
  items: {
    propertyNumber: string;
    description: string;
    quantity: number;
    unit: string;
    dateIssued: string;
  }[];
  dateIssued: string;
  issuedBy: string;
  receivedBy: string;
}

export const CustodianSlips = () => {
  const [selectedSlip, setSelectedSlip] = useState<CustodianSlip | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedInventoryItems, setSelectedInventoryItems] = useState<string[]>([]);
  const [inventorySearch, setInventorySearch] = useState("");
  const [selectedCustodian, setSelectedCustodian] = useState<Custodian | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<LookupItem | null>(null);

  // Handle custodian selection
  const handleCustodianSelect = (custodianName: string, custodianData?: Custodian) => {
    setFormData(prev => ({ ...prev, custodianName }));
    setSelectedCustodian(custodianData || null);
    
    // Auto-fill designation and office if custodian data is available
    if (custodianData) {
      setFormData(prev => ({
        ...prev,
        custodianName,
        designation: custodianData.position || prev.designation,
        office: custodianData.department_name || prev.office
      }));
    }
  };

  // Handle department selection
  const handleDepartmentSelect = (departmentName: string, departmentData?: LookupItem) => {
    setFormData(prev => ({ ...prev, office: departmentName }));
    setSelectedDepartment(departmentData || null);
  };

  // Use React Query for custodian slips
  const { data: slips = [], isLoading: loading, error } = useQuery({
    queryKey: ['custodian-slips'],
    queryFn: async () => {
      const { data, error } = await supabase.from('custodian_slips').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((r: any) => ({
        id: r.id,
        slipNumber: r.slip_number,
        custodianName: r.custodian_name,
        designation: r.designation,
        office: r.office,
        items: [],
        dateIssued: r.date_issued,
        issuedBy: r.issued_by,
        receivedBy: r.received_by,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      if (!navigator.onLine) return false;
      return failureCount < 2;
    },
  });

  // Use React Query for inventory items
  const { data: inventoryItems = [] } = useQuery({
    queryKey: ['inventory-for-slips'],
    queryFn: async () => {
      const response = await simpleInventoryService.getAll({ limit: 100 });
      return response.success ? response.data : [];
    },
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (!navigator.onLine) return false;
      return failureCount < 2;
    },
  });

  const [formData, setFormData] = useState<Partial<CustodianSlip>>({
    custodianName: "",
    designation: "",
    office: "",
    items: [{
      propertyNumber: "",
      description: "",
      quantity: 1,
      unit: "",
      dateIssued: ""
    }],
    dateIssued: "",
    issuedBy: "",
    receivedBy: ""
  });

  const handleCreateSlip = async () => {
    if (!formData.custodianName || !formData.dateIssued || !formData.issuedBy || !formData.receivedBy) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Resolve inventory item IDs from entered property numbers
    const enteredProps = (formData.items || [])
      .map(it => (it.propertyNumber || '').trim())
      .filter(Boolean);

    const inventoryItemIds: string[] = [];
    for (const pn of enteredProps) {
      const local = inventoryItems.find(i => i.propertyNumber === pn);
      if (local?.id) {
        inventoryItemIds.push(local.id);
        continue;
      }
      const { data: inv } = await supabase
        .from('inventory_items')
        .select('id')
        .eq('property_number', pn)
        .single();
      if (inv?.id) inventoryItemIds.push(inv.id);
    }

    if (inventoryItemIds.length === 0) {
      toast({ title: 'No items', description: 'Add at least one valid property number', variant: 'destructive' });
      return;
    }

    try {
      const req: CreateCustodianSlipRequest = {
        custodianName: formData.custodianName,
        designation: formData.designation || '',
        office: formData.office || '',
        dateIssued: formData.dateIssued!,
        issuedBy: formData.issuedBy!,
        receivedBy: formData.receivedBy!,
        inventoryItemIds
      };
      await annexService.createCustodianSlip(req);

      queryClient.invalidateQueries({ queryKey: ['custodian-slips'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-for-slips'] });

      setFormData({
        custodianName: "",
        designation: "",
        office: "",
        items: [{
          propertyNumber: "",
          description: "",
          quantity: 1,
          unit: "",
          dateIssued: ""
        }],
        dateIssued: "",
        issuedBy: "",
        receivedBy: ""
      });
      setSelectedCustodian(null);
      setSelectedDepartment(null);
      setIsCreating(false);
      toast({ title: 'Success', description: 'Custodian slip created successfully' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create custodian slip';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel('realtime:ics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custodian_slips' }, () => {
        queryClient.invalidateQueries({ queryKey: ['custodian-slips'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custodian_slip_items' }, () => {
        queryClient.invalidateQueries({ queryKey: ['custodian-slips'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Load items for a slip and open details view
  const openSlip = async (slip: CustodianSlip) => {
    const { data: items } = await supabase
      .from('custodian_slip_items')
      .select('*')
      .eq('slip_id', slip.id)
      .order('date_issued', { ascending: true });
    const withItems: CustodianSlip = {
      ...slip,
      items: (items || []).map((r: any) => ({
        propertyNumber: r.property_number,
        description: r.description,
        quantity: r.quantity,
        unit: r.unit,
        dateIssued: r.date_issued,
      })),
    };
    setSelectedSlip(withItems);
    // subscribe to items for live updates while open
    const channel = supabase
      .channel(`realtime:ics-items:${slip.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custodian_slip_items', filter: `slip_id=eq.${slip.id}` }, async () => {
        const { data: items2 } = await supabase
          .from('custodian_slip_items')
          .select('*')
          .eq('slip_id', slip.id)
          .order('date_issued', { ascending: true });
        setSelectedSlip(prev => prev ? { ...prev, items: (items2 || []).map((r: any) => ({
          propertyNumber: r.property_number,
          description: r.description,
          quantity: r.quantity,
          unit: r.unit,
          dateIssued: r.date_issued,
        })) } : prev);
      })
      .subscribe();
    // cleanup on close
    const off = () => supabase.removeChannel(channel);
    // attach to window so we can remove when closing
    (window as any).__icsCleanup = off;
  };

  const closeSlip = () => {
    if ((window as any).__icsCleanup) (window as any).__icsCleanup();
    setSelectedSlip(null);
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...(formData.items || []), {
        propertyNumber: "",
        description: "",
        quantity: 1,
        unit: "",
        dateIssued: ""
      }]
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updatedItems = [...(formData.items || [])];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setFormData({ ...formData, items: updatedItems });
  };

  const removeItem = (index: number) => {
    const updatedItems = formData.items?.filter((_, i) => i !== index);
    setFormData({ ...formData, items: updatedItems });
  };

  const handlePrint = async (slip: CustodianSlip) => {
    // load items for slip
    const { data: items } = await supabase
      .from('custodian_slip_items')
      .select('*')
      .eq('slip_id', slip.id)
      .order('date_issued', { ascending: true });
    const selected: CustodianSlip = {
      ...slip,
      items: (items || []).map((r: any) => ({
        propertyNumber: r.property_number,
        description: r.description,
        quantity: r.quantity,
        unit: r.unit,
        dateIssued: r.date_issued,
      })),
    };
    setSelectedSlip(selected);
    setTimeout(() => window.print(), 100);
  };

  const addSelectedInventoryItems = async () => {
    if (!selectedSlip || selectedInventoryItems.length === 0) {
      toast({ title: 'No items selected', description: 'Please select inventory items to add', variant: 'destructive' });
      return;
    }

    // Check if any selected items are already assigned to other custodians
    const { data: existingAssignments, error: checkError } = await supabase
      .from('inventory_items')
      .select('id, property_number, custodian, assignment_status')
      .in('id', selectedInventoryItems)
      .or('custodian.not.is.null,assignment_status.eq.Assigned');

    if (checkError) {
      toast({ title: 'Error checking assignments', description: checkError.message, variant: 'destructive' });
      return;
    }

    if (existingAssignments && existingAssignments.length > 0) {
      const assignedItems = existingAssignments.map(item => item.property_number).join(', ');
      toast({ 
        title: 'Items already assigned', 
        description: `The following items are already assigned to other custodians: ${assignedItems}`, 
        variant: 'destructive' 
      });
      return;
    }

    const itemsToAdd = selectedInventoryItems.map(itemId => {
      const item = inventoryItems.find(i => i.id === itemId);
      return {
        slip_id: selectedSlip.id,
        property_number: item?.propertyNumber || '',
        description: item?.description || '',
        quantity: 1,
        unit: item?.unitOfMeasure || 'pcs',
        date_issued: selectedSlip.dateIssued,
      };
    });

    // Start a transaction to update both tables
    const { error: itemsError } = await supabase.from('custodian_slip_items').insert(itemsToAdd);
    if (itemsError) {
      toast({ title: 'Items error', description: itemsError.message, variant: 'destructive' });
      return;
    }

    // Update inventory items to mark them as assigned to this custodian
    const { error: updateError } = await supabase
      .from('inventory_items')
      .update({ 
        custodian: selectedSlip.custodianName,
        custodian_position: selectedSlip.designation || '',
        assignment_status: 'Assigned',
        assigned_date: selectedSlip.dateIssued,
        updated_at: new Date().toISOString()
      })
      .in('id', selectedInventoryItems);

    if (updateError) {
      toast({ title: 'Error updating inventory', description: updateError.message, variant: 'destructive' });
      return;
    }
    
    setSelectedInventoryItems([]);
    toast({ title: 'Success', description: `${itemsToAdd.length} items assigned to ${selectedSlip.custodianName}` });
    
    // Refresh inventory items to show updated status
    queryClient.invalidateQueries({ queryKey: ['inventory-for-slips'] });
  };

  const toggleInventoryItem = (itemId: string) => {
    setSelectedInventoryItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleDeleteSlip = async (slipId: string) => {
    if (!confirm('Are you sure you want to delete this custodian slip? This will also release all assigned inventory items.')) return;
    
    try {
      // First, get the slip items to release them back to inventory
      const { data: slipItems, error: itemsError } = await supabase
        .from('custodian_slip_items')
        .select('property_number')
        .eq('slip_id', slipId);

      if (itemsError) {
        toast({ title: 'Error fetching slip items', description: itemsError.message, variant: 'destructive' });
        return;
      }

      // Release inventory items back to available status
      if (slipItems && slipItems.length > 0) {
        const propertyNumbers = slipItems.map(item => item.property_number);
        
        // Try to update inventory items, but don't fail if the fields don't exist
        const { error: releaseError } = await supabase
          .from('inventory_items')
          .update({ 
            custodian: null,
            custodian_position: null,
            assignment_status: 'Available',
            assigned_date: null,
            updated_at: new Date().toISOString()
          })
          .in('property_number', propertyNumbers);

        // If the full update fails, try a minimal update with just basic fields
        if (releaseError) {
          console.warn('Full inventory update failed, trying minimal update:', releaseError.message);
          
          const { error: minimalError } = await supabase
            .from('inventory_items')
            .update({ 
              updated_at: new Date().toISOString()
            })
            .in('property_number', propertyNumbers);
            
          if (minimalError) {
            console.warn('Could not update inventory items at all:', minimalError.message);
          }
        }
      }

      // Delete the custodian slip items first (foreign key constraint)
      const { error: deleteItemsError } = await supabase
        .from('custodian_slip_items')
        .delete()
        .eq('slip_id', slipId);

      if (deleteItemsError) {
        toast({ title: 'Error deleting slip items', description: deleteItemsError.message, variant: 'destructive' });
        return;
      }

      // Delete the custodian slip
      const { error: deleteSlipError } = await supabase
        .from('custodian_slips')
        .delete()
        .eq('id', slipId);

      if (deleteSlipError) {
        toast({ title: 'Error deleting slip', description: deleteSlipError.message, variant: 'destructive' });
        return;
      }

      toast({ title: 'Success', description: 'Custodian slip deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['custodian-slips'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-for-slips'] }); // Refresh inventory to show released items
    } catch (error) {
      console.error('Delete error:', error);
      toast({ 
        title: 'Error', 
        description: `Failed to delete custodian slip: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        variant: 'destructive' 
      });
    }
  };

  const filteredSlips = slips.filter(slip =>
    slip.slipNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    slip.custodianName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && slips.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading custodian slips...</span>
      </div>
    );
  }

  if (error && navigator.onLine) {
    return (
      <div className="text-center py-8">
        <Alert className="max-w-md mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error: {error.message}
          </AlertDescription>
        </Alert>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['custodian-slips'] })} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  // Show offline message if error and offline
  if (error && !navigator.onLine) {
    return (
      <div className="text-center py-8">
        <Alert className="max-w-md mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You're offline. Some features may not work until your connection is restored.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <p className="text-muted-foreground">Previously loaded custodian slips will appear when available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Inventory Custodian Slips</h1>
        <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create New Slip
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search custodian slips..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Create Form */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Custodian Slip</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dateIssued">Date Issued *</Label>
                <Input
                  id="dateIssued"
                  type="date"
                  value={formData.dateIssued}
                  onChange={(e) => setFormData({...formData, dateIssued: e.target.value})}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  ICS number will be auto-generated (format: ICS-YYYY-MM-NNNN)
                </p>
              </div>
              <div>
                <Label htmlFor="issuedBy">Issued By *</Label>
                <Input
                  id="issuedBy"
                  value={formData.issuedBy}
                  onChange={(e) => setFormData({...formData, issuedBy: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <CustodianSelector
                  value={formData.custodianName || ""}
                  onChange={handleCustodianSelect}
                  placeholder="Search for custodian..."
                  label="Custodian Name"
                  required={true}
                />
              </div>
              <div>
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  value={formData.designation}
                  onChange={(e) => setFormData({...formData, designation: e.target.value})}
                />
              </div>
            </div>

            <div>
              <DepartmentSelector
                value={formData.office || ""}
                onChange={handleDepartmentSelect}
                placeholder="Search for department..."
                label="Office/Department"
                required={false}
              />
            </div>

            {/* Items */}
            <div>
              <Label>Items from Inventory</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="issuedBy">Issued By</Label>
                <Input
                  id="issuedBy"
                  value={formData.issuedBy}
                  onChange={(e) => setFormData({...formData, issuedBy: e.target.value})}
                />
              </div>
              <div>
                <ReceivedBySelector
                  value={formData.receivedBy || ""}
                  onChange={(value) => setFormData({...formData, receivedBy: value})}
                  placeholder="Search for custodian or enter manually..."
                  label="Received By"
                  required={false}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreateSlip}>Create Slip</Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Details view */}
      {selectedSlip ? (
        <Card>
          <CardHeader>
            <CardTitle>Custodian Slip · {selectedSlip.slipNumber}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <div className="text-sm">
                <div><strong>Custodian:</strong> {selectedSlip.custodianName}</div>
                <div><strong>Designation:</strong> {selectedSlip.designation}</div>
                <div><strong>Office:</strong> {selectedSlip.office}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={closeSlip}>Back</Button>
                <Button onClick={() => handlePrint(selectedSlip)}><Printer className="h-4 w-4 mr-2" /> Print</Button>
                <Button variant="destructive" onClick={() => handleDeleteSlip(selectedSlip.id)}><Trash2 className="h-4 w-4 mr-2" /> Delete</Button>
              </div>
            </div>

            <div className="border rounded">
              <div className="p-2 font-medium">Select Items from Inventory</div>
              <div className="p-2 border-t">
                <div className="mb-2">
                  <Input 
                    placeholder="Search inventory items..." 
                    value={inventorySearch} 
                    onChange={e => setInventorySearch(e.target.value)} 
                    className="mb-2"
                  />
                  <Button 
                    onClick={addSelectedInventoryItems} 
                    disabled={selectedInventoryItems.length === 0}
                    className="w-full"
                  >
                    Add Selected Items ({selectedInventoryItems.length})
                  </Button>
                </div>
                <div className="max-h-48 overflow-auto border rounded">
                  {inventoryItems
                    .filter(item => 
                      (item.propertyNumber?.toLowerCase().includes(inventorySearch.toLowerCase()) ||
                      item.description?.toLowerCase().includes(inventorySearch.toLowerCase()))
                    )
                    .map(item => (
                      <div 
                        key={item.id} 
                        className={`p-2 border-b cursor-pointer hover:bg-secondary flex items-center justify-between ${
                          selectedInventoryItems.includes(item.id) ? 'bg-secondary' : ''
                        }`}
                        onClick={() => toggleInventoryItem(item.id)}
                      >
                        <div className="flex-1">
                          <div className="font-medium">{item.propertyNumber}</div>
                          <div className="text-sm text-muted-foreground">{item.description}</div>
                          <div className="text-xs text-green-600">Available</div>
                        </div>
                        {selectedInventoryItems.includes(item.id) && (
                          <Check className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                    ))}
                  {inventoryItems.length === 0 && (
                    <div className="p-4 text-center text-muted-foreground">
                      No inventory items found.
                    </div>
                  )}
                </div>
              </div>
              <div className="max-h-72 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="p-2">Property Number</th>
                      <th className="p-2">Description</th>
                      <th className="p-2">Qty</th>
                      <th className="p-2">Unit</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSlip.items.map((it, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{it.propertyNumber}</td>
                        <td className="p-2">{it.description}</td>
                        <td className="p-2">{it.quantity}</td>
                        <td className="p-2">{it.unit}</td>
                        <td className="p-2">
                          <span className="px-2 py-1 bg-success/20 text-success text-xs rounded">
                            Assigned to {selectedSlip.custodianName}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Show assigned items from other custodians */}
              <div className="mt-4">
                <h4 className="font-medium mb-2">Items Assigned to Other Custodians</h4>
                <div className="max-h-32 overflow-auto border rounded">
                  {inventoryItems
                    .filter(item => item.assignmentStatus === 'Assigned')
                    .slice(0, 5) // Show only first 5 to avoid clutter
                    .map(item => (
                      <div key={item.id} className="p-2 border-b text-sm">
                        <div className="font-medium">{item.propertyNumber}</div>
                        <div className="text-muted-foreground">{item.description}</div>
                        <div className="text-xs text-destructive">Status: {item.assignmentStatus}</div>
                      </div>
                    ))}
                  {inventoryItems.filter(item => item.assignmentStatus === 'Assigned').length === 0 && (
                    <div className="p-2 text-center text-muted-foreground text-sm">
                      No items assigned to other custodians
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSlips.map((slip) => (
          <Card key={slip.id}>
            <CardHeader>
              <CardTitle className="text-lg">{slip.slipNumber}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">{slip.custodianName}</p>
              <div className="space-y-1 text-xs">
                <p><strong>Designation:</strong> {slip.designation}</p>
                <p><strong>Office:</strong> {slip.office}</p>
                <p><strong>Items:</strong> {slip.items.length}</p>
                <p><strong>Date:</strong> {slip.dateIssued}</p>
              </div>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <Button size="sm" variant="outline" onClick={() => openSlip(slip)}>Open</Button>
                  <Button size="sm" onClick={() => handlePrint(slip)}><Printer className="h-4 w-4 mr-2" /> Print</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDeleteSlip(slip.id)}><Trash2 className="h-4 w-4 mr-2" /> Delete</Button>
                </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}

      {/* Print Template */}
      {selectedSlip && (
        <div className="print-only">
          <div ref={printRef}>
            <InventoryCustodianSlipReport
              data={{
                slipNumber: selectedSlip.slipNumber,
                entityName: selectedSlip.custodianName, // Entity name is custodian name for ICS
                fundCluster: "General Fund", // Default fund cluster
                custodianName: selectedSlip.custodianName,
                designation: selectedSlip.designation,
                office: selectedSlip.office,
                dateIssued: selectedSlip.dateIssued,
                issuedBy: selectedSlip.issuedBy,
                receivedBy: selectedSlip.receivedBy,
                items: selectedSlip.items.map(item => ({
                  itemNumber: '1', // Default item number
                  propertyNumber: item.propertyNumber,
                  description: item.description,
                  quantity: item.quantity,
                  unit: item.unit,
                  unitCost: 0, // Default values for legacy form
                  totalCost: 0,
                  amount: 0,
                  estimatedUsefulLife: '5 years',
                  dateIssued: item.dateIssued
                })),
                totalAmount: 0 // Default total amount for legacy form
              }}
            />
          </div>
        </div>
      )}

      <style>{`
        @media print {
          .print-only { display: block !important; }
          body * { visibility: hidden; }
          .print-only, .print-only * { visibility: visible; }
          .print-only { position: absolute; left: 0; top: 0; }
        }
        .print-only { display: none; }
      `}</style>
    </div>
  );
};