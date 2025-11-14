// Unified Annex-compliant data structures
// This file defines the proper data flow: Inventory → Property Cards → Custodian Slips

export interface AnnexInventoryItem {
  id: string;
  propertyNumber: string;
  description: string;
  brand: string;
  model: string;
  serialNumber: string;
  unitOfMeasure: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  dateAcquired: string;
  supplier: string;
  condition: 'Serviceable' | 'Unserviceable' | 'For Repair' | 'Lost' | 'Stolen' | 'Damaged' | 'Destroyed';
  location: string;
  custodian: string;
  custodianPosition: string;
  accountableOfficer: string;
  fundSource: string;
  remarks?: string;
  lastInventoryDate?: string;
  category: 'Semi-Expendable' | 'Equipment' | 'Furniture';
  status: 'Active' | 'Transferred' | 'Disposed' | 'Missing';
  // Annex-specific fields
  assignmentStatus: 'Available' | 'Assigned' | 'In-Transit' | 'Disposed';
  assignedDate?: string;
  createdAt: string;
  updatedAt: string;
}

// Semi-Expendable Property Card (Annex A.1)
export interface AnnexPropertyCard {
  id: string;
  entityName: string;
  fundCluster: string;
  semiExpendableProperty: string;
  propertyNumber: string;
  description: string;
  dateAcquired: string;
  remarks?: string;
  // Link to the original inventory item
  inventoryItemId: string;
  entries: AnnexSPCEntry[];
  createdAt: string;
  updatedAt: string;
}

// Property Card Entry (follows Annex A.1 format exactly)
export interface AnnexSPCEntry {
  id: string;
  propertyCardId: string;
  date: string;
  reference: string;
  // Receipt columns
  receiptQty: number;
  unitCost: number;
  totalCost: number;
  // Issue/Transfer/Disposal columns
  issueItemNo: string;
  issueQty: number;
  officeOfficer: string;
  // Balance and Amount
  balanceQty: number;
  amount: number;
  remarks?: string;
  // Link to related transactions
  relatedSlipId?: string; // Links to custodian slip if this entry is from a slip
  relatedTransferId?: string; // Links to transfer if this entry is from a transfer
  createdAt: string;
  updatedAt: string;
}

// Inventory Custodian Slip (ICS)
export interface AnnexCustodianSlip {
  id: string;
  slipNumber: string;
  custodianName: string;
  designation: string;
  office: string;
  dateIssued: string;
  issuedBy: string;
  receivedBy: string;
  slipStatus: 'Draft' | 'Issued' | 'Completed' | 'Cancelled';
  items: AnnexCustodianSlipItem[];
  createdAt: string;
  updatedAt: string;
}

// Custodian Slip Item (links back to inventory and creates property card entries)
export interface AnnexCustodianSlipItem {
  id: string;
  slipId: string;
  inventoryItemId: string; // Direct link to inventory item
  propertyNumber: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number; // Unit cost of the inventory item
  totalCost: number; // Calculated: quantity x unitCost
  amount: number; // Same as totalCost, but explicit for Annex compliance
  itemNumber: string; // Item number assigned to the inventory item issued (sequential per slip)
  estimatedUsefulLife?: string; // Estimated useful life of the item
  dateIssued: string;
  // Auto-generated when slip is created
  propertyCardEntryId?: string; // Links to the SPC entry created for this item
  createdAt: string;
  updatedAt: string;
}

// Data flow interfaces for operations
export interface CreateCustodianSlipRequest {
  custodianName: string;
  designation: string;
  office: string;
  dateIssued: string;
  issuedBy: string;
  receivedBy: string;
  inventoryItemIds: string[]; // Items to assign to this custodian
}

export interface CreatePropertyCardFromInventoryRequest {
  inventoryItemId: string;
  entityName: string;
  fundCluster: string;
  initialEntry?: {
    date: string;
    reference: string;
    receiptQty: number;
    unitCost: number;
    totalCost: number;
  };
}

// Print data structures (for reports)
export interface AnnexSPCPrintData {
  entityName: string;
  fundCluster: string;
  semiExpendableProperty: string;
  description: string;
  propertyNumber: string;
  entries: AnnexSPCEntry[];
  remarks: string;
}

export interface AnnexICSPrintData {
  slipNumber: string;
  entityName: string; // Entity Name (same as custodian name for ICS)
  fundCluster: string; // Fund Cluster from fund source
  custodianName: string;
  designation: string;
  office: string;
  dateIssued: string;
  issuedBy: string;
  receivedBy: string;
  items: {
    itemNumber: string; // Item No. - sequential number within the slip
    propertyNumber: string;
    description: string;
    quantity: number;
    unit: string;
    unitCost: number; // Unit cost of the inventory item
    totalCost: number; // Calculated: quantity × unitCost
    amount: number; // Same as totalCost, for Annex compliance
    estimatedUsefulLife?: string; // Estimated useful life of the item
    dateIssued?: string;
  }[];
  totalAmount: number; // Sum of all item amounts
}
