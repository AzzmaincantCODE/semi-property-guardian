import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Plus, 
  Eye, 
  Package, 
  Calendar,
  Building2,
  User,
  FileText,
  ArrowLeft,
  Printer
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { custodianService, Custodian, CustodianSummary, CustodianItemHistory } from "@/services/custodianService";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";

export default function Custodians() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustodian, setSelectedCustodian] = useState<Custodian | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Real-time subscription for live updates
  useEffect(() => {
    const channel = supabase
      .channel('realtime:custodians-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custodian_slips' }, () => {
        console.log('[Realtime] Custodian slips changed, refreshing...');
        queryClient.invalidateQueries({ queryKey: ['custodian-summaries'] });
        queryClient.invalidateQueries({ queryKey: ['custodian-summary'] });
        queryClient.invalidateQueries({ queryKey: ['custodian-item-history'] });
        queryClient.invalidateQueries({ queryKey: ['custodian-current-items'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custodian_slip_items' }, () => {
        console.log('[Realtime] Custodian slip items changed, refreshing...');
        queryClient.invalidateQueries({ queryKey: ['custodian-summaries'] });
        queryClient.invalidateQueries({ queryKey: ['custodian-summary'] });
        queryClient.invalidateQueries({ queryKey: ['custodian-item-history'] });
        queryClient.invalidateQueries({ queryKey: ['custodian-current-items'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => {
        console.log('[Realtime] Inventory items changed, refreshing custodian data...');
        queryClient.invalidateQueries({ queryKey: ['custodian-summaries'] });
        queryClient.invalidateQueries({ queryKey: ['custodian-current-items'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custodians' }, () => {
        console.log('[Realtime] Custodians changed, refreshing...');
        queryClient.invalidateQueries({ queryKey: ['custodians'] });
        queryClient.invalidateQueries({ queryKey: ['custodian-summaries'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Fetch custodians
  const { data: custodians = [], isLoading, error } = useQuery({
    queryKey: ['custodians'],
    queryFn: () => custodianService.getAll({ search: searchTerm }),
    enabled: true
  });

  // Fetch custodian summaries
  const { data: summaries = [] } = useQuery({
    queryKey: ['custodian-summaries'],
    queryFn: () => custodianService.getAllSummaries(),
    enabled: true,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true
  });

  // Fetch detailed custodian data when one is selected
  const { data: custodianSummary } = useQuery({
    queryKey: ['custodian-summary', selectedCustodian?.id],
    queryFn: () => custodianService.getSummary(selectedCustodian!.id),
    enabled: !!selectedCustodian,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true
  });

  const { data: custodianItemHistory = [] } = useQuery({
    queryKey: ['custodian-item-history', selectedCustodian?.id],
    queryFn: () => custodianService.getItemHistory(selectedCustodian!.id, { includeReturned: true }),
    enabled: !!selectedCustodian,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true
  });

  const { data: currentItems = [] } = useQuery({
    queryKey: ['custodian-current-items', selectedCustodian?.id],
    queryFn: () => custodianService.getCurrentItems(selectedCustodian!.id),
    enabled: !!selectedCustodian,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true
  });

  const handleViewCustodian = (custodian: Custodian) => {
    setSelectedCustodian(custodian);
    setShowDetailDialog(true);
  };

  const filteredCustodians = custodians.filter(custodian =>
    custodian.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    custodian.custodian_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (custodian.department_name && custodian.department_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              Error loading custodians: {(error as Error).message}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Custodians</h1>
          <p className="text-muted-foreground">Manage and view custodian information and item assignments</p>
        </div>
        <Button onClick={() => navigate('/settings/lookups#custodians')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Custodian
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search custodians by name, number, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Custodians Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            All Custodians ({filteredCustodians.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading custodians...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Custodian No.</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current Items</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustodians.map((custodian) => {
                  const summary = summaries.find(s => s.custodian.id === custodian.id);
                  return (
                    <TableRow key={custodian.id}>
                      <TableCell className="font-mono">{custodian.custodian_no}</TableCell>
                      <TableCell className="font-medium">{custodian.name}</TableCell>
                      <TableCell>{custodian.position || '-'}</TableCell>
                      <TableCell>{custodian.department_name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={custodian.is_active ? "default" : "secondary"}>
                          {custodian.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Package className="h-4 w-4" />
                          {summary?.currently_assigned_items || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="inline-flex items-center justify-center h-4 w-4 rounded-sm bg-emerald-600 text-white text-[10px] font-bold">₱</span>
                          ₱{(summary?.currently_assigned_value || 0).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewCustodian(custodian)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Custodian Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto print:max-w-full print:max-h-none print:overflow-visible">
          <DialogHeader className="print:block pr-8">
            <div className="flex items-center justify-between mb-2 print:flex-col print:items-start print:gap-2">
              <DialogTitle className="flex items-center gap-2 print:text-2xl">
                <User className="h-5 w-5 print:hidden" />
                Custodian Details
              </DialogTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="print:hidden"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
            <DialogDescription className="print:hidden">
              View detailed information and item history for this custodian
            </DialogDescription>
          </DialogHeader>

          {selectedCustodian && custodianSummary && (
            <div className="space-y-6 print:space-y-4">
              {/* Custodian Info */}
              <Card className="print:shadow-none print:border print:border-gray-300">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{selectedCustodian.name}</span>
                    <Badge variant={selectedCustodian.is_active ? "default" : "secondary"}>
                      {selectedCustodian.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Custodian Number</label>
                      <p className="font-mono">{selectedCustodian.custodian_no}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Position</label>
                      <p>{selectedCustodian.position || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Department</label>
                      <p>{selectedCustodian.department_name || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Last Activity</label>
                      <p>{custodianSummary.last_activity_date ? format(new Date(custodianSummary.last_activity_date), 'MMM dd, yyyy') : 'No activity'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Current Items</p>
                        <p className="text-2xl font-bold">{custodianSummary.currently_assigned_items}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded-sm bg-emerald-600 text-white text-[11px] font-bold">₱</span>
                      <div>
                        <p className="text-sm text-muted-foreground">Current Value</p>
                        <p className="text-2xl font-bold">₱{custodianSummary.currently_assigned_value.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Items</p>
                        <p className="text-2xl font-bold">{custodianSummary.total_items_assigned}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded-sm bg-purple-600 text-white text-[11px] font-bold">₱</span>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Value</p>
                        <p className="text-2xl font-bold">₱{custodianSummary.total_value_assigned.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Item History Tabs */}
              <Tabs defaultValue="current" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="current">Currently Assigned ({currentItems.length})</TabsTrigger>
                  <TabsTrigger value="history">All History ({custodianItemHistory.length})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="current" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Currently Assigned Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {currentItems.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No items currently assigned to this custodian.
                        </div>
                      ) : (
                        <Table className="print:border print:border-gray-300">
                          <TableHeader className="print:bg-gray-100">
                            <TableRow className="print:border-b print:border-gray-300">
                              <TableHead className="print:border print:border-gray-300 print:px-2 print:py-1">Property Number</TableHead>
                              <TableHead className="print:border print:border-gray-300 print:px-2 print:py-1">Description</TableHead>
                              <TableHead className="print:border print:border-gray-300 print:px-2 print:py-1">Condition</TableHead>
                              <TableHead className="print:border print:border-gray-300 print:px-2 print:py-1">Value</TableHead>
                              <TableHead className="print:border print:border-gray-300 print:px-2 print:py-1">Assigned Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {currentItems.map((item) => (
                              <TableRow key={item.id} className="print:border-b print:border-gray-300">
                                <TableCell className="font-mono print:border print:border-gray-300 print:px-2 print:py-1">{item.property_number}</TableCell>
                                <TableCell className="print:border print:border-gray-300 print:px-2 print:py-1">{item.description}</TableCell>
                                <TableCell className="print:border print:border-gray-300 print:px-2 print:py-1">
                                  <Badge variant={item.condition === 'Serviceable' ? 'default' : 'destructive'} className="print:bg-transparent print:text-black print:border print:border-gray-400">
                                    {item.condition}
                                  </Badge>
                                </TableCell>
                                <TableCell className="print:border print:border-gray-300 print:px-2 print:py-1">₱{item.total_cost.toLocaleString()}</TableCell>
                                <TableCell className="print:border print:border-gray-300 print:px-2 print:py-1">
                                  {item.assigned_date ? format(new Date(item.assigned_date), 'MMM dd, yyyy') : '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>All Item History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {custodianItemHistory.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No item history found for this custodian.
                        </div>
                      ) : (
                        <Table className="print:border print:border-gray-300">
                          <TableHeader className="print:bg-gray-100">
                            <TableRow className="print:border-b print:border-gray-300">
                              <TableHead className="print:border print:border-gray-300 print:px-2 print:py-1">Property Number</TableHead>
                              <TableHead className="print:border print:border-gray-300 print:px-2 print:py-1">Description</TableHead>
                              <TableHead className="print:border print:border-gray-300 print:px-2 print:py-1">Condition</TableHead>
                              <TableHead className="print:border print:border-gray-300 print:px-2 print:py-1">Value</TableHead>
                              <TableHead className="print:border print:border-gray-300 print:px-2 print:py-1">Slip Number</TableHead>
                              <TableHead className="print:border print:border-gray-300 print:px-2 print:py-1">Date Issued</TableHead>
                              <TableHead className="print:border print:border-gray-300 print:px-2 print:py-1">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {custodianItemHistory.map((item) => (
                              <TableRow key={item.id} className="print:border-b print:border-gray-300">
                                <TableCell className="font-mono print:border print:border-gray-300 print:px-2 print:py-1">{item.property_number}</TableCell>
                                <TableCell className="print:border print:border-gray-300 print:px-2 print:py-1">{item.description}</TableCell>
                                <TableCell className="print:border print:border-gray-300 print:px-2 print:py-1">
                                  <Badge variant={item.condition === 'Serviceable' ? 'default' : 'destructive'} className="print:bg-transparent print:text-black print:border print:border-gray-400">
                                    {item.condition}
                                  </Badge>
                                </TableCell>
                                <TableCell className="print:border print:border-gray-300 print:px-2 print:py-1">₱{item.total_cost.toLocaleString()}</TableCell>
                                <TableCell className="font-mono print:border print:border-gray-300 print:px-2 print:py-1">{item.custodian_slip_number}</TableCell>
                                <TableCell className="print:border print:border-gray-300 print:px-2 print:py-1">
                                  {item.date_issued ? format(new Date(item.date_issued), 'MMM dd, yyyy') : '-'}
                                </TableCell>
                                <TableCell className="print:border print:border-gray-300 print:px-2 print:py-1">
                                  <Badge variant={item.is_currently_assigned ? 'default' : 'secondary'} className="print:bg-transparent print:text-black print:border print:border-gray-400">
                                    {item.is_currently_assigned ? 'Currently Assigned' : 'Returned'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
