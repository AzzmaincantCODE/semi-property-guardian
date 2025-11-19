import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CustodianSelector } from "@/components/ui/custodian-selector";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import type { Custodian } from "@/services/custodianService";
import {
  Printer,
  Search,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Download,
  History,
} from "lucide-react";

type TransferStatus = "Draft" | "Issued" | "Completed" | "Rejected";
type TransferType = "Donation" | "Reassignment" | "Relocate" | "Others";

interface TransferItem {
  propertyNumber: string;
  description: string;
  quantity: number;
  condition: string;
  dateAcquired?: string;
  amount?: number;
  icsSlipId?: string;
  icsSlipNumber?: string;
  icsDate?: string;
  inventoryItemId?: string;
  custodianName?: string;
}

interface TransferHistoryEntry {
  timestamp: string;
  status: TransferStatus;
  action: string;
  details?: string;
}

interface Transfer {
  id: string;
  entityName: string;
  fromAccountableOfficer: string;
  fromAccountableOfficerDepartment?: string;
  fromAccountableOfficerId?: string;
  toAccountableOfficer: string;
  toAccountableOfficerDepartment?: string;
  toAccountableOfficerId?: string;
  fundCluster: string;
  itrNumber: string;
  date: string;
  transferType: TransferType;
  otherTransferType?: string;
  reason: string;
  status: TransferStatus;
  dateCompleted?: string;
  items: TransferItem[];
  history: TransferHistoryEntry[];
}

interface TransferFormState {
  entityName: string;
  fromAccountableOfficer: string;
  fromAccountableOfficerDepartment?: string;
  fromAccountableOfficerId?: string;
  toAccountableOfficer: string;
  toAccountableOfficerDepartment?: string;
  toAccountableOfficerId?: string;
  fundCluster: string;
  itrNumber: string;
  date: string;
  transferType: TransferType;
  otherTransferType?: string;
  reason: string;
  status: TransferStatus;
  items: TransferItem[];
}

interface CustodianItemOption {
  id: string;
  propertyNumber: string;
  description: string;
  quantity: number;
  condition: string;
  amount?: number;
  dateAcquired?: string;
  custodianName?: string;
  icsSlipId: string;
  icsSlipNumber: string;
  icsDate?: string;
  inventoryItemId?: string;
}

const TRANSFER_TYPES: TransferType[] = ["Donation", "Reassignment", "Relocate", "Others"];

const INITIAL_FORM_STATE: TransferFormState = {
  entityName: "",
  fromAccountableOfficer: "",
  toAccountableOfficer: "",
  fundCluster: "",
  itrNumber: "",
  date: "",
  transferType: "Donation",
  otherTransferType: "",
  reason: "",
  status: "Draft",
  items: [],
};

const formatDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCurrency = (value?: number) => {
  if (value === undefined || value === null) return "";
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);
};

const formatCustodianLine = (name?: string, department?: string) => {
  if (!name) return "";
  if (department) return `${name} / ${department}`;
  return name;
};

const generateNextItrNumber = async (existingTransfers: Transfer[] = []): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const pattern = new RegExp(`^ITR-${currentYear}-(\\d{4})$`);
  let maxSequence = 0;

  // Check local state first
  for (const transfer of existingTransfers) {
    const match = pattern.exec(transfer.itrNumber);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (!Number.isNaN(seq)) {
        maxSequence = Math.max(maxSequence, seq);
      }
    }
  }

  // Also check database for any transfers we might have missed
  try {
    const { data: dbTransfers } = await supabase
      .from("property_transfers")
      .select("transfer_number")
      .like("transfer_number", `ITR-${currentYear}-%`)
      .order("transfer_number", { ascending: false })
      .limit(100);

    if (dbTransfers) {
      for (const transfer of dbTransfers) {
        const match = pattern.exec(transfer.transfer_number);
        if (match) {
          const seq = parseInt(match[1], 10);
          if (!Number.isNaN(seq)) {
            maxSequence = Math.max(maxSequence, seq);
          }
        }
      }
    }
  } catch (err) {
    console.warn("Could not check database for existing ITR numbers, using local state only:", err);
  }

  const nextSequence = String(maxSequence + 1).padStart(4, "0");
  return `ITR-${currentYear}-${nextSequence}`;
};

const downloadCsv = (filename: string, rows: string[][]) => {
  const csvContent = rows
    .map((row) =>
      row
        .map((field) => {
          const safeField = field.replace(/"/g, '""');
          return `"${safeField}"`;
        })
        .join(",")
    )
    .join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const mapOptionToTransferItem = (option: CustodianItemOption): TransferItem => ({
  propertyNumber: option.propertyNumber,
  description: option.description,
  quantity: option.quantity,
  condition: option.condition,
  dateAcquired: option.dateAcquired,
  amount: option.amount,
  icsSlipId: option.icsSlipId,
  icsSlipNumber: option.icsSlipNumber,
  icsDate: option.icsDate,
  inventoryItemId: option.inventoryItemId,
  custodianName: option.custodianName,
});

const renderPrintLayout = (transfer: Transfer, preview = false) => {
  const items = transfer.items || [];
  const blankRows = Math.max(12 - items.length, 0);
  const containerClass = preview
    ? "bg-white border border-border rounded-lg shadow-sm text-foreground"
    : "bg-white text-black border border-black";
  const paddingClass = preview ? "p-6" : "p-10";

  const renderIcsCell = (item: TransferItem) => {
    if (item.icsSlipNumber && item.icsDate) return `${item.icsSlipNumber} / ${item.icsDate}`;
    if (item.icsSlipNumber) return item.icsSlipNumber;
    if (item.icsDate) return item.icsDate;
    return "\u00A0";
  };

  return (
    <div className={`${containerClass} ${paddingClass}`}>
      <div className={`flex justify-end text-xs mb-2 ${preview ? "text-muted-foreground" : ""}`}>
        Annex A.5
      </div>
      <div className="text-center border-b border-black pb-2 mb-4">
        <h1 className="text-2xl font-bold tracking-wide">INVENTORY TRANSFER REPORT</h1>
      </div>

      <table className="w-full text-sm mb-4">
        <tbody>
          <tr>
            <td className="pr-4 align-top">
              Entity Name:&nbsp;
              <span className="inline-block min-w-[250px] border-b border-black">
                {transfer.entityName || "\u00A0"}
              </span>
            </td>
            <td className="align-top">
              Fund Cluster:&nbsp;
              <span className="inline-block min-w-[180px] border-b border-black">
                {transfer.fundCluster || "\u00A0"}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="w-full text-sm mb-2">
        <tbody>
          <tr>
            <td className="pr-2 align-top w-[55%]">
              <div>
                From Accountable Officer/Agency/Fund Cluster:&nbsp;
                <span className="inline-block min-w-[230px] border-b border-black">
                  {formatCustodianLine(
                    transfer.fromAccountableOfficer,
                    transfer.fromAccountableOfficerDepartment
                  ) || "\u00A0"}
                </span>
              </div>
              <div className="mt-2">
                To Accountable Officer/Agency/Fund Cluster:&nbsp;
                <span className="inline-block min-w-[230px] border-b border-black">
                  {formatCustodianLine(
                    transfer.toAccountableOfficer,
                    transfer.toAccountableOfficerDepartment
                  ) || "\u00A0"}
                </span>
              </div>
            </td>
            <td className="align-top">
              <div>
                ITR No.:&nbsp;
                <span className="inline-block min-w-[160px] border-b border-black">
                  {transfer.itrNumber || "\u00A0"}
                </span>
              </div>
              <div className="mt-2">
                Date:&nbsp;
                <span className="inline-block min-w-[160px] border-b border-black">
                  {transfer.date || "\u00A0"}
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="border border-black p-2 mb-4">
        <div className="text-sm mb-2 font-semibold">Transfer Type: (check only one)</div>
        <div className="grid grid-cols-2 gap-y-1 text-sm">
          {TRANSFER_TYPES.map((type) => (
            <div key={type} className="flex items-center gap-2">
              <span className="inline-flex h-3.5 w-3.5 items-center justify-center border border-black text-[10px] font-bold">
                {transfer.transferType === type ? "✓" : ""}
              </span>
              <span>
                {type === "Others" ? "Others (Specify)" : type}
                {type === "Others" && transfer.transferType === "Others" && transfer.otherTransferType
                  ? `: ${transfer.otherTransferType}`
                  : ""}
              </span>
            </div>
          ))}
        </div>
      </div>

      <table className="w-full border-collapse border border-black text-sm">
        <thead>
          <tr>
            <th className="border border-black p-2 text-left w-[12%]">Date Acquired</th>
            <th className="border border-black p-2 text-left w-[10%]">Item No.</th>
            <th className="border border-black p-2 text-left w-[15%]">ICS No./Date</th>
            <th className="border border-black p-2 text-left">Description</th>
            <th className="border border-black p-2 text-right w-[12%]">Amount</th>
            <th className="border border-black p-2 text-center w-[15%]">Condition of Inventory</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.propertyNumber ?? index} className="h-10 align-top">
              <td className="border border-black p-2">{item.dateAcquired || "\u00A0"}</td>
              <td className="border border-black p-2">{item.propertyNumber || "\u00A0"}</td>
              <td className="border border-black p-2">{renderIcsCell(item)}</td>
              <td className="border border-black p-2">
                {item.description}
                {item.quantity ? ` (Qty: ${item.quantity})` : ""}
              </td>
              <td className="border border-black p-2 text-right">
                {item.amount !== undefined ? formatCurrency(item.amount) : "\u00A0"}
              </td>
              <td className="border border-black p-2 text-center">{item.condition || "\u00A0"}</td>
            </tr>
          ))}
          {Array.from({ length: blankRows }).map((_, index) => (
            <tr key={`blank-${index}`} className="h-10">
              <td className="border border-black p-2">&nbsp;</td>
              <td className="border border-black p-2">&nbsp;</td>
              <td className="border border-black p-2">&nbsp;</td>
              <td className="border border-black p-2">&nbsp;</td>
              <td className="border border-black p-2">&nbsp;</td>
              <td className="border border-black p-2">&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4">
        <div className="font-semibold text-sm mb-1">Reasons for Transfer:</div>
        <div className="border border-black h-24 p-3 leading-tight text-sm">
          {transfer.reason || "\u00A0"}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 text-sm mt-6">
        {["Approved by", "Released/Issued by", "Received by"].map((label) => (
          <div key={label} className="space-y-4">
            <div className="border-t border-black pt-2 text-center">
              <p className="font-semibold uppercase text-xs">{label}</p>
            </div>
            <div className="space-y-2">
              {["Signature:", "Printed Name:", "Designation:", "Date:"].map((field) => (
                <div key={field} className="flex items-center gap-1">
                  <span className="whitespace-nowrap">{field}</span>
                  <span className="flex-1 border-b border-black h-4" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const Transfers = () => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isLoadingTransfers, setIsLoadingTransfers] = useState(true);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [transferTypeFilter, setTransferTypeFilter] = useState<string>("All");
  const [fromDateFilter, setFromDateFilter] = useState("");
  const [toDateFilter, setToDateFilter] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isItemSelectorOpen, setItemSelectorOpen] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [itemSearchTerm, setItemSearchTerm] = useState("");
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<TransferFormState>(INITIAL_FORM_STATE);

  // Load transfers from database on mount
  useEffect(() => {
    const loadTransfers = async () => {
      try {
        setIsLoadingTransfers(true);
        // First try with inventory_item_id, fallback without it if column doesn't exist
        let data, error;
        const queryWithInventoryId = supabase
          .from("property_transfers")
          .select(`
            id,
            transfer_number,
            entity_name,
            fund_cluster,
            from_department,
            to_department,
            transfer_type,
            status,
            requested_by,
            approved_by,
            date_requested,
            date_approved,
            date_completed,
            reason,
            remarks,
            created_at,
            transfer_items (
              id,
              property_number,
              description,
              quantity,
              condition,
              inventory_item_id
            )
          `)
          .order("date_requested", { ascending: false });

        const result = await queryWithInventoryId;
        data = result.data;
        error = result.error;

        // If error is about missing column, retry without inventory_item_id
        if (error && (error.message?.includes('column') || error.message?.includes('inventory_item_id'))) {
          console.warn("inventory_item_id column not found, loading without it:", error.message);
          const fallbackResult = await supabase
            .from("property_transfers")
            .select(`
              id,
              transfer_number,
              entity_name,
              fund_cluster,
              from_department,
              to_department,
              transfer_type,
              status,
              requested_by,
              approved_by,
              date_requested,
              date_approved,
              date_completed,
              reason,
              remarks,
              created_at,
              transfer_items (
                id,
                property_number,
                description,
                quantity,
                condition
              )
            `)
            .order("date_requested", { ascending: false });
          data = fallbackResult.data;
          error = fallbackResult.error;
        }

        if (error) {
          console.error("Failed to load transfers", error);
          throw error;
        }

        // Transform database records to Transfer interface
        const loadedTransfers: Transfer[] = await Promise.all((data || []).map(async (record: any) => {
          // For each transfer item, fetch additional data from related tables
          const enrichedItems = await Promise.all((record.transfer_items || []).map(async (item: any) => {
            let icsSlipNumber = null;
            let icsDate = null;
            let amount = null;
            let dateAcquired = null;

            // If we have inventory_item_id, fetch the inventory item data
            if (item.inventory_item_id) {
              const { data: invData } = await supabase
                .from("inventory_items")
                .select("date_acquired, unit_cost, total_cost, property_number")
                .eq("id", item.inventory_item_id)
                .single();

              if (invData) {
                dateAcquired = invData.date_acquired;
                amount = invData.total_cost || invData.unit_cost || null;
              }

              // Try to find the ICS slip that assigned this item
              const { data: slipItemData } = await supabase
                .from("custodian_slip_items")
                .select(`
                  custodian_slips!inner (
                    slip_number,
                    date_issued
                  )
                `)
                .eq("inventory_item_id", item.inventory_item_id)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

              if (slipItemData?.custodian_slips) {
                const slip = Array.isArray(slipItemData.custodian_slips) 
                  ? slipItemData.custodian_slips[0] 
                  : slipItemData.custodian_slips;
                if (slip) {
                  icsSlipNumber = slip.slip_number;
                  icsDate = slip.date_issued;
                }
              }
            }

            // Also check if transfer_items has from_custodian/to_custodian for ICS lookup
            if (!icsSlipNumber && item.from_custodian) {
              const { data: slipData } = await supabase
                .from("custodian_slips")
                .select("slip_number, date_issued")
                .eq("custodian_name", item.from_custodian)
                .order("date_issued", { ascending: false })
                .limit(1)
                .single();

              if (slipData) {
                icsSlipNumber = slipData.slip_number;
                icsDate = slipData.date_issued;
              }
            }

            return {
              propertyNumber: item.property_number,
              description: item.description,
              quantity: item.quantity,
              condition: item.condition,
              inventoryItemId: item.inventory_item_id,
              icsSlipNumber,
              icsDate,
              amount,
              dateAcquired,
            };
          }));

          return {
            id: record.id,
            entityName: record.entity_name || "PROVINCIAL GOVERNMENT OF APAYAO", // Default entity name
            fromAccountableOfficer: record.from_department,
            toAccountableOfficer: record.to_department,
            fundCluster: record.fund_cluster || "", // Will be empty if not in schema
            itrNumber: record.transfer_number,
            date: record.date_requested,
            transferType: record.transfer_type as TransferType || "Donation",
            reason: record.reason,
            status: record.status as TransferStatus,
            dateCompleted: record.date_completed,
            items: enrichedItems,
            history: [
              {
                timestamp: record.created_at,
                status: record.status,
                action: "Transfer created",
                details: `Created ${record.transfer_number}`,
              },
            ],
          };
        }));

        setTransfers(loadedTransfers);
      } catch (err) {
        console.error("Error loading transfers:", err);
        toast({
          title: "Error loading transfers",
          description: "Could not load transfers from database",
          variant: "destructive",
        });
      } finally {
        setIsLoadingTransfers(false);
      }
    };

    loadTransfers();
  }, [toast]);

  const entitySuggestions = useMemo(
    () => [
      "PROVINCIAL GOVERNMENT OF APAYAO",
      "CITY OF LUNA",
      "MUNICIPALITY OF FLORA",
      "PROVINCIAL ACCOUNTING OFFICE",
    ],
    []
  );

  const { data: icsOptions = [], isLoading: isLoadingIcs } = useQuery({
    queryKey: ["transfer-ics-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custodian_slips")
        .select(`
          id,
          slip_number,
          date_issued,
          custodian_name,
          custodian_slip_items (
            id,
            inventory_item_id,
            property_number,
            description,
            quantity,
            unit,
            date_issued,
            inventory_items (
              id,
              date_acquired,
              property_number,
              total_cost,
              condition
            )
          )
        `)
        .order("date_issued", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Failed to load custodian slip items for transfers", error);
        throw error;
      }

      const items: CustodianItemOption[] = [];
      for (const slip of data || []) {
        const slipItems = slip.custodian_slip_items || [];
        for (const item of slipItems) {
          const inventoryItem = Array.isArray(item.inventory_items) 
            ? item.inventory_items[0] 
            : item.inventory_items;
          
          items.push({
            id: item.id,
            propertyNumber: item.property_number || "",
            description: item.description || "",
            quantity: item.quantity || 0,
            condition: inventoryItem?.condition || "",
            amount: Number(inventoryItem?.total_cost ?? 0),
            dateAcquired: inventoryItem?.date_acquired || "",
            custodianName: slip.custodian_name || "",
            icsSlipId: slip.id,
            icsSlipNumber: slip.slip_number || "",
            icsDate: item.date_issued || slip.date_issued || "",
            inventoryItemId: item.inventory_item_id || inventoryItem?.id || "",
          });
        }
      }

      console.log('Loaded ICS options for transfer:', {
        totalSlips: data?.length,
        totalItems: items.length,
        custodians: [...new Set(items.map(i => i.custodianName))],
        sampleItems: items.slice(0, 3)
      });

      return items;
    },
    staleTime: 5 * 60 * 1000,
  });

  const availableIcsItems = useMemo(() => {
    const normalizedFromOfficer = formData.fromAccountableOfficer
      ? formData.fromAccountableOfficer.toLowerCase().trim()
      : "";
    const alreadyAdded = new Set(formData.items.map((item) => item.propertyNumber));

    let filtered = icsOptions.filter((item) => {
      if (alreadyAdded.has(item.propertyNumber)) return false;
      if (normalizedFromOfficer) {
        // Normalize the custodian name for comparison
        const normalizedItemCustodian = (item.custodianName || "").toLowerCase().trim();
        return normalizedItemCustodian === normalizedFromOfficer;
      }
      return true;
    });

    // Apply search term filter
    if (itemSearchTerm) {
      filtered = filtered.filter((item) => {
        const haystack = `${item.propertyNumber} ${item.description} ${item.icsSlipNumber} ${item.custodianName || ""}`.toLowerCase();
        return haystack.includes(itemSearchTerm.toLowerCase());
      });
    }

    console.log('Filtered ICS items:', {
      fromOfficer: formData.fromAccountableOfficer,
      totalOptions: icsOptions.length,
      filteredCount: filtered.length,
      items: filtered.map(i => ({ custodian: i.custodianName, propertyNumber: i.propertyNumber }))
    });

    return filtered;
  }, [icsOptions, formData.fromAccountableOfficer, formData.items, itemSearchTerm]);

  const filteredTransfers = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();

    return transfers.filter((transfer) => {
      const haystack = [
        transfer.itrNumber,
        transfer.entityName,
        transfer.fromAccountableOfficer,
        transfer.toAccountableOfficer,
        transfer.reason,
        transfer.items.map((item) => `${item.propertyNumber} ${item.description}`).join(" "),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = haystack.includes(lowerSearch);
      const matchesStatus = statusFilter === "All" || transfer.status === statusFilter;
      const matchesType = transferTypeFilter === "All" || transfer.transferType === transferTypeFilter;
      const matchesFromDate = !fromDateFilter || transfer.date >= fromDateFilter;
      const matchesToDate = !toDateFilter || transfer.date <= toDateFilter;

      return matchesSearch && matchesStatus && matchesType && matchesFromDate && matchesToDate;
    });
  }, [transfers, searchTerm, statusFilter, transferTypeFilter, fromDateFilter, toDateFilter]);

  useEffect(() => {
    if (isCreating) {
      // Generate ITR number asynchronously
      generateNextItrNumber(transfers).then((nextNumber) => {
        setFormData((prev) => ({
          ...INITIAL_FORM_STATE,
          ...prev,
        itrNumber: prev.itrNumber || nextNumber,
        status: "Draft",
        }));
      });
      setErrors({});
    } else {
      setFormData(INITIAL_FORM_STATE);
      setSelectedItemIds([]);
      setItemSelectorOpen(false);
    }
  }, [isCreating, transfers]);

  const validateForm = (form: TransferFormState) => {
    const validationErrors: Record<string, string> = {};

    if (!form.entityName.trim()) validationErrors.entityName = "Entity name is required.";
    if (!form.fundCluster.trim()) validationErrors.fundCluster = "Fund cluster is required.";
    if (!form.itrNumber.trim()) validationErrors.itrNumber = "ITR number is required.";
    if (!form.date.trim()) validationErrors.date = "Date is required.";
    if (!form.fromAccountableOfficer.trim()) validationErrors.fromOfficer = "Select the releasing accountable officer.";
    if (!form.toAccountableOfficer.trim()) validationErrors.toOfficer = "Select the receiving accountable officer.";
    if (!form.reason.trim()) validationErrors.reason = "Please provide the reason for transfer.";
    if (!form.items.length) validationErrors.items = "Select at least one item from the ICS list.";

    return validationErrors;
  };

  const handleGenerateItrNumber = async () => {
    const nextNumber = await generateNextItrNumber(transfers);
    setFormData((prev) => ({ ...prev, itrNumber: nextNumber }));
  };

  const handleCreateTransfer = async () => {
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast({
        title: "Missing information",
        description: "Please fill in the required fields before saving the transfer.",
        variant: "destructive",
      });
      return;
    }

    try {
    const now = new Date().toISOString();
    // Generate ITR number if not provided, ensuring it's unique
    let itrNumber = formData.itrNumber;
    if (!itrNumber) {
      itrNumber = await generateNextItrNumber(transfers);
    }
    
    // Double-check uniqueness before inserting
    const { data: existing, error: existingError } = await supabase
      .from("property_transfers")
      .select("id")
      .eq("transfer_number", itrNumber)
      .maybeSingle();
    
    if (existingError) {
      console.error("Error checking existing transfer number:", existingError);
      throw existingError;
    }
    
    if (existing) {
      // If duplicate exists, generate a new one
      itrNumber = await generateNextItrNumber(transfers);
    }
      const transferId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;

      // Map frontend transfer types to DB allowed values (adjust mapping as needed)
      const transferTypeMap: Record<string, string> = {
        Donation: "Permanent",
        Reassignment: "Permanent",
        Relocate: "Temporary",
        Others: "Temporary",
      };

      const dbTransferType = transferTypeMap[formData.transferType] ?? "Permanent";

      // Ensure we have an authenticated user for requested_by (DB requires requested_by)
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id;
      if (!currentUserId) {
        toast({
          title: "Authentication required",
          description: "You must be signed in to create transfers.",
          variant: "destructive",
        });
        return;
      }

      // Save transfer to database
      let transferError;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        transferError = null;
        const { error } = await supabase
          .from("property_transfers")
          .insert({
            id: transferId,
            transfer_number: itrNumber,
            entity_name: formData.entityName.trim(),
            fund_cluster: formData.fundCluster.trim(),
            from_department: formData.fromAccountableOfficer,
            to_department: formData.toAccountableOfficer,
            transfer_type: dbTransferType,
            status: formData.status,
            date_requested: formData.date,
            reason: formData.reason,
            requested_by: currentUserId,
          });

        if (error) {
          // If it's a duplicate key error, generate a new number and retry
          if (error.code === '23505' && error.message?.includes('transfer_number')) {
            console.warn(`Duplicate ITR number ${itrNumber} detected, generating new number...`);
            itrNumber = await generateNextItrNumber(transfers);
            retryCount++;
            continue;
          }
          transferError = error;
          break;
        } else {
          // Success, break out of retry loop
          break;
        }
      }

      if (transferError) throw transferError;

      // Save transfer items to database with all tracking fields
      const transferItems = formData.items.map((item) => ({
        id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
        transfer_id: transferId,
        property_number: item.propertyNumber,
        description: item.description,
        quantity: item.quantity,
        condition: item.condition,
        inventory_item_id: item.inventoryItemId || null,
        ics_slip_id: item.icsSlipId || null,
        custodian_slip_item_id: item.icsSlipId || null,
        from_custodian: formData.fromAccountableOfficer,
        to_custodian: formData.toAccountableOfficer,
      }));

      if (transferItems.length > 0) {
        const { error: itemsError } = await supabase
          .from("transfer_items")
          .insert(transferItems);

        if (itemsError) throw itemsError;
      }

      // NOTE: Do NOT update custodian assignments when creating a transfer
      // Assignments will only be updated when the transfer status is changed to "Completed"
      // This ensures items remain with the original custodian until the transfer is finalized

      // Reload transfers to show the new one
      let reloadedData, reloadError;
      const reloadQuery = await supabase
        .from("property_transfers")
        .select(`
          id,
          transfer_number,
          from_department,
          to_department,
          transfer_type,
          status,
          requested_by,
          approved_by,
          date_requested,
          date_approved,
          date_completed,
          reason,
          remarks,
          created_at,
          transfer_items (
            id,
            property_number,
            description,
            quantity,
            condition,
            inventory_item_id
          )
        `)
        .order("date_requested", { ascending: false });

      reloadedData = reloadQuery.data;
      reloadError = reloadQuery.error;

      // If error is about missing column, retry without inventory_item_id
      if (reloadError && (reloadError.message?.includes('column') || reloadError.message?.includes('inventory_item_id'))) {
        console.warn("inventory_item_id column not found in reload, loading without it");
        const fallbackReload = await supabase
          .from("property_transfers")
          .select(`
            id,
            transfer_number,
            from_department,
            to_department,
            transfer_type,
            status,
            requested_by,
            approved_by,
            date_requested,
            date_approved,
            date_completed,
            reason,
            remarks,
            created_at,
            transfer_items (
              id,
              property_number,
              description,
              quantity,
              condition
            )
          `)
          .order("date_requested", { ascending: false });
        reloadedData = fallbackReload.data;
        reloadError = fallbackReload.error;
      }

      if (reloadError) {
        console.error("Failed to reload transfers after creation:", reloadError);
        // Continue anyway - the transfer was created successfully
      }

      // Add the new transfer to the list using formData (which has all enriched data)
      const newTransfer: Transfer = {
        id: transferId,
        entityName: formData.entityName.trim(),
        fromAccountableOfficer: formData.fromAccountableOfficer.trim(),
        fromAccountableOfficerDepartment: formData.fromAccountableOfficerDepartment,
        fromAccountableOfficerId: formData.fromAccountableOfficerId,
        toAccountableOfficer: formData.toAccountableOfficer.trim(),
        toAccountableOfficerDepartment: formData.toAccountableOfficerDepartment,
        toAccountableOfficerId: formData.toAccountableOfficerId,
        fundCluster: formData.fundCluster.trim(),
        itrNumber,
        date: formData.date,
        transferType: formData.transferType,
        otherTransferType: formData.otherTransferType,
        reason: formData.reason.trim(),
        status: formData.status,
        items: formData.items,
        history: [
          {
            timestamp: new Date().toISOString(),
            status: formData.status,
            action: "Transfer created",
            details: `Created ITR ${itrNumber}`,
          },
        ],
      };
      setTransfers((prev) => [newTransfer, ...prev]);

      setFormData(INITIAL_FORM_STATE);
      setIsCreating(false);
      setErrors({});
      setSelectedItemIds([]);
      toast({
        title: "Transfer saved",
        description: `Transfer ${itrNumber} has been saved and related records updated.`,
      });
    } catch (err) {
      console.error("Error creating transfer:", err);
      toast({
        title: "Error saving transfer",
        description: err instanceof Error ? err.message : "Failed to save transfer",
        variant: "destructive",
      });
    }
  };

  const handleStatusUpdate = async (transferId: string, newStatus: TransferStatus) => {
    try {
      const dateCompleted = newStatus === "Completed" ? new Date().toISOString().split("T")[0] : null;

      // Get the transfer with its items before updating
      const transfer = transfers.find((t) => t.id === transferId);
      if (!transfer) {
        throw new Error("Transfer not found");
      }

      // Update in database
      const { error } = await supabase
        .from("property_transfers")
        .update({
          status: newStatus,
          ...(dateCompleted && { date_completed: dateCompleted }),
        })
        .eq("id", transferId);

      if (error) throw error;

      // If transfer is being completed, update custodian assignments
      if (newStatus === "Completed" && transfer.items && transfer.items.length > 0) {
        // Get the "to" custodian's position/designation
        let toCustodianPosition = "";
        if (transfer.toAccountableOfficer) {
          // Try to find custodian by ID first, then by name
          const { data: custodianData } = transfer.toAccountableOfficerId
            ? await supabase
                .from("custodians")
                .select("position")
                .eq("id", transfer.toAccountableOfficerId)
                .single()
            : await supabase
                .from("custodians")
                .select("position")
                .eq("name", transfer.toAccountableOfficer)
                .single();
          toCustodianPosition = custodianData?.position || "";
        }

        // Update inventory items: assign to new custodian
        for (const item of transfer.items) {
          // Try to find inventory_item_id if not already in the item
          let inventoryItemId = item.inventoryItemId;
          
          if (!inventoryItemId && item.propertyNumber) {
            // Look up by property number
            const { data: invLookup } = await supabase
              .from("inventory_items")
              .select("id")
              .eq("property_number", item.propertyNumber)
              .single();
            
            if (invLookup) {
              inventoryItemId = invLookup.id;
            }
          }

          if (inventoryItemId) {
            const { error: invErr } = await supabase
              .from("inventory_items")
              .update({
                custodian: transfer.toAccountableOfficer,
                custodian_position: toCustodianPosition,
                assignment_status: "Assigned",
                assigned_date: dateCompleted || new Date().toISOString().split("T")[0],
                updated_at: new Date().toISOString(),
              })
              .eq("id", inventoryItemId);

            if (invErr) {
              console.error(`Failed to update inventory item ${item.propertyNumber}:`, invErr);
            } else {
              console.log(`✅ Successfully updated inventory item ${item.propertyNumber} to custodian ${transfer.toAccountableOfficer}`);
            }
          } else {
            console.warn(`⚠️ Could not find inventory item for property number ${item.propertyNumber}`);
          }

          // Create property card entry for the transfer (regardless of inventory item update success)
          // First, find the property card for this item
          const { data: propertyCard } = await supabase
            .from("property_cards")
            .select("id")
            .eq("property_number", item.propertyNumber)
            .single();

          if (propertyCard) {
            // Create a property card entry for the transfer
            const { error: entryErr } = await supabase
              .from("property_card_entries")
              .insert({
                property_card_id: propertyCard.id,
                date: dateCompleted || new Date().toISOString().split("T")[0],
                reference: transfer.itrNumber,
                receipt_qty: 0,
                unit_cost: 0,
                total_cost: 0,
                issue_item_no: transfer.itrNumber,
                issue_qty: item.quantity || 1,
                office_officer: `${transfer.toAccountableOfficer}${toCustodianPosition ? ` (${toCustodianPosition})` : ""}`,
                balance_qty: item.quantity || 1,
                amount: item.amount || 0,
                remarks: `Transferred from ${transfer.fromAccountableOfficer} to ${transfer.toAccountableOfficer} via ITR ${transfer.itrNumber}`,
              });

            if (entryErr) {
              console.error(`Failed to create property card entry for ${item.propertyNumber}:`, entryErr);
            } else {
              console.log(`✅ Created property card entry for ${item.propertyNumber}`);
            }
          }
        }

        // Invalidate React Query caches to refresh the UI
        queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
        queryClient.invalidateQueries({ queryKey: ['custodian-summaries'] });
        queryClient.invalidateQueries({ queryKey: ['custodian-summary'] });
        queryClient.invalidateQueries({ queryKey: ['custodian-current-items'] });
        queryClient.invalidateQueries({ queryKey: ['custodian-item-history'] });
        
        // Force refetch to ensure UI updates immediately
        queryClient.refetchQueries({ queryKey: ['inventory-items'] });
        queryClient.refetchQueries({ queryKey: ['custodian-summaries'] });
      }

      // Update local state
      setTransfers((prev) =>
        prev.map((t) => {
          if (t.id !== transferId) return t;
          const timestamp = new Date().toISOString();

          return {
            ...t,
            status: newStatus,
            dateCompleted: newStatus === "Completed" ? dateCompleted : t.dateCompleted,
            history: [
              ...t.history,
              {
                timestamp,
                status: newStatus,
                action: `Status changed to ${newStatus}`,
                details:
                  newStatus === "Completed"
                    ? "Transfer marked as completed. Items have been reassigned to the new custodian."
                    : newStatus === "Rejected"
                    ? "Transfer was rejected."
                    : undefined,
              },
            ],
          };
        })
      );

      toast({
        title: "Status updated",
        description:
          newStatus === "Completed"
            ? `Transfer marked as completed. ${transfer.items?.length || 0} item(s) have been reassigned to ${transfer.toAccountableOfficer}.`
            : `Transfer marked as ${newStatus}.`,
      });
    } catch (err) {
      console.error("Error updating transfer status:", err);
      toast({
        title: "Error updating status",
        description: err instanceof Error ? err.message : "Failed to update transfer status",
        variant: "destructive",
      });
    }
  };

  // Confirm/Issue transfer mutation (similar to ICS confirmation)
  const confirmTransferMutation = useMutation({
    mutationFn: async (transferId: string) => {
      // Update transfer status to Issued
      const { error: updateError } = await supabase
        .from("property_transfers")
        .update({ 
          status: 'Issued',
          updated_at: new Date().toISOString()
        })
        .eq("id", transferId);

      if (updateError) {
        throw new Error(`Failed to confirm transfer: ${updateError.message}`);
      }
    },
    onSuccess: () => {
      toast({ 
        title: "Success", 
        description: "Transfer has been officially confirmed and cannot be deleted" 
      });
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.refetchQueries({ queryKey: ['transfers'] });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const handleConfirmTransfer = (transferId: string) => {
    if (confirm("Are you sure you want to officially confirm this transfer? Once confirmed, it cannot be deleted and will be marked as an official document.")) {
      confirmTransferMutation.mutate(transferId);
    }
  };

  const handleDeleteTransfer = async (transferId: string) => {
    // Get transfer to check status
    const transfer = transfers.find((t) => t.id === transferId);
    if (transfer?.status === "Issued") {
      toast({
        title: "Cannot delete",
        description: "Issued transfers cannot be deleted. Only Draft transfers can be deleted.",
        variant: "destructive",
      });
      return;
    }

    if (!window.confirm("Are you sure you want to delete this transfer? This action cannot be undone.")) {
      return;
    }

    try {
      // Delete transfer items first (due to foreign key)
      const { error: itemsError } = await supabase
        .from("transfer_items")
        .delete()
        .eq("transfer_id", transferId);

      if (itemsError) throw itemsError;

      // Delete transfer
      const { error: transferError } = await supabase
        .from("property_transfers")
        .delete()
        .eq("id", transferId);

      if (transferError) throw transferError;

      // Remove from local state
      setTransfers((prev) => prev.filter((t) => t.id !== transferId));

      toast({
        title: "Transfer deleted",
        description: "The transfer has been permanently removed.",
      });
    } catch (err) {
      console.error("Error deleting transfer:", err);
      toast({
        title: "Error deleting transfer",
        description: err instanceof Error ? err.message : "Failed to delete transfer",
        variant: "destructive",
      });
    }
  };

  const handlePrint = (transfer: Transfer) => {
    setSelectedTransfer(transfer);
    // Use a longer timeout to ensure DOM is updated before printing
    setTimeout(() => {
      window.print();
      // Clear the transfer after printing
      setTimeout(() => {
        setSelectedTransfer(null);
      }, 500);
    }, 300);
  };

  const handleExport = () => {
    if (!filteredTransfers.length) {
      toast({
        title: "Nothing to export",
        description: "Adjust the filters to include at least one transfer before exporting.",
        variant: "destructive",
      });
      return;
    }

    const rows = [
      [
        "ITR No.",
        "Entity",
        "Fund Cluster",
        "From Officer",
        "To Officer",
        "Date",
        "Transfer Type",
        "Status",
        "Reason",
        "Item Count",
        "Items",
        "Total Amount",
      ],
    ];

    filteredTransfers.forEach((transfer) => {
      const totalAmount = transfer.items.reduce((sum, item) => sum + (item.amount ?? 0), 0);
      const itemSummary = transfer.items
        .map((item) => `${item.propertyNumber} - ${item.description}`)
        .join("; ");

      rows.push([
        transfer.itrNumber,
        transfer.entityName,
        transfer.fundCluster,
        formatCustodianLine(transfer.fromAccountableOfficer, transfer.fromAccountableOfficerDepartment),
        formatCustodianLine(transfer.toAccountableOfficer, transfer.toAccountableOfficerDepartment),
        transfer.date,
        transfer.transferType === "Others" && transfer.otherTransferType
          ? `${transfer.transferType} (${transfer.otherTransferType})`
          : transfer.transferType,
        transfer.status,
        transfer.reason,
        transfer.items.length.toString(),
        itemSummary,
        totalAmount ? formatCurrency(totalAmount) : "",
      ]);
    });

    downloadCsv(`inventory-transfers-${Date.now()}.csv`, rows);
  };

  const handleRemoveItem = (propertyNumber: string) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.propertyNumber !== propertyNumber),
    }));
  };

  const handleOpenItemSelector = () => {
    if (!formData.fromAccountableOfficer) {
      toast({
        title: "Select an accountable officer first",
        description: "Please choose the releasing accountable officer to filter the ICS items.",
        variant: "destructive",
      });
      return;
    }
    setItemSelectorOpen(true);
  };

  const handleToggleItemSelection = (itemId: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleConfirmItemSelection = () => {
    const selectedOptions = availableIcsItems.filter((item) => selectedItemIds.includes(item.id));
    if (!selectedOptions.length) {
      toast({
        title: "No items selected",
        description: "Choose at least one item from the list before confirming.",
        variant: "destructive",
      });
      return;
    }

    setFormData((prev) => {
      const merged = new Map<string, TransferItem>();
      prev.items.forEach((item) => merged.set(item.propertyNumber, item));
      selectedOptions
        .map(mapOptionToTransferItem)
        .forEach((item) => merged.set(item.propertyNumber, item));
      return {
        ...prev,
        items: Array.from(merged.values()),
      };
    });

    setSelectedItemIds([]);
    setItemSelectorOpen(false);
  };

  const previewTransfer: Transfer = useMemo(
    () => ({
      id: "preview",
      entityName: formData.entityName,
      fromAccountableOfficer: formData.fromAccountableOfficer,
      fromAccountableOfficerDepartment: formData.fromAccountableOfficerDepartment,
      toAccountableOfficer: formData.toAccountableOfficer,
      toAccountableOfficerDepartment: formData.toAccountableOfficerDepartment,
      fundCluster: formData.fundCluster,
      itrNumber: formData.itrNumber,
      date: formData.date,
      transferType: formData.transferType,
      otherTransferType: formData.otherTransferType,
      reason: formData.reason,
      status: formData.status,
      items: formData.items,
      history: [],
    }),
    [formData]
  );

  const totalSelectedAmount = formData.items.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const isPreviewReady =
    isCreating &&
    (formData.entityName ||
      formData.fundCluster ||
      formData.itrNumber ||
      formData.items.length > 0 ||
      formData.reason);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-foreground">Property Transfers</h1>
        <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Transfer
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by ITR no., officer, reason, or item…"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All status</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Issued">Issued</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={transferTypeFilter} onValueChange={setTransferTypeFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by transfer type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All types</SelectItem>
            {TRANSFER_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={fromDateFilter}
          onChange={(event) => setFromDateFilter(event.target.value)}
          placeholder="From date"
        />
        <Input
          type="date"
          value={toDateFilter}
          onChange={(event) => setToDateFilter(event.target.value)}
          placeholder="To date"
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={handleExport} className="flex-1 sm:flex-none">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="flex-1 sm:flex-none"
            onClick={() => {
              setStatusFilter("All");
              setTransferTypeFilter("All");
              setFromDateFilter("");
              setToDateFilter("");
              setSearchTerm("");
            }}
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {isCreating && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card>
            <CardHeader>
              <CardTitle>Create Inventory Transfer Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="entityName">Entity Name *</Label>
                  <Input
                    id="entityName"
                    list="entity-suggestions"
                    value={formData.entityName}
                    onChange={(event) => setFormData({ ...formData, entityName: event.target.value })}
                    placeholder="PROVINCIAL GOVERNMENT OF APAYAO"
                  />
                  <datalist id="entity-suggestions">
                    {entitySuggestions.map((value) => (
                      <option key={value} value={value} />
                    ))}
                  </datalist>
                  {errors.entityName && (
                    <p className="mt-1 text-sm text-destructive">{errors.entityName}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Suggested: PROVINCIAL GOVERNMENT OF APAYAO (used across property cards and ICS forms)
                  </p>
                </div>
                <div>
                  <Label htmlFor="fundCluster">Fund Cluster *</Label>
                  <Input
                    id="fundCluster"
                    value={formData.fundCluster}
                    onChange={(event) => setFormData({ ...formData, fundCluster: event.target.value })}
                    placeholder="e.g., 101"
                  />
                  {errors.fundCluster && (
                    <p className="mt-1 text-sm text-destructive">{errors.fundCluster}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="itrNumber">ITR No. *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="itrNumber"
                      value={formData.itrNumber}
                      onChange={(event) =>
                        setFormData({ ...formData, itrNumber: event.target.value.toUpperCase() })
                      }
                      placeholder="ITR-2025-0001"
                    />
                    <Button type="button" variant="outline" onClick={handleGenerateItrNumber}>
                      Generate
                    </Button>
                  </div>
                  {errors.itrNumber && (
                    <p className="mt-1 text-sm text-destructive">{errors.itrNumber}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Format suggestion: ITR-YYYY-#### (independent sequence from ICS numbers)
                  </p>
                </div>
                <div>
                  <Label htmlFor="transferDate">Date *</Label>
                  <Input
                    id="transferDate"
                    type="date"
                    value={formData.date}
                    onChange={(event) => setFormData({ ...formData, date: event.target.value })}
                  />
                  {errors.date && <p className="mt-1 text-sm text-destructive">{errors.date}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <CustodianSelector
                    className="space-y-1"
                    label="From Accountable Officer *"
                    value={formData.fromAccountableOfficer}
                    onChange={(name: string, custodian?: Custodian) =>
                      setFormData((prev) => ({
                        ...prev,
                        fromAccountableOfficer: name,
                        fromAccountableOfficerDepartment: custodian?.department_name,
                        fromAccountableOfficerId: custodian?.id,
                      }))
                    }
                    placeholder="Search custodians..."
                    required
                  />
                  {errors.fromOfficer && (
                    <p className="mt-1 text-sm text-destructive">{errors.fromOfficer}</p>
                  )}
                </div>
                <div>
                  <CustodianSelector
                    className="space-y-1"
                    label="To Accountable Officer *"
                    value={formData.toAccountableOfficer}
                    onChange={(name: string, custodian?: Custodian) =>
                      setFormData((prev) => ({
                        ...prev,
                        toAccountableOfficer: name,
                        toAccountableOfficerDepartment: custodian?.department_name,
                        toAccountableOfficerId: custodian?.id,
                      }))
                    }
                    placeholder="Search custodians..."
                    required
                  />
                  {errors.toOfficer && (
                    <p className="mt-1 text-sm text-destructive">{errors.toOfficer}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Transfer Type *</Label>
                  <Select
                    value={formData.transferType}
                    onValueChange={(value: TransferType) =>
                      setFormData((prev) => ({
                        ...prev,
                        transferType: value,
                        otherTransferType: value === "Others" ? prev.otherTransferType : "",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select transfer type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSFER_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formData.transferType === "Others" && (
                  <div>
                    <Label htmlFor="otherTransferType">Specify Other Transfer Type</Label>
                    <Input
                      id="otherTransferType"
                      value={formData.otherTransferType || ""}
                      onChange={(event) =>
                        setFormData({ ...formData, otherTransferType: event.target.value })
                      }
                      placeholder="Describe the transfer type"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-base font-semibold">Items to Transfer *</Label>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={handleOpenItemSelector}>
                      Select from ICS
                    </Button>
                    {isLoadingIcs && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  </div>
                </div>
                {errors.items && <p className="text-sm text-destructive">{errors.items}</p>}
                {formData.items.length === 0 ? (
                  <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground bg-muted/30">
                    Select items from existing ICS slips. The table will auto-fill Item No., ICS number/date,
                    description, amount, and condition.
                  </div>
                ) : (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">Item No.</TableHead>
                          <TableHead>ICS No./Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right w-[120px]">Amount</TableHead>
                          <TableHead className="w-[140px]">Condition</TableHead>
                          <TableHead className="w-[160px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formData.items.map((item) => {
                          const icsDisplay = [item.icsSlipNumber, item.icsDate].filter(Boolean).join(" / ");
                          return (
                            <TableRow key={item.propertyNumber}>
                              <TableCell className="font-medium">{item.propertyNumber}</TableCell>
                              <TableCell>{icsDisplay || "—"}</TableCell>
                              <TableCell>
                                <div className="font-medium">{item.description}</div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDate(item.dateAcquired)}
                                  {item.quantity ? ` • Qty: ${item.quantity}` : ""}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {item.amount !== undefined ? formatCurrency(item.amount) : "—"}
                              </TableCell>
                              <TableCell>{item.condition || "—"}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      navigate(`/property-cards?search=${encodeURIComponent(item.propertyNumber)}`)
                                    }
                                  >
                                    Card
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      navigate(
                                        `/custodian-slips?slip=${encodeURIComponent(item.icsSlipNumber || "")}`
                                      )
                                    }
                                  >
                                    ICS
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveItem(item.propertyNumber)}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    <div className="px-4 py-2 text-sm text-right text-muted-foreground border-t">
                      Total amount of selected items: <span className="font-semibold">{formatCurrency(totalSelectedAmount)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="reason">Reason for Transfer *</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(event) => setFormData({ ...formData, reason: event.target.value })}
                  placeholder="Provide the justification or remarks for this transfer."
                  rows={4}
                />
                {errors.reason && <p className="mt-1 text-sm text-destructive">{errors.reason}</p>}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleCreateTransfer}>
                  Save Transfer
                </Button>
              </div>
            </CardContent>
          </Card>

          {isPreviewReady && (
            <Card className="xl:sticky xl:top-24 h-fit">
              <CardHeader>
                <CardTitle>Print Preview</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Updates automatically as you complete the form. This mirrors the Annex A.5 layout.
                </p>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[70vh] pr-2">
                  {renderPrintLayout(previewTransfer, true)}
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredTransfers.map((transfer) => {
          const totalAmount = transfer.items.reduce((sum, item) => sum + (item.amount ?? 0), 0);
          return (
            <Card key={transfer.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{transfer.itrNumber}</CardTitle>
                    <p className="text-sm text-muted-foreground">{formatDate(transfer.date)}</p>
                  </div>
                  <Badge variant={transfer.status === "Draft" ? "secondary" : transfer.status === "Issued" ? "default" : transfer.status === "Completed" ? "default" : transfer.status === "Rejected" ? "destructive" : "secondary"} className="flex items-center gap-1">
                    {transfer.status === "Draft" ? <Clock className="h-3.5 w-3.5" /> : transfer.status === "Issued" ? <CheckCircle className="h-3.5 w-3.5" /> : transfer.status === "Completed" ? <CheckCircle className="h-3.5 w-3.5" /> : transfer.status === "Rejected" ? <AlertCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                    {transfer.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4 text-sm">
                <div className="space-y-1.5">
                  <p>
                    <strong>Entity:</strong> {transfer.entityName}
                  </p>
                  <p>
                    <strong>Fund Cluster:</strong> {transfer.fundCluster}
                  </p>
                  <p>
                    <strong>From:</strong>{" "}
                    {formatCustodianLine(
                      transfer.fromAccountableOfficer,
                      transfer.fromAccountableOfficerDepartment
                    ) || "—"}
                  </p>
                  <p>
                    <strong>To:</strong>{" "}
                    {formatCustodianLine(
                      transfer.toAccountableOfficer,
                      transfer.toAccountableOfficerDepartment
                    ) || "—"}
                  </p>
                  <p>
                    <strong>Transfer Type:</strong>{" "}
                    {transfer.transferType === "Others" && transfer.otherTransferType
                      ? `${transfer.transferType} – ${transfer.otherTransferType}`
                      : transfer.transferType}
                  </p>
                  <p>
                    <strong>Reason:</strong> {transfer.reason || "—"}
                  </p>
                  {totalAmount > 0 && (
                    <p>
                      <strong>Total Amount:</strong> {formatCurrency(totalAmount)}
                    </p>
                  )}
                </div>

                {transfer.items.length > 0 && (
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item No.</TableHead>
                          <TableHead>ICS</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transfer.items.map((item) => {
                          const icsDisplay = [item.icsSlipNumber, item.icsDate].filter(Boolean).join(" / ");
                          return (
                            <TableRow key={item.propertyNumber}>
                              <TableCell className="font-medium">{item.propertyNumber}</TableCell>
                              <TableCell>{icsDisplay || "—"}</TableCell>
                              <TableCell>
                                <div>{item.description}</div>
                                <div className="text-xs text-muted-foreground">
                                  {item.condition || "—"}
                                  {item.quantity ? ` • Qty: ${item.quantity}` : ""}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {item.amount !== undefined ? formatCurrency(item.amount) : "—"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <History className="h-4 w-4" />
                    History
                  </div>
                  <ScrollArea className="mt-2 max-h-32 pr-2">
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      {transfer.history.map((entry, index) => (
                        <div key={`${entry.timestamp}-${index}`}>
                          <span className="font-medium text-foreground">{formatDateTime(entry.timestamp)}</span>{" "}
                          — {entry.action} ({entry.status})
                          {entry.details && <div className="ml-5 text-[11px]">{entry.details}</div>}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div className="mt-auto flex flex-col gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => handlePrint(transfer)}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print Inventory Transfer Report
                  </Button>

                  {transfer.status === "Rejected" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="w-full"
                      onClick={() => handleDeleteTransfer(transfer.id)}
                    >
                      Delete Rejected Transfer
                    </Button>
                  )}

                  {/* Show Confirm button for Draft transfers (like ICS) */}
                  {(transfer.status === "Draft" || !transfer.status) && (
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleConfirmTransfer(transfer.id)}
                      disabled={confirmTransferMutation.isPending}
                      title="Confirm this transfer as official (cannot be deleted after confirmation)"
                    >
                      {confirmTransferMutation.isPending ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                          Confirming...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-3.5 w-3.5 mr-2" />
                          Confirm
                        </>
                      )}
                    </Button>
                  )}

                  {/* Show Delete button for Draft transfers only */}
                  {(transfer.status === "Draft" || !transfer.status) && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="flex-1 text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteTransfer(transfer.id)}
                      title="Delete this draft transfer"
                    >
                      Delete
                    </Button>
                  )}

                  {/* Show action buttons for Issued transfers */}
                  {transfer.status === "Issued" && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleStatusUpdate(transfer.id, "Completed")}
                      >
                        Mark Complete
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleStatusUpdate(transfer.id, "Rejected")}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {!filteredTransfers.length && (
          <Card className="col-span-full border-dashed border-muted-foreground/40">
            <CardHeader>
              <CardTitle className="text-lg">No transfers found</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Adjust the filters or create a new transfer to see it listed here.
            </CardContent>
          </Card>
        )}
      </div>

      {selectedTransfer && (
        <div className="print-only" ref={printRef} style={{ display: 'none' }}>
          {renderPrintLayout(selectedTransfer)}
        </div>
      )}

      <Dialog open={isItemSelectorOpen} onOpenChange={setItemSelectorOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Select Items from ICS</DialogTitle>
            <DialogDescription>
              Showing items issued to {formData.fromAccountableOfficer || "the selected accountable officer"}.
              Choose the items that will be transferred.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Input
              placeholder="Search by item number, description, ICS number…"
              value={itemSearchTerm}
              onChange={(event) => setItemSearchTerm(event.target.value)}
            />
            <div className="border rounded-md h-[360px] overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]" />
                    <TableHead>Item No.</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>ICS No.</TableHead>
                    <TableHead>Date Issued</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Condition</TableHead>
                  </TableRow>
                </TableHeader>
              </Table>
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableBody>
                    {isLoadingIcs ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">
                          <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading ICS items…
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : availableIcsItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                          No ICS items found for the selected officer. Adjust your search or confirm the officer selection.
                        </TableCell>
                      </TableRow>
                    ) : (
                      availableIcsItems.map((item) => {
                        const checked = selectedItemIds.includes(item.id);
                        return (
                          <TableRow
                            key={item.id}
                            className="cursor-pointer"
                            onClick={() => handleToggleItemSelection(item.id)}
                          >
                            <TableCell className="w-[40px]">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => handleToggleItemSelection(item.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{item.propertyNumber}</TableCell>
                            <TableCell>{item.description}</TableCell>
                            <TableCell>{item.icsSlipNumber}</TableCell>
                            <TableCell>{formatDate(item.icsDate)}</TableCell>
                            <TableCell>{item.amount !== undefined ? formatCurrency(item.amount) : "—"}</TableCell>
                            <TableCell>{item.condition || "—"}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {selectedItemIds.length
                ? `${selectedItemIds.length} item(s) selected`
                : "Select one or more items to add to the transfer."}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setItemSelectorOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleConfirmItemSelection}>
                Add Selected Items
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`
        @media print {
          .print-only { display: block !important; }
          body * { visibility: hidden; }
          .print-only, .print-only * { visibility: visible; }
          .print-only { position: absolute; left: 0; top: 0; width: 100%; }
        }
        .print-only { display: none; }
      `}</style>
    </div>
  );
};

