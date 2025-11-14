import { apiClient, ApiResponse, PaginatedResponse } from './client';

export interface CustodianSlip {
  id: string;
  slipNumber: string;
  custodianName: string;
  designation: string;
  office: string;
  dateIssued: string;
  issuedBy: string;
  receivedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustodianSlipItem {
  id: string;
  slipId: string;
  propertyNumber: string;
  description: string;
  quantity: number;
  unit: string;
  dateIssued: string;
  createdAt: string;
}

export interface CustodianSlipFilters {
  limit?: number;
  offset?: number;
  search?: string;
  office?: string;
}

export const custodianSlipApi = {
  // Get all custodian slips with pagination and filtering
  async getAll(filters: CustodianSlipFilters = {}): Promise<PaginatedResponse<CustodianSlip>> {
    return apiClient.get<PaginatedResponse<CustodianSlip>>('/custodian-slips', filters);
  },

  // Get custodian slip by ID
  async getById(id: string): Promise<ApiResponse<CustodianSlip>> {
    return apiClient.get<CustodianSlip>(`/custodian-slips/${id}`);
  },

  // Get custodian slip by slip number
  async getBySlipNumber(slipNumber: string): Promise<ApiResponse<CustodianSlip>> {
    return apiClient.get<CustodianSlip>(`/custodian-slips/slip/${slipNumber}`);
  },

  // Create new custodian slip
  async create(slip: Omit<CustodianSlip, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<CustodianSlip>> {
    return apiClient.post<CustodianSlip>('/custodian-slips', slip);
  },

  // Update custodian slip
  async update(id: string, updates: Partial<CustodianSlip>): Promise<ApiResponse<CustodianSlip>> {
    return apiClient.put<CustodianSlip>(`/custodian-slips/${id}`, updates);
  },

  // Delete custodian slip
  async delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/custodian-slips/${id}`);
  },

  // Get custodian slip with items
  async getWithItems(id: string): Promise<ApiResponse<CustodianSlip & { items: CustodianSlipItem[] }>> {
    return apiClient.get<CustodianSlip & { items: CustodianSlipItem[] }>(`/custodian-slips/${id}/items`);
  },

  // Add item to custodian slip
  async addItem(slipId: string, item: Omit<CustodianSlipItem, 'id' | 'slipId' | 'createdAt'>): Promise<ApiResponse<CustodianSlipItem>> {
    return apiClient.post<CustodianSlipItem>(`/custodian-slips/${slipId}/items`, item);
  },

  // Update custodian slip item
  async updateItem(slipId: string, itemId: string, updates: Partial<CustodianSlipItem>): Promise<ApiResponse<CustodianSlipItem>> {
    return apiClient.put<CustodianSlipItem>(`/custodian-slips/${slipId}/items/${itemId}`, updates);
  },

  // Delete custodian slip item
  async deleteItem(slipId: string, itemId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/custodian-slips/${slipId}/items/${itemId}`);
  },

  // Get items for custodian slip
  async getItems(slipId: string): Promise<ApiResponse<CustodianSlipItem[]>> {
    return apiClient.get<CustodianSlipItem[]>(`/custodian-slips/${slipId}/items`);
  },

  // Search custodian slips
  async search(query: string, filters: Omit<CustodianSlipFilters, 'search'> = {}): Promise<PaginatedResponse<CustodianSlip>> {
    return apiClient.get<PaginatedResponse<CustodianSlip>>('/custodian-slips/search', { ...filters, search: query });
  },

  // Get custodian slips by office
  async getByOffice(office: string, filters: Omit<CustodianSlipFilters, 'office'> = {}): Promise<PaginatedResponse<CustodianSlip>> {
    return apiClient.get<PaginatedResponse<CustodianSlip>>('/custodian-slips/office', { ...filters, office });
  },

  // Print custodian slip
  async print(id: string): Promise<ApiResponse<{ printData: any }>> {
    return apiClient.get<{ printData: any }>(`/custodian-slips/${id}/print`);
  },
};
