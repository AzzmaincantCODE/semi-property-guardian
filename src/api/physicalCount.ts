import { apiClient, ApiResponse, PaginatedResponse } from './client';

export interface PhysicalCount {
  id: string;
  countNumber: string;
  department: string;
  countDate: string;
  countType: 'Annual' | 'Quarterly' | 'Special' | 'Spot Check';
  status: 'Planned' | 'In Progress' | 'Completed' | 'Under Review';
  conductedBy: string[];
  witnessedBy: string;
  approvedBy: string;
  totalExpected: number;
  totalActual: number;
  totalVariance: number;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PhysicalCountItem {
  id: string;
  countId: string;
  propertyNumber: string;
  description: string;
  expectedQuantity: number;
  actualQuantity: number;
  condition: 'Serviceable' | 'For Repair' | 'Unserviceable' | 'Missing';
  location: string;
  remarks?: string;
  variance: number;
  createdAt: string;
}

export interface PhysicalCountFilters {
  limit?: number;
  offset?: number;
  status?: string;
  countType?: string;
  department?: string;
  search?: string;
}

export const physicalCountApi = {
  // Get all physical counts with pagination and filtering
  async getAll(filters: PhysicalCountFilters = {}): Promise<PaginatedResponse<PhysicalCount>> {
    return apiClient.get<PaginatedResponse<PhysicalCount>>('/physical-counts', filters);
  },

  // Get physical count by ID
  async getById(id: string): Promise<ApiResponse<PhysicalCount>> {
    return apiClient.get<PhysicalCount>(`/physical-counts/${id}`);
  },

  // Get physical count by count number
  async getByCountNumber(countNumber: string): Promise<ApiResponse<PhysicalCount>> {
    return apiClient.get<PhysicalCount>(`/physical-counts/count/${countNumber}`);
  },

  // Create new physical count
  async create(count: Omit<PhysicalCount, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<PhysicalCount>> {
    return apiClient.post<PhysicalCount>('/physical-counts', count);
  },

  // Update physical count
  async update(id: string, updates: Partial<PhysicalCount>): Promise<ApiResponse<PhysicalCount>> {
    return apiClient.put<PhysicalCount>(`/physical-counts/${id}`, updates);
  },

  // Delete physical count
  async delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/physical-counts/${id}`);
  },

  // Get physical count with items
  async getWithItems(id: string): Promise<ApiResponse<PhysicalCount & { items: PhysicalCountItem[] }>> {
    return apiClient.get<PhysicalCount & { items: PhysicalCountItem[] }>(`/physical-counts/${id}/items`);
  },

  // Add item to physical count
  async addItem(countId: string, item: Omit<PhysicalCountItem, 'id' | 'countId' | 'createdAt'>): Promise<ApiResponse<PhysicalCountItem>> {
    return apiClient.post<PhysicalCountItem>(`/physical-counts/${countId}/items`, item);
  },

  // Update physical count item
  async updateItem(countId: string, itemId: string, updates: Partial<PhysicalCountItem>): Promise<ApiResponse<PhysicalCountItem>> {
    return apiClient.put<PhysicalCountItem>(`/physical-counts/${countId}/items/${itemId}`, updates);
  },

  // Delete physical count item
  async deleteItem(countId: string, itemId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/physical-counts/${countId}/items/${itemId}`);
  },

  // Get items for physical count
  async getItems(countId: string): Promise<ApiResponse<PhysicalCountItem[]>> {
    return apiClient.get<PhysicalCountItem[]>(`/physical-counts/${countId}/items`);
  },

  // Calculate totals for physical count
  async calculateTotals(countId: string): Promise<ApiResponse<{
    totalExpected: number;
    totalActual: number;
    totalVariance: number;
  }>> {
    return apiClient.get<{
      totalExpected: number;
      totalActual: number;
      totalVariance: number;
    }>(`/physical-counts/${countId}/totals`);
  },

  // Update totals for physical count
  async updateTotals(countId: string): Promise<ApiResponse<PhysicalCount>> {
    return apiClient.patch<PhysicalCount>(`/physical-counts/${countId}/totals`);
  },

  // Start physical count
  async start(id: string): Promise<ApiResponse<PhysicalCount>> {
    return apiClient.patch<PhysicalCount>(`/physical-counts/${id}/start`);
  },

  // Complete physical count
  async complete(id: string): Promise<ApiResponse<PhysicalCount>> {
    return apiClient.patch<PhysicalCount>(`/physical-counts/${id}/complete`);
  },

  // Search physical counts
  async search(query: string, filters: Omit<PhysicalCountFilters, 'search'> = {}): Promise<PaginatedResponse<PhysicalCount>> {
    return apiClient.get<PaginatedResponse<PhysicalCount>>('/physical-counts/search', { ...filters, search: query });
  },

  // Get physical counts by status
  async getByStatus(status: string, filters: Omit<PhysicalCountFilters, 'status'> = {}): Promise<PaginatedResponse<PhysicalCount>> {
    return apiClient.get<PaginatedResponse<PhysicalCount>>('/physical-counts/status', { ...filters, status });
  },

  // Get physical counts by type
  async getByType(countType: string, filters: Omit<PhysicalCountFilters, 'countType'> = {}): Promise<PaginatedResponse<PhysicalCount>> {
    return apiClient.get<PaginatedResponse<PhysicalCount>>('/physical-counts/type', { ...filters, countType });
  },

  // Get physical counts by department
  async getByDepartment(department: string, filters: Omit<PhysicalCountFilters, 'department'> = {}): Promise<PaginatedResponse<PhysicalCount>> {
    return apiClient.get<PaginatedResponse<PhysicalCount>>('/physical-counts/department', { ...filters, department });
  },
};
