import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Loader2, AlertCircle, Printer, Eye, Trash2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";
import { annexService } from "@/services/annexService";
import { simpleInventoryService } from "@/services/simpleInventoryService";
import { InventoryCustodianSlipReport } from "@/components/reports/InventoryCustodianSlipReport";
import { CustodianSelector } from "@/components/ui/custodian-selector";
import { DepartmentSelector } from "@/components/ui/department-selector";
import { ReceivedBySelector } from "@/components/ui/received-by-selector";
import { Custodian } from "@/services/custodianService";
import { LookupItem } from "@/services/lookupService";
import { 
  AnnexCustodianSlip, 
  AnnexICSPrintData, 
  CreateCustodianSlipRequest,
  AnnexInventoryItem 
} from "@/types/annex";
import { getNewestRecordId, isWithinRecentThreshold } from "@/lib/utils";

export const CustodianSlipsAnnex = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<AnnexCustodianSlip | null>(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [selectedInventoryItems, setSelectedInventoryItems] = useState<string[]>([]);
  const [newSlipForm, setNewSlipForm] = useState({
    custodianName: "",
    designation: "",
    office: "",
    dateIssued: new Date().toISOString().split('T')[0],
    issuedBy: "",
    receivedBy: ""
  });
  const [selectedCustodian, setSelectedCustodian] = useState<Custodian | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<LookupItem | null>(null);
  const [confirmingSlip, setConfirmingSlip] = useState<string | null>(null);
  const isCreatingSlipRef = useRef(false);

  // Handle custodian selection
  const handleCustodianSelect = (custodianName: string, custodianData?: Custodian) => {
    setNewSlipForm(prev => ({ ...prev, custodianName }));
    setSelectedCustodian(custodianData || null);
    
    // Auto-fill designation and office if custodian data is available
    if (custodianData) {
      setNewSlipForm(prev => ({
        ...prev,
        custodianName,
        designation: custodianData.position || prev.designation,
        office: custodianData.department_name || prev.office
      }));
    }
  };

  // Handle department selection
  const handleDepartmentSelect = (departmentName: string, departmentData?: LookupItem) => {
    setNewSlipForm(prev => ({ ...prev, office: departmentName }));
    setSelectedDepartment(departmentData || null);
  };
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const printRef = useRef<HTMLDivElement>(null);

  // Real-time subscription for live updates
  useEffect(() => {
    const channel = supabase
      .channel('realtime:custodian-slips-annex')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custodian_slips' }, () => {
        console.log('[Realtime] Custodian slip changed, refreshing...');
        queryClient.invalidateQueries({ queryKey: ['annex-custodian-slips'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custodian_slip_items' }, () => {
        console.log('[Realtime] Custodian slip items changed, refreshing...');
        queryClient.invalidateQueries({ queryKey: ['annex-custodian-slips'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => {
        console.log('[Realtime] Inventory items changed, refreshing available items...');
        queryClient.invalidateQueries({ queryKey: ['available-inventory-for-slips'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Fetch custodian slips
  const { data: slips = [], isLoading: loading, error } = useQuery({
    queryKey: ['annex-custodian-slips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custodian_slips')
        .select(`
          *,
          custodian_slip_items(
            *,
            inventory_items (
              estimated_useful_life,
              sub_category,
              category
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return data.map(slip => ({
        id: slip.id,
        slipNumber: slip.slip_number,
        custodianName: slip.custodian_name,
        designation: slip.designation,
        office: slip.office,
        dateIssued: slip.date_issued,
        issuedBy: slip.issued_by,
        receivedBy: slip.received_by,
        slipStatus: slip.slip_status,
        items: slip.custodian_slip_items.map(item => ({
          id: item.id,
          slipId: item.slip_id,
          inventoryItemId: item.inventory_item_id,
          propertyNumber: item.property_number,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitCost: item.unit_cost || 0,
          totalCost: item.total_cost || 0,
          amount: item.amount || item.total_cost || 0,
          itemNumber: item.item_number || '',
          estimatedUsefulLife: item.estimated_useful_life 
            || (item.inventory_items && item.inventory_items.estimated_useful_life) 
            || '',
          dateIssued: item.date_issued,
          propertyCardEntryId: item.property_card_entry_id,
          createdAt: item.created_at,
          updatedAt: item.updated_at
        })),
        createdAt: slip.created_at,
        updatedAt: slip.updated_at
      })) as AnnexCustodianSlip[];
    },
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (!navigator.onLine) return false;
      return failureCount < 2;
    },
  });

  // Fetch available inventory items for creating custodian slips
  const { data: inventoryItems = [] } = useQuery({
    queryKey: ['available-inventory-for-slips'],
    queryFn: async () => {
      // Use the database view for available items that have property cards only
      const { data, error } = await supabase
        .from('available_inventory_items_with_property_cards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching available inventory:', error);
        // Fallback to manual filtering if view doesn't exist yet
        const response = await simpleInventoryService.getAll();
        if (response.success) {
          // Filter items that have property cards and are available
          const itemsWithPropertyCards = [];
          for (const item of response.data) {
            // Check if item has a property card
            const { data: propertyCard } = await supabase
              .from('property_cards')
              .select('id')
              .eq('inventory_item_id', item.id)
              .single();
            
            if (propertyCard) {
              // Check if item is available for assignment
              const isServiceable = item.condition === 'Serviceable';
              const isActive = item.status === 'Active';
              const hasNoCustodian = !item.custodian || item.custodian === '';
              const isAvailable = !item.assignmentStatus || item.assignmentStatus === 'Available';
              const isNotAssigned = item.assignmentStatus !== 'Assigned';
              
              if (isServiceable && isActive && hasNoCustodian && isAvailable && isNotAssigned) {
                itemsWithPropertyCards.push(item);
              }
            }
          }
          return itemsWithPropertyCards;
        }
        return [];
      }

      return data.map(item => ({
        id: item.id,
        propertyNumber: item.property_number,
        description: item.description,
        brand: item.brand,
        model: item.model,
        serialNumber: item.serial_number,
        unitOfMeasure: item.unit_of_measure,
        quantity: item.quantity,
        unitCost: item.unit_cost,
        totalCost: item.total_cost,
        dateAcquired: item.date_acquired,
        supplier: item.supplier,
          condition: item.condition,
        location: item.location,
        fundSource: item.fund_source_id,
        remarks: item.remarks,
        lastInventoryDate: item.last_inventory_date,
        semiExpandableCategory: item.semi_expandable_category,
        status: item.status,
        assignmentStatus: item.assignment_status,
        assignedDate: item.assigned_date,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
    },
    enabled: isCreating,
    staleTime: 2 * 60 * 1000,
  });

  // Create custodian slip mutation
  const createSlipMutation = useMutation({
    mutationKey: ['create-custodian-slip'],
    mutationFn: async (request: CreateCustodianSlipRequest) => {
      console.log('[mutationFn] Executing - calling annexService.createCustodianSlip');
      return await annexService.createCustodianSlip(request);
    },
    retry: false, // Don't retry on error
    onSuccess: (data) => {
      // Reset the ref flag
      isCreatingSlipRef.current = false;
      
      // Check if we got a single slip or multiple slips
      const slipCount = Array.isArray(data) ? data.length : 1;
      
      if (slipCount > 1) {
        toast({ 
          title: "Success", 
          description: `${slipCount} custodian slips created (separated by value)! ${selectedInventoryItems.length} item(s) assigned to ${newSlipForm.custodianName}` 
        });
      } else {
        toast({ 
          title: "Success", 
          description: `Custodian slip created successfully! ${selectedInventoryItems.length} item(s) assigned to ${newSlipForm.custodianName}` 
        });
      }
      
      // Invalidate and refetch all related queries
      queryClient.invalidateQueries({ queryKey: ['annex-custodian-slips'] });
      queryClient.invalidateQueries({ queryKey: ['available-inventory-for-slips'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['custodian-summaries'] });
      queryClient.invalidateQueries({ queryKey: ['custodian-summary'] });
      queryClient.invalidateQueries({ queryKey: ['custodian-item-history'] });
      queryClient.invalidateQueries({ queryKey: ['custodian-current-items'] });
      
      // Force refetch to ensure UI updates immediately
      queryClient.refetchQueries({ queryKey: ['annex-custodian-slips'] });
      
      setIsCreating(false);
      setNewSlipForm({
        custodianName: "",
        designation: "",
        office: "",
        dateIssued: new Date().toISOString().split('T')[0],
        issuedBy: "",
        receivedBy: ""
      });
      setSelectedCustodian(null);
      setSelectedDepartment(null);
      setSelectedInventoryItems([]);
    },
    onError: (error: Error) => {
      // Reset the ref flag
      isCreatingSlipRef.current = false;
      
      console.log('Custodian slip creation error:', error.message);
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });

      // Refresh data sources so stale selections don't linger
      queryClient.invalidateQueries({ queryKey: ['annex-custodian-slips'] });
      queryClient.invalidateQueries({ queryKey: ['available-inventory-for-slips'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
    },
  });

  // Delete custodian slip mutation - using direct deletion only
  const deleteSlipMutation = useMutation({
    mutationFn: async (slipId: string) => {
      console.log('Attempting to delete custodian slip:', slipId);
      
      // Check if slip exists and get its status
      const { data: slipData, error: slipError } = await supabase
        .from('custodian_slips')
        .select('slip_status, slip_number')
        .eq('id', slipId)
        .single();

      if (slipError) {
        throw new Error(`Failed to get slip data: ${slipError.message}`);
      }

      if (!slipData) {
        throw new Error('Custodian slip not found');
      }

      if (slipData.slip_status !== 'Draft') {
        const confirmed = window.confirm(
          `ICS ${slipData.slip_number || ''} is already ${slipData.slip_status}. Deleting it will release all items and remove related entries. Continue?`
        );

        if (!confirmed) {
          return { cancelled: true };
        }
      }

      // Manual deletion process
      // 1. Get slip items to release inventory
      const { data: slipItems, error: itemsError } = await supabase
        .from('custodian_slip_items')
        .select('inventory_item_id')
        .eq('slip_id', slipId);

      if (itemsError) {
        throw new Error(`Failed to get slip items: ${itemsError.message}`);
      }

      console.log('Found slip items:', slipItems);

      // 2. Release inventory items back to available status
      if (slipItems && slipItems.length > 0) {
        const inventoryItemIds = slipItems.map(item => item.inventory_item_id);
        
        const { error: releaseError } = await supabase
          .from('inventory_items')
          .update({
            custodian: null,
            custodian_position: null,
            assignment_status: 'Available',
            assigned_date: null,
            ics_number: null,
            ics_date: null,
            updated_at: new Date().toISOString()
          })
          .in('id', inventoryItemIds);

        if (releaseError) {
          console.warn('Could not update inventory items:', releaseError.message);
        } else {
          console.log('Successfully released inventory items');
        }
      }

      // 3. Delete property card entries that reference this slip (should only exist for issued slips)
      const { error: deletePropertyCardEntriesError } = await supabase
        .from('property_card_entries')
        .delete()
        .eq('related_slip_id', slipId);

      if (deletePropertyCardEntriesError) {
        console.warn('Could not delete property card entries:', deletePropertyCardEntriesError.message);
        // Continue with deletion even if this fails
      } else {
        console.log('Successfully deleted property card entries');
      }

      // 4. Delete custodian slip items
      const { error: deleteItemsError } = await supabase
        .from('custodian_slip_items')
        .delete()
        .eq('slip_id', slipId);

      if (deleteItemsError) {
        throw new Error(`Failed to delete slip items: ${deleteItemsError.message}`);
      }

      // 5. Delete the custodian slip
      const { error: deleteSlipError } = await supabase
        .from('custodian_slips')
        .delete()
        .eq('id', slipId);

      if (deleteSlipError) {
        console.error('Delete slip error:', deleteSlipError);
        throw new Error(`Failed to delete custodian slip: ${deleteSlipError.message} (Code: ${deleteSlipError.code})`);
      }

      console.log('Successfully deleted custodian slip');
      return { cancelled: false };
    },
    onSuccess: (result) => {
      if (result?.cancelled) {
        toast({
          title: "Cancelled",
          description: "Deletion aborted",
          variant: "default"
        });
        return;
      }

      toast({ title: "Success", description: "Custodian slip deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['annex-custodian-slips'] });
      queryClient.invalidateQueries({ queryKey: ['available-inventory-for-slips'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] }); // Refresh inventory
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  // Confirm/Officialize slip mutation
  const confirmSlipMutation = useMutation({
    mutationFn: async (slipId: string) => {
      // First, get the slip details to update inventory items
      const { data: slip, error: slipError } = await supabase
        .from('custodian_slips')
        .select(`
          *,
          custodian_slip_items(*)
        `)
        .eq('id', slipId)
        .single();

      if (slipError || !slip) {
        throw new Error(`Failed to get slip details: ${slipError?.message}`);
      }

      // Update slip status to Issued
      const { error: updateError } = await supabase
        .from('custodian_slips')
        .update({ 
          slip_status: 'Issued',
          updated_at: new Date().toISOString()
        })
        .eq('id', slipId);

      if (updateError) {
        throw new Error(`Failed to confirm slip: ${updateError.message}`);
      }

      // Now update inventory items to mark them as assigned
      if (slip.custodian_slip_items && slip.custodian_slip_items.length > 0) {
        const inventoryItemIds = slip.custodian_slip_items.map(item => item.inventory_item_id);
        
        const { error: inventoryError } = await supabase
          .from('inventory_items')
          .update({
            custodian: slip.custodian_name,
            custodian_position: slip.designation,
            assignment_status: 'Assigned',
            assigned_date: slip.date_issued,
            updated_at: new Date().toISOString()
          })
          .in('id', inventoryItemIds);

        if (inventoryError) {
          console.error('Failed to update inventory items:', inventoryError);
          // Don't throw error here - slip is already confirmed, just log the issue
        } else {
          console.log(`Successfully assigned ${inventoryItemIds.length} inventory items to ${slip.custodian_name}`);
        }
      }
    },
    onSuccess: () => {
      toast({ 
        title: "Success", 
        description: "Custodian slip has been officially confirmed and cannot be deleted" 
      });
      queryClient.invalidateQueries({ queryKey: ['annex-custodian-slips'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] }); // Refresh inventory
      queryClient.invalidateQueries({ queryKey: ['available-inventory-for-slips'] }); // Refresh available items
      queryClient.invalidateQueries({ queryKey: ['custodian-summaries'] }); // Refresh custodian summaries
      setConfirmingSlip(null);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const handleCreateSlip = async () => {
    // Prevent multiple submissions with ref-based check (more reliable than state)
    console.log('[handleCreateSlip] Called. Ref:', isCreatingSlipRef.current, 'isPending:', createSlipMutation.isPending);
    if (isCreatingSlipRef.current || createSlipMutation.isPending) {
      console.log('[handleCreateSlip] BLOCKED - Creation already in progress, ignoring duplicate call');
      return;
    }

    if (!newSlipForm.custodianName || !newSlipForm.designation || !newSlipForm.office || 
        !newSlipForm.issuedBy || !newSlipForm.receivedBy) {
      toast({ 
        title: "Validation Error", 
        description: "Please fill in all required fields", 
        variant: "destructive" 
      });
      return;
    }

    if (selectedInventoryItems.length === 0) {
      toast({ 
        title: "Validation Error", 
        description: "Please select at least one inventory item", 
        variant: "destructive" 
      });
      return;
    }

    // Set the ref flag immediately to prevent any racing double-calls
    isCreatingSlipRef.current = true;

    console.log('[handleCreateSlip] Creating custodian slip with items:', selectedInventoryItems);
    console.log('[handleCreateSlip] About to call mutate()');
    
    createSlipMutation.mutate({
      custodianName: newSlipForm.custodianName,
      designation: newSlipForm.designation,
      office: newSlipForm.office,
      dateIssued: newSlipForm.dateIssued,
      issuedBy: newSlipForm.issuedBy,
      receivedBy: newSlipForm.receivedBy,
      inventoryItemIds: selectedInventoryItems
    });
    
    console.log('[handleCreateSlip] mutate() called, returning from handler');
  };

  const handleViewSlip = async (slip: AnnexCustodianSlip) => {
    try {
      const slipWithItems = await annexService.getCustodianSlipWithItems(slip.id);
      if (slipWithItems) {
        setSelectedSlip(slipWithItems);
      }
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to load custodian slip details", 
        variant: "destructive" 
      });
    }
  };

  const handlePrintSlip = async (slip: AnnexCustodianSlip) => {
    try {
      const slipWithItems = await annexService.getCustodianSlipWithItems(slip.id);
      if (slipWithItems) {
        setSelectedSlip(slipWithItems);
        setShowPrintDialog(true);
      }
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to load custodian slip for printing", 
        variant: "destructive" 
      });
    }
  };

  const handleDeleteSlip = (slipId: string) => {
    if (confirm("Are you sure you want to delete this custodian slip? This will release all assigned inventory items.")) {
      deleteSlipMutation.mutate(slipId);
    }
  };

  const handleConfirmSlip = (slipId: string) => {
    if (confirm("Are you sure you want to officially confirm this custodian slip? Once confirmed, it cannot be deleted and will be marked as an official document.")) {
      confirmSlipMutation.mutate(slipId);
    }
  };

  const getPrintData = (slip: AnnexCustodianSlip): AnnexICSPrintData => {
    const totalAmount = slip.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    
    return {
      slipNumber: slip.slipNumber,
      entityName: "PROVINCIAL GOVERNMENT OF APAYAO", // Fixed entity name for ICS print
      fundCluster: "General Fund", // TODO: Get from fund source when available
      custodianName: slip.custodianName,
      designation: slip.designation,
      office: slip.office,
      dateIssued: slip.dateIssued,
      issuedBy: slip.issuedBy,
      receivedBy: slip.receivedBy,
      items: slip.items.map(item => ({
        // Per requirement: Item No. in ICS print should be the property's number
        itemNumber: item.propertyNumber,
        propertyNumber: item.propertyNumber,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitCost: item.unitCost,
        totalCost: item.totalCost,
        amount: item.amount,
        estimatedUsefulLife: item.estimatedUsefulLife,
        dateIssued: item.dateIssued
      })),
      totalAmount
    };
  };

  const handleInventoryItemToggle = (itemId: string) => {
    setSelectedInventoryItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const categorizeSlip = (slip: AnnexCustodianSlip): "high" | "low" => {
    const normalizedNumber = (slip.slipNumber || "").toUpperCase();
    if (normalizedNumber.includes("SPHV")) return "high";
    if (normalizedNumber.includes("SPLV")) return "low";
    const hasHighValueItem = slip.items.some((item) => Number(item.amount ?? item.totalCost ?? 0) > 5000);
    return hasHighValueItem ? "high" : "low";
  };

  const filteredSlips = slips.filter(slip =>
    slip.slipNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    slip.custodianName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    slip.office.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const { highValueSlips, lowValueSlips } = useMemo(() => {
    const groups = {
      highValueSlips: [] as AnnexCustodianSlip[],
      lowValueSlips: [] as AnnexCustodianSlip[],
    };
    filteredSlips.forEach((slip) => {
      if (categorizeSlip(slip) === "high") {
        groups.highValueSlips.push(slip);
      } else {
        groups.lowValueSlips.push(slip);
      }
    });
    return groups;
  }, [filteredSlips]);

  const newestSlipId = useMemo(() => getNewestRecordId(slips), [slips]);
  const isRecentlyAddedSlip = (slip: AnnexCustodianSlip) =>
    newestSlipId === slip.id && isWithinRecentThreshold(slip.createdAt);

  const renderSlipGrid = (slipList: AnnexCustodianSlip[]) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          Loading custodian slips…
        </div>
      );
    }

    if (slipList.length === 0) {
      return (
        <div className="rounded-md border border-dashed py-10 text-center text-muted-foreground">
          No custodian slips found for this value category.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {slipList.map((slip) => (
          <Card key={slip.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg font-mono">{slip.slipNumber}</CardTitle>
                  {isRecentlyAddedSlip(slip) && (
                    <Badge variant="default" className="bg-emerald-600 text-white">
                      Recently Added
                    </Badge>
                  )}
                </div>
                <Badge 
                  variant={slip.slipStatus === 'Issued' ? 'default' : 'secondary'}
                  className="ml-2"
                >
                  {slip.slipStatus || 'Draft'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Property Numbers:</p>
                  <div className="flex flex-wrap gap-1">
                    {slip.items.map((item, idx) => (
                      <Badge key={item.id || idx} variant="outline" className="font-mono text-xs">
                        {item.propertyNumber}
                      </Badge>
                    ))}
                  </div>
                  {slip.items.length === 0 && (
                    <p className="text-xs text-muted-foreground">No items</p>
                  )}
                </div>
                
                <div className="flex gap-2 pt-2 border-t">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleViewSlip(slip)}
                    className="flex items-center gap-1 flex-1"
                  >
                    <Eye className="h-3 w-3" />
                    View
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handlePrintSlip(slip)}
                    className="flex items-center gap-1 flex-1"
                  >
                    <Printer className="h-3 w-3" />
                    Print
                  </Button>
                  
                  {(slip.slipStatus === 'Draft' || !slip.slipStatus) && (
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={() => handleConfirmSlip(slip.id)}
                      className="flex items-center gap-1 bg-green-600 hover:bg-green-700 flex-1"
                      disabled={confirmSlipMutation.isPending}
                      title="Confirm this slip as official (cannot be deleted after confirmation)"
                    >
                      {confirmSlipMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <CheckCircle className="h-3 w-3" />
                      )}
                      Confirm
                    </Button>
                  )}
                  
                  {(!slip.slipStatus || ['Draft', 'Issued'].includes(slip.slipStatus)) && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDeleteSlip(slip.id)}
                      className="flex items-center gap-1 text-red-600 hover:text-red-700"
                      disabled={deleteSlipMutation.isPending}
                      title={slip.slipStatus === 'Issued' 
                        ? 'Delete this issued custodian slip (temporary override)'
                        : 'Delete this draft custodian slip'}
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const slipTabDefaultValue = highValueSlips.length ? "high-value" : "low-value";

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
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['annex-custodian-slips'] })} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

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
        <h1 className="text-3xl font-bold text-foreground">Inventory Custodian Slips (ICS)</h1>
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

      <Card>
        <CardHeader>
          <CardTitle>Custodian Slips by Value Category</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs key={slipTabDefaultValue} defaultValue={slipTabDefaultValue} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="high-value" className="flex items-center gap-2">
                <span className="font-semibold">High Value (SPHV)</span>
                <Badge variant="secondary" className="ml-auto">
                  {highValueSlips.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="low-value" className="flex items-center gap-2">
                <span className="font-semibold">Low Value (SPLV)</span>
                <Badge variant="secondary" className="ml-auto">
                  {lowValueSlips.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="high-value" className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Items above ₱5,000 are issued through SPHV slips.
              </p>
              {renderSlipGrid(highValueSlips)}
            </TabsContent>
            <TabsContent value="low-value" className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Items ₱5,000 or less are issued through SPLV slips.
              </p>
              {renderSlipGrid(lowValueSlips)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {filteredSlips.length === 0 && !loading && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No custodian slips found.</p>
          <Button onClick={() => setIsCreating(true)} className="mt-4">
            Create your first custodian slip
          </Button>
        </div>
      )}

      {/* Create Custodian Slip Dialog */}
      <Dialog open={isCreating} onOpenChange={(open) => {
        setIsCreating(open);
        if (!open) {
          // Reset ref flag when dialog closes
          isCreatingSlipRef.current = false;
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Inventory Custodian Slip</DialogTitle>
            <DialogDescription>
              Create a new ICS by selecting inventory items and assigning them to a custodian
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <CustodianSelector
                  value={newSlipForm.custodianName}
                  onChange={handleCustodianSelect}
                  placeholder="Search for custodian..."
                  label="Custodian Name"
                  required={true}
                />
              </div>
              <div>
                <Label htmlFor="designation">Designation *</Label>
                <Input
                  id="designation"
                  value={newSlipForm.designation}
                  onChange={(e) => setNewSlipForm(prev => ({ ...prev, designation: e.target.value }))}
                  placeholder="Enter designation"
                />
              </div>
              <div>
                <DepartmentSelector
                  value={newSlipForm.office}
                  onChange={handleDepartmentSelect}
                  placeholder="Search for department..."
                  label="Office/Department"
                  required={true}
                />
              </div>
              <div>
                <Label htmlFor="dateIssued">Date Issued *</Label>
                <Input
                  id="dateIssued"
                  type="date"
                  value={newSlipForm.dateIssued}
                  onChange={(e) => setNewSlipForm(prev => ({ ...prev, dateIssued: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="issuedBy">Issued By *</Label>
                <Input
                  id="issuedBy"
                  value={newSlipForm.issuedBy}
                  onChange={(e) => setNewSlipForm(prev => ({ ...prev, issuedBy: e.target.value }))}
                  placeholder="Enter issuer name"
                />
              </div>
              <div>
                <ReceivedBySelector
                  value={newSlipForm.receivedBy}
                  onChange={(value) => setNewSlipForm(prev => ({ ...prev, receivedBy: value }))}
                  placeholder="Search for custodian or enter manually..."
                  label="Received By"
                  required={true}
                />
              </div>
            </div>

            <div>
              <Label>Select Inventory Items *</Label>
              <div className="border rounded-md max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead>Property Number</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Total Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No available inventory items found. All items may be assigned to custodians or marked as unserviceable.
                        </TableCell>
                      </TableRow>
                    ) : (
                      inventoryItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedInventoryItems.includes(item.id)}
                              onCheckedChange={() => handleInventoryItemToggle(item.id)}
                            />
                          </TableCell>
                          <TableCell>{item.propertyNumber}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>
                            <Badge variant={item.condition === 'Serviceable' ? 'default' : 'destructive'}>
                              {item.condition}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.unitOfMeasure}</TableCell>
                          <TableCell>₱{item.unitCost?.toFixed(2) || '0.00'}</TableCell>
                          <TableCell>₱{item.totalCost?.toFixed(2) || '0.00'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {inventoryItems.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p>No items available for assignment.</p>
                  <p className="text-xs mt-1">
                    Items must be in 'Serviceable' condition and not already assigned to be available.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">
                  Selected: {selectedInventoryItems.length} items • Available: {inventoryItems.length} items
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateSlip}
                disabled={createSlipMutation.isPending || isCreatingSlipRef.current}
              >
                {(createSlipMutation.isPending || isCreatingSlipRef.current) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Custodian Slip
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Dialog */}
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Print Custodian Slip</DialogTitle>
            <DialogDescription>
              Inventory Custodian Slip (ICS) - Ready for printing
            </DialogDescription>
          </DialogHeader>
          
          <div ref={printRef}>
            {selectedSlip && (
              <InventoryCustodianSlipReport data={getPrintData(selectedSlip)} />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* View Slip Dialog */}
      <Dialog open={!!selectedSlip && !showPrintDialog} onOpenChange={() => setSelectedSlip(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Custodian Slip Details</DialogTitle>
            <DialogDescription>
              {selectedSlip?.slipNumber} - {selectedSlip?.custodianName}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSlip && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Slip Number</Label>
                  <p className="text-sm">{selectedSlip.slipNumber}</p>
                </div>
                <div>
                  <Label>Custodian Name</Label>
                  <p className="text-sm">{selectedSlip.custodianName}</p>
                </div>
                <div>
                  <Label>Designation</Label>
                  <p className="text-sm">{selectedSlip.designation}</p>
                </div>
                <div>
                  <Label>Office</Label>
                  <p className="text-sm">{selectedSlip.office}</p>
                </div>
                <div>
                  <Label>Date Issued</Label>
                  <p className="text-sm">{selectedSlip.dateIssued}</p>
                </div>
                <div>
                  <Label>Issued By</Label>
                  <p className="text-sm">{selectedSlip.issuedBy}</p>
                </div>
              </div>

              {selectedSlip.items && selectedSlip.items.length > 0 && (
                <div>
                  <Label>Items</Label>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item No.</TableHead>
                          <TableHead>Property Number</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead>Unit Cost</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Est. Life</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedSlip.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.itemNumber}</TableCell>
                            <TableCell>{item.propertyNumber}</TableCell>
                            <TableCell>{item.description}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{item.unit}</TableCell>
                            <TableCell>₱{item.unitCost?.toFixed(2) || '0.00'}</TableCell>
                            <TableCell>₱{item.amount?.toFixed(2) || '0.00'}</TableCell>
                            <TableCell>{item.estimatedUsefulLife || 'N/A'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    <strong>Total Items:</strong> {selectedSlip.items.length} | 
                    <strong> Total Amount:</strong> ₱{selectedSlip.items.reduce((sum, item) => sum + (item.amount || 0), 0).toFixed(2)}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedSlip(null)}>
                  Close
                </Button>
                <Button onClick={() => setShowPrintDialog(true)}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
};

