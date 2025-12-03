import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InventoryForm } from "@/components/inventory/InventoryForm";
import { InventoryItem } from "@/types/inventory";
import { Plus, Search, Edit, Trash2, Eye, Filter, Loader2, AlertCircle, ArrowLeft, Package, Calendar, DollarSign, Building2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { simpleInventoryService } from "@/services/simpleInventoryService";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { getNewestRecordId, isWithinRecentThreshold } from "@/lib/utils";
import { format } from "date-fns";
import { annexService } from "@/services/annexService";
import { lookupService } from "@/services/lookupService";

export const Inventory = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>();
  const [viewingItem, setViewingItem] = useState<InventoryItem | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Real-time subscription for live updates
  useEffect(() => {
    const channel = supabase
      .channel('realtime:inventory-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => {
        console.log('[Realtime] Inventory item changed, refreshing...');
        // Invalidate all inventory-related queries
        queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
        queryClient.invalidateQueries({ queryKey: ['inventory-items-high-value'] });
        queryClient.invalidateQueries({ queryKey: ['inventory-items-low-value'] });
        queryClient.invalidateQueries({ queryKey: ['inventory-items-filtered'] });
        // Force immediate refetch
        queryClient.refetchQueries({ queryKey: ['inventory-items-high-value'] });
        queryClient.refetchQueries({ queryKey: ['inventory-items-low-value'] });
        queryClient.refetchQueries({ queryKey: ['inventory-items-filtered'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'property_cards' }, () => {
        console.log('[Realtime] Property cards changed, refreshing inventory...');
        queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
        queryClient.invalidateQueries({ queryKey: ['inventory-items-high-value'] });
        queryClient.invalidateQueries({ queryKey: ['inventory-items-low-value'] });
        queryClient.invalidateQueries({ queryKey: ['inventory-items-filtered'] });
        // Force immediate refetch
        queryClient.refetchQueries({ queryKey: ['inventory-items-high-value'] });
        queryClient.refetchQueries({ queryKey: ['inventory-items-low-value'] });
        queryClient.refetchQueries({ queryKey: ['inventory-items-filtered'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custodian_slip_items' }, () => {
        console.log('[Realtime] Custodian slip items changed, refreshing inventory...');
        queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
        queryClient.invalidateQueries({ queryKey: ['inventory-items-high-value'] });
        queryClient.invalidateQueries({ queryKey: ['inventory-items-low-value'] });
        queryClient.invalidateQueries({ queryKey: ['inventory-items-filtered'] });
        // Force immediate refetch
        queryClient.refetchQueries({ queryKey: ['inventory-items-high-value'] });
        queryClient.refetchQueries({ queryKey: ['inventory-items-low-value'] });
        queryClient.refetchQueries({ queryKey: ['inventory-items-filtered'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
  
  // Get filters from URL parameters
  const filter = searchParams.get('filter'); // available/issued
  const valueFilter = searchParams.get('valueFilter'); // high-value/low-value
  
  // Handle filter change
  const handleFilterChange = (newFilter: string) => {
    const params = new URLSearchParams();
    if (newFilter !== 'all') {
      params.set('filter', newFilter);
    }
    if (valueFilter) {
      params.set('valueFilter', valueFilter);
    }
    navigate(`/inventory${params.toString() ? '?' + params.toString() : ''}`);
  };
  
  // Handle value filter change
  const handleValueFilterChange = (newValueFilter: string) => {
    const params = new URLSearchParams();
    if (filter) {
      params.set('filter', filter);
    }
    if (newValueFilter !== 'all') {
      params.set('valueFilter', newValueFilter);
    }
    navigate(`/inventory${params.toString() ? '?' + params.toString() : ''}`);
  };
  
  // Use React Query for inventory - fetch both high and low value items separately
  const { data: highValueItems = [], isLoading: loadingHighValue, isFetching: fetchingHighValue, error: highValueError } = useQuery({
    queryKey: ['inventory-items-high-value', searchTerm, filter],
    queryFn: async () => {
      console.log('Fetching high value items, searchTerm:', searchTerm, 'filter:', filter);
      const response = searchTerm.trim() 
        ? await simpleInventoryService.search(searchTerm, {
            filter: filter as 'available' | 'issued' | undefined,
            valueFilter: 'high-value'
          })
        : await simpleInventoryService.getAll({ 
            filter: filter as 'available' | 'issued' | undefined,
            valueFilter: 'high-value'
          });
      console.log('High value inventory response:', response);
      return response.success ? response.data : [];
    },
    staleTime: 0, // Always consider data stale to allow refetch
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: false, // We'll use manual refetch after mutations
    retry: (failureCount, error) => {
      if (!navigator.onLine) return false;
      return failureCount < 2;
    },
  });

  const { data: lowValueItems = [], isLoading: loadingLowValue, isFetching: fetchingLowValue, error: lowValueError } = useQuery({
    queryKey: ['inventory-items-low-value', searchTerm, filter],
    queryFn: async () => {
      console.log('Fetching low value items, searchTerm:', searchTerm, 'filter:', filter);
      const response = searchTerm.trim() 
        ? await simpleInventoryService.search(searchTerm, {
            filter: filter as 'available' | 'issued' | undefined,
            valueFilter: 'low-value'
          })
        : await simpleInventoryService.getAll({ 
            filter: filter as 'available' | 'issued' | undefined,
            valueFilter: 'low-value'
          });
      console.log('Low value inventory response:', response);
      return response.success ? response.data : [];
    },
    staleTime: 0, // Always consider data stale to allow refetch
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: false, // We'll use manual refetch after mutations
    retry: (failureCount, error) => {
      if (!navigator.onLine) return false;
      return failureCount < 2;
    },
  });

  // For backward compatibility, keep the old query when valueFilter is used
  const { data: filteredItems = [], isLoading: loadingFiltered, isFetching: fetchingFiltered, error: filteredError } = useQuery({
    queryKey: ['inventory-items-filtered', searchTerm, filter, valueFilter],
    queryFn: async () => {
      console.log('Fetching filtered inventory items, searchTerm:', searchTerm, 'filter:', filter, 'valueFilter:', valueFilter);
      const response = searchTerm.trim() 
        ? await simpleInventoryService.search(searchTerm, {
            filter: filter as 'available' | 'issued' | undefined,
            valueFilter: valueFilter as 'high-value' | 'low-value' | undefined
          })
        : await simpleInventoryService.getAll({ 
            filter: filter as 'available' | 'issued' | undefined,
            valueFilter: valueFilter as 'high-value' | 'low-value' | undefined
          });
      console.log('Filtered inventory response:', response);
      return response.success ? response.data : [];
    },
    staleTime: 0, // Always consider data stale to allow refetch
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: false, // We'll use manual refetch after mutations
    retry: (failureCount, error) => {
      if (!navigator.onLine) return false;
      return failureCount < 2;
    },
    enabled: !!valueFilter, // Only run when valueFilter is active
  });

  // Use the appropriate data based on whether we're filtering or showing tabs
  const items = valueFilter ? filteredItems : [];
  const loading = valueFilter ? loadingFiltered : false;
  const isFetching = valueFilter ? fetchingFiltered : (fetchingHighValue || fetchingLowValue);
  const error = valueFilter ? filteredError : null;

  const allInventoryItems = useMemo(() => {
    const source = valueFilter ? items : [...highValueItems, ...lowValueItems];
    const deduped = new Map<string, InventoryItem>();
    (source || []).forEach((item) => {
      if (item && !deduped.has(item.id)) {
        deduped.set(item.id, item);
      }
    });
    return Array.from(deduped.values());
  }, [valueFilter, items, highValueItems, lowValueItems]);

  const newestInventoryItemId = useMemo(() => getNewestRecordId(allInventoryItems), [allInventoryItems]);
  const isRecentlyAddedItem = (item: InventoryItem) =>
    newestInventoryItemId === item.id && isWithinRecentThreshold(item.createdAt);

  // Mutations for CRUD operations
  const createItemMutation = useMutation({
    mutationFn: async ({ 
      item, 
      autoCreatePropertyCard 
    }: { 
      item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>;
      autoCreatePropertyCard?: boolean;
    }) => {
      // First create the inventory item
      const response = await simpleInventoryService.create(item);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create inventory item');
      }
      
      const createdItem = response.data;
      
      // If auto-create is enabled, create property card
      console.log('[Inventory] Checking auto-create:', { autoCreatePropertyCard, hasId: !!createdItem.id });
      
      if (autoCreatePropertyCard && createdItem.id) {
        console.log('[Inventory] Auto-create enabled, creating property card...');
        try {
          // Get fund source name if available
          let fundCluster = "General Fund"; // Default
          if (item.fundSource) {
            console.log('[Inventory] Fetching fund source:', item.fundSource);
            const fundSources = await lookupService.getFundSources();
            const fundSource = fundSources.find(fs => fs.id === item.fundSource);
            if (fundSource) {
              fundCluster = fundSource.name;
              console.log('[Inventory] Found fund source:', fundCluster);
            }
          }
          
          // Create property card with defaults from inventory
          console.log('[Inventory] Creating property card with:', {
            inventoryItemId: createdItem.id,
            entityName: item.entityName || "PROVINCIAL GOVERNMENT OF APAYAO",
            fundCluster: fundCluster,
            propertyNumber: createdItem.propertyNumber
          });
          
          // Create property card with initial receipt entry based on inventory values (Annex A.1)
          const propertyCard = await annexService.createPropertyCardFromInventory({
            inventoryItemId: createdItem.id,
            entityName: item.entityName || "PROVINCIAL GOVERNMENT OF APAYAO",
            fundCluster: fundCluster,
            initialEntry: {
              date: createdItem.dateAcquired || new Date().toISOString().split('T')[0],
              reference: 'Initial Receipt',
              receiptQty: createdItem.quantity || 1,
              unitCost: createdItem.unitCost || 0,
              totalCost: createdItem.totalCost || ((createdItem.quantity || 1) * (createdItem.unitCost || 0))
            }
          });
          
          console.log('[Inventory] ✅ Property card created successfully:', {
            id: propertyCard.id,
            propertyNumber: propertyCard.propertyNumber
          });
          
          return { 
            data: createdItem, 
            propertyCardCreated: true, 
            propertyCardId: propertyCard.id,
            success: true,
            error: null
          };
        } catch (error) {
          console.error('[Inventory] ❌ Error auto-creating property card:', error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('[Inventory] Error details:', {
            message: errorMessage,
            stack: error instanceof Error ? error.stack : undefined
          });
          // Return the item even if property card creation failed
          return { 
            data: createdItem, 
            propertyCardCreated: false, 
            propertyCardError: errorMessage,
            success: true,
            error: null
          };
        }
      }
      
      console.log('[Inventory] Auto-create not enabled or no item ID');
      return { 
        data: createdItem, 
        propertyCardCreated: false,
        success: true,
        error: null
      };
    },
    onSuccess: async (result) => {
      // Invalidate and refetch all relevant queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventory-items'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-items-high-value'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-items-low-value'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-items-filtered'] }),
        queryClient.invalidateQueries({ queryKey: ['available-inventory-for-slips'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['annex-property-cards'] }),
        queryClient.invalidateQueries({ queryKey: ['available-inventory-for-cards'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-items-for-property-cards'] }),
      ]);
      
      // Force immediate refetch of inventory queries
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['inventory-items-high-value'] }),
        queryClient.refetchQueries({ queryKey: ['inventory-items-low-value'] }),
        queryClient.refetchQueries({ queryKey: ['inventory-items-filtered'] }),
        queryClient.refetchQueries({ queryKey: ['annex-property-cards'] }),
        queryClient.refetchQueries({ queryKey: ['dashboard-stats'] }),
      ]);
      
      // Show success message
      if (!result.data) {
        return; // Safety check
      }
      const itemData = result.data;
      if (result.propertyCardCreated) {
        console.log('Property card was created successfully, showing success message');
        toast({ 
          title: "Inventory Item & Property Card Created Successfully", 
          description: `Item ${itemData.propertyNumber} has been added and a property card was automatically created. You can now assign this item to a custodian.`,
          action: (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/property-cards')}
            >
              View Property Cards
            </Button>
          )
        });
      } else if (result.propertyCardError) {
        // Show warning if property card creation failed
        toast({ 
          title: "Inventory Item Created", 
          description: `Item ${itemData.propertyNumber} was created, but property card creation failed: ${result.propertyCardError}. You can create it manually.`,
          variant: "destructive",
          action: (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/property-cards', { 
                state: { 
                  prefillItem: {
                    propertyNumber: itemData.propertyNumber,
                    description: itemData.description
                  }
                }
              })}
            >
              Create Property Card
            </Button>
          )
        });
      } else {
          toast({
          title: "Inventory Item Created Successfully", 
          description: `Item ${itemData.propertyNumber} has been added. To assign this item to a custodian, you'll need to create a property card first.`,
          action: (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/property-cards', { 
                state: { 
                  prefillItem: {
                    propertyNumber: itemData.propertyNumber,
                    description: itemData.description
                  }
                }
              })}
            >
              Create Property Card
            </Button>
          )
        });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create inventory item", variant: "destructive" });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<InventoryItem> }) => 
      simpleInventoryService.update(id, updates),
    onSuccess: async () => {
      // Invalidate and refetch all inventory queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventory-items'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-items-high-value'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-items-low-value'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-items-filtered'] }),
        queryClient.invalidateQueries({ queryKey: ['available-inventory-for-slips'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['annex-property-cards'] }),
      ]);
      
      // Force immediate refetch
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['inventory-items-high-value'] }),
        queryClient.refetchQueries({ queryKey: ['inventory-items-low-value'] }),
        queryClient.refetchQueries({ queryKey: ['inventory-items-filtered'] }),
        queryClient.refetchQueries({ queryKey: ['dashboard-stats'] }),
      ]);
      
      toast({ title: "Success", description: "Inventory item updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update inventory item", variant: "destructive" });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => simpleInventoryService.delete(id),
    onSuccess: async () => {
      // Invalidate and refetch all inventory queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventory-items'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-items-high-value'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-items-low-value'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-items-filtered'] }),
        queryClient.invalidateQueries({ queryKey: ['available-inventory-for-slips'] }),
        queryClient.invalidateQueries({ queryKey: ['annex-property-cards'] }),
        queryClient.invalidateQueries({ queryKey: ['property-cards'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }),
      ]);
      
      // Force immediate refetch
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['inventory-items-high-value'] }),
        queryClient.refetchQueries({ queryKey: ['inventory-items-low-value'] }),
        queryClient.refetchQueries({ queryKey: ['inventory-items-filtered'] }),
        queryClient.refetchQueries({ queryKey: ['dashboard-stats'] }),
      ]);
      
      toast({ title: "Success", description: "Inventory item deleted successfully" });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.error || "Failed to delete inventory item";
      toast({ 
        title: "Cannot Delete Item", 
        description: errorMessage, 
        variant: "destructive" 
      });
    },
  });

  const handleSave = async (item: InventoryItem, autoCreatePropertyCard?: boolean) => {
    console.log('[Inventory] handleSave called', { 
      isEditing: !!editingItem, 
      autoCreatePropertyCard,
      propertyNumber: item.propertyNumber 
    });
    
    try {
      if (editingItem) {
        await updateItemMutation.mutateAsync({ id: item.id, updates: item });
      } else {
        console.log('[Inventory] Creating new item with autoCreatePropertyCard:', autoCreatePropertyCard);
        await createItemMutation.mutateAsync({ 
          item: item as Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>,
          autoCreatePropertyCard 
        });
      }
      setShowForm(false);
      setEditingItem(undefined);
    } catch (error) {
      console.error('[Inventory] Error in handleSave:', error);
      // Error handling is done in the mutation onError callbacks
    }
  };

  const handleView = (item: InventoryItem) => {
    setViewingItem(item);
    setShowViewDialog(true);
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDeleteClick = (item: InventoryItem) => {
    // Check if item is under custody
    const isUnderCustody = item.assignmentStatus === 'Assigned' || 
                           (item.custodian && item.custodian.trim() !== '');
    
    if (isUnderCustody) {
      toast({
        title: "Cannot Delete Item",
        description: `This item cannot be deleted because it is currently assigned to ${item.custodian || 'a custodian'}. Please unassign the item from the custodian first before deleting.`,
        variant: "destructive",
      });
      return;
    }
    
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };
  
  const isItemUnderCustody = (item: InventoryItem): boolean => {
    return item.assignmentStatus === 'Assigned' || 
           (item.custodian && item.custodian.trim() !== '');
  };

  const handleDeleteConfirm = async () => {
    if (itemToDelete) {
      try {
        await deleteItemMutation.mutateAsync(itemToDelete.id);
        setDeleteDialogOpen(false);
        setItemToDelete(null);
      } catch (error) {
        // Error handling is done in the mutation onError callback
      }
    }
  };

  const handleSearch = (() => {
    let handle: any;
    return (query: string) => {
      clearTimeout(handle);
      handle = setTimeout(() => {
        setSearchTerm(query);
      }, 300);
    };
  })();

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "Serviceable": return "bg-green-100 text-green-800";
      case "For Repair": return "bg-yellow-100 text-yellow-800";
      case "Unserviceable": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-green-100 text-green-800";
      case "Transferred": return "bg-blue-100 text-blue-800";
      case "Disposed": return "bg-gray-100 text-gray-800";
      case "Missing": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getAvailabilityStatus = (item: any) => {
    // Check if item is available for assignment
    if (item.condition !== 'Serviceable') {
      return { status: 'Unavailable', reason: `Condition: ${item.condition}`, color: 'bg-red-100 text-red-800' };
    }
    
    if (item.status !== 'Active') {
      return { status: 'Unavailable', reason: `Status: ${item.status}`, color: 'bg-gray-100 text-gray-800' };
    }
    
    // Check assignment status from database view if available
    if (item.assignmentStatus === 'Assigned') {
      return { status: 'Assigned', reason: 'Assigned via custodian slip', color: 'bg-blue-100 text-blue-800' };
    }
    
    return { status: 'Available', reason: 'Ready for assignment', color: 'bg-green-100 text-green-800' };
  };

  const hasActiveFilters = Boolean(
    (filter && filter !== "all") ||
      (valueFilter && valueFilter !== "all") ||
      searchTerm.trim()
  );

  const handleResetView = () => {
    setSearchTerm("");
    handleSearch("");
    navigate("/inventory", { replace: true });
  };

  if (showForm) {
    return (
      <InventoryForm
        item={editingItem}
        onSave={handleSave}
        onCancel={() => {
          setShowForm(false);
          setEditingItem(undefined);
        }}
        isSaving={createItemMutation.isPending || updateItemMutation.isPending}
      />
    );
  }

  if ((loading || loadingHighValue || loadingLowValue) && items.length === 0 && highValueItems.length === 0 && lowValueItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading inventory...</span>
      </div>
    );
  }

  if ((error || highValueError || lowValueError) && navigator.onLine) {
    const errorMessage = error instanceof Error ? error.message : 
                         highValueError instanceof Error ? highValueError.message : 
                         lowValueError instanceof Error ? lowValueError.message : 
                         String(error || highValueError || lowValueError || 'Unknown error');
    return (
      <div className="text-center py-8">
        <Alert className="max-w-md mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error: {errorMessage}
          </AlertDescription>
        </Alert>
        <Button onClick={() => window.location.reload()} className="mt-4">
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
          <p className="text-muted-foreground">Previously loaded inventory data will appear when available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Subtle loading overlay - appears during refresh */}
      {isFetching && !loading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-40 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-2 bg-background border rounded-lg shadow-lg p-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Refreshing inventory...</span>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetView}
            className="flex items-center space-x-2"
            disabled={createItemMutation.isPending || updateItemMutation.isPending || deleteItemMutation.isPending}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{hasActiveFilters ? 'Clear Filters' : 'View All Items'}</span>
          </Button>
          <h1 className="text-3xl font-bold text-foreground">
            {filter === 'issued' ? 'Issued Items' : 
             filter === 'available' ? 'Available Items' : 
             'Inventory Management'}
          </h1>
        </div>
        <Button 
          onClick={() => setShowForm(true)} 
          className="bg-primary hover:bg-primary-dark"
          disabled={createItemMutation.isPending || updateItemMutation.isPending || deleteItemMutation.isPending}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Item
        </Button>
      </div>

      {(filter || valueFilter) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-blue-800">
              {filter === 'issued' && valueFilter === 'high-value' && 'Showing high value items (above ₱5,000) that have been issued to custodians'}
              {filter === 'issued' && valueFilter === 'low-value' && 'Showing low value items (₱5,000 or less) that have been issued to custodians'}
              {filter === 'available' && valueFilter === 'high-value' && 'Showing high value items (above ₱5,000) available for assignment'}
              {filter === 'available' && valueFilter === 'low-value' && 'Showing low value items (₱5,000 or less) available for assignment'}
              {filter === 'issued' && !valueFilter && 'Showing only items that have been issued to custodians'}
              {filter === 'available' && !valueFilter && 'Showing only items available for assignment'}
              {!filter && valueFilter === 'high-value' && 'Showing only high value items (above ₱5,000)'}
              {!filter && valueFilter === 'low-value' && 'Showing only low value items (₱5,000 or less)'}
            </span>
          </div>
        </div>
      )}

      {/* Table Component Helper */}
      {(() => {
        const renderTable = (items: InventoryItem[], isLoading: boolean) => (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property Number</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Custodian</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Availability</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{item.propertyNumber}</span>
                        {isRecentlyAddedItem(item) && (
                          <Badge variant="default" className="bg-emerald-600 text-white">
                            Recently Added
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={item.description}>
                        {item.description}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.brand} {item.model}
                      </div>
                    </TableCell>
                    <TableCell>
                        <div>{item.custodian || '-'}</div>
                        {item.custodianPosition && (
                      <div className="text-xs text-muted-foreground">{item.custodianPosition}</div>
                        )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getConditionColor(item.condition)}>
                        {item.condition}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(item.status)}>
                        {item.status}
                      </Badge>
                    </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {(() => {
                            const availability = getAvailabilityStatus(item);
                            return (
                              <Badge className={availability.color} title={availability.reason}>
                                {availability.status}
                              </Badge>
                            );
                          })()}
                          {item.hasPropertyCard === false && (
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">
                              ⚠️ No Property Card
                            </Badge>
                          )}
                        </div>
                    </TableCell>
                    <TableCell>₱{item.totalCost.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleView(item)} 
                            title="View Details"
                            disabled={createItemMutation.isPending || updateItemMutation.isPending || deleteItemMutation.isPending}
                          >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEdit(item)} 
                          title="Edit"
                          disabled={createItemMutation.isPending || updateItemMutation.isPending || deleteItemMutation.isPending}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(item)}
                          title={isItemUnderCustody(item) ? "Cannot delete: Item is assigned to a custodian" : "Delete"}
                          className="text-destructive hover:text-destructive"
                          disabled={deleteItemMutation.isPending || createItemMutation.isPending || updateItemMutation.isPending || isItemUnderCustody(item)}
                        >
                          {deleteItemMutation.isPending && itemToDelete?.id === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                          <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        );

        // Show tabs if no valueFilter is active, otherwise show filtered view
        if (valueFilter) {
          // Legacy filtered view (when valueFilter is in URL)
          return (
            <Card>
              <CardHeader>
                <CardTitle>
                  {filter === 'issued' ? 'Issued Semi-Expendable Property Items' : 
                   filter === 'available' ? 'Available Semi-Expendable Property Items' : 
                   'Semi-Expendable Property Items'}
                </CardTitle>
                <div className="flex items-center space-x-4">
                  <div className="flex-1 relative">
                    <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                    <Input
                      placeholder="Search by property number, description, or custodian..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        handleSearch(e.target.value);
                      }}
                      className="pl-10"
                    />
                  </div>
                  <Select value={filter || 'all'} onValueChange={handleFilterChange}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Items</SelectItem>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="issued">Issued</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={valueFilter || 'all'} onValueChange={handleValueFilterChange}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Value Filter..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Values</SelectItem>
                      <SelectItem value="high-value">High Value (&gt;₱5,000)</SelectItem>
                      <SelectItem value="low-value">Low Value (≤₱5,000)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {renderTable(items, loading)}
          {items.length === 0 && !loading && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No inventory items found.</p>
              {searchTerm && (
                <p className="text-sm text-muted-foreground mt-2">
                  Try adjusting your search terms.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
          );
        }

        // New tabbed view when no valueFilter
        return (
          <Card>
            <CardHeader>
              <CardTitle>
                {filter === 'issued' ? 'Issued Semi-Expendable Property Items' : 
                 filter === 'available' ? 'Available Semi-Expendable Property Items' : 
                 'Semi-Expendable Property Items'}
              </CardTitle>
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    placeholder="Search by property number, description, or custodian..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      handleSearch(e.target.value);
                    }}
                    className="pl-10"
                  />
                </div>
                <Select value={filter || 'all'} onValueChange={handleFilterChange}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Items</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="issued">Issued</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="high-value" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="high-value" className="flex items-center gap-2">
                    <span className="font-semibold">High Value</span>
                    <Badge variant="secondary" className="ml-auto">
                      {loadingHighValue ? '...' : highValueItems.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="low-value" className="flex items-center gap-2">
                    <span className="font-semibold">Low Value</span>
                    <Badge variant="secondary" className="ml-auto">
                      {loadingLowValue ? '...' : lowValueItems.length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="high-value" className="mt-4">
                  <div className="mb-4 text-sm text-muted-foreground">
                    Items above ₱5,000 - High Value Expendable
                  </div>
                  {renderTable(highValueItems, loadingHighValue)}
                  {highValueItems.length === 0 && !loadingHighValue && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No high value items found.</p>
                      {searchTerm && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Try adjusting your search terms.
                        </p>
                      )}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="low-value" className="mt-4">
                  <div className="mb-4 text-sm text-muted-foreground">
                    Items ₱5,000 or less - Small Value Expendable
                  </div>
                  {renderTable(lowValueItems, loadingLowValue)}
                  {lowValueItems.length === 0 && !loadingLowValue && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No low value items found.</p>
                      {searchTerm && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Try adjusting your search terms.
                        </p>
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        );
      })()}

      {/* View Item Details Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventory Item Details
            </DialogTitle>
            <DialogDescription>
              Complete information about this inventory item
            </DialogDescription>
          </DialogHeader>

          {viewingItem && (
            <div className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Property Number</Label>
                    <p className="font-mono font-semibold">{viewingItem.propertyNumber}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                    <p>{viewingItem.description}</p>
                  </div>
                  {viewingItem.semiExpandableCategory && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Semi-Expandable Category</Label>
                      <p>{viewingItem.semiExpandableCategory}</p>
                    </div>
                  )}
                  {viewingItem.subCategory && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Sub-Category</Label>
                      <Badge variant="outline">{viewingItem.subCategory}</Badge>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <Badge className={getStatusColor(viewingItem.status)}>{viewingItem.status}</Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Condition</Label>
                    <Badge className={getConditionColor(viewingItem.condition)}>{viewingItem.condition}</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Item Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Item Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Brand</Label>
                    <p>{viewingItem.brand || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Model</Label>
                    <p>{viewingItem.model || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Serial Number</Label>
                    <p className="font-mono">{viewingItem.serialNumber || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Quantity</Label>
                    <p>{viewingItem.quantity} {viewingItem.unitOfMeasure}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Financial Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Unit Cost</Label>
                    <p className="font-semibold">₱{viewingItem.unitCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Total Cost</Label>
                    <p className="font-semibold text-lg">₱{viewingItem.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  {viewingItem.dateAcquired && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Date Acquired
                      </Label>
                      <p>{format(new Date(viewingItem.dateAcquired), 'MMMM dd, yyyy')}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Assignment Information */}
              {(viewingItem.custodian || viewingItem.assignmentStatus) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Assignment Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Custodian</Label>
                      <p>{viewingItem.custodian || '-'}</p>
                      {viewingItem.custodianPosition && (
                        <p className="text-sm text-muted-foreground">{viewingItem.custodianPosition}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Assignment Status</Label>
                      {(() => {
                        const availability = getAvailabilityStatus(viewingItem);
                        return <Badge className={availability.color}>{availability.status}</Badge>;
                      })()}
                      {viewingItem.hasPropertyCard === false && (
                        <Badge variant="outline" className="ml-2 text-xs text-amber-600 border-amber-300 bg-amber-50">
                          ⚠️ No Property Card
                        </Badge>
                      )}
                    </div>
                    {viewingItem.assignedDate && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Assigned Date</Label>
                        <p>{format(new Date(viewingItem.assignedDate), 'MMMM dd, yyyy')}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Additional Information */}
              {(viewingItem.remarks || viewingItem.entityName || viewingItem.lastInventoryDate) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Additional Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {viewingItem.entityName && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Entity Name</Label>
                        <p>{viewingItem.entityName}</p>
                      </div>
                    )}
                    {viewingItem.lastInventoryDate && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Last Inventory Date</Label>
                        <p>{format(new Date(viewingItem.lastInventoryDate), 'MMMM dd, yyyy')}</p>
                      </div>
                    )}
                    {viewingItem.remarks && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Remarks</Label>
                        <p className="whitespace-pre-wrap">{viewingItem.remarks}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Timestamps */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">System Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Created At</Label>
                    <p className="text-sm">{format(new Date(viewingItem.createdAt), 'MMMM dd, yyyy HH:mm')}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                    <p className="text-sm">{format(new Date(viewingItem.updatedAt), 'MMMM dd, yyyy HH:mm')}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowViewDialog(false)}
                  disabled={createItemMutation.isPending || updateItemMutation.isPending || deleteItemMutation.isPending}
                >
                  Close
                </Button>
                <Button 
                  onClick={() => {
                    setShowViewDialog(false);
                    handleEdit(viewingItem);
                  }}
                  disabled={createItemMutation.isPending || updateItemMutation.isPending || deleteItemMutation.isPending}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Item
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              {itemToDelete && isItemUnderCustody(itemToDelete) ? (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="text-destructive font-semibold">
                    ⚠️ This item cannot be deleted because it is currently under custody.
                  </p>
                  <p>
                    The item <span className="font-semibold">"{itemToDelete.propertyNumber} - {itemToDelete.description}"</span> is assigned to <span className="font-semibold">{itemToDelete.custodian || 'a custodian'}</span>.
                  </p>
                  <p>
                    Please unassign the item from the custodian first before deleting it.
                  </p>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  <p>
                    This action cannot be undone. This will permanently delete the inventory item
                    {itemToDelete && (
                      <span className="font-semibold"> "{itemToDelete.propertyNumber} - {itemToDelete.description}"</span>
                    )} from the system.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteItemMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            {itemToDelete && !isItemUnderCustody(itemToDelete) && (
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={deleteItemMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteItemMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </>
                )}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};