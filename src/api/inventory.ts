import { apiClient, ApiResponse, PaginatedResponse } from './client';
import { InventoryItem } from '../types/inventory';

export interface InventoryFilters {
  limit?: number;
  offset?: number;
  category?: string;
  status?: string;
  condition?: string;
  search?: string;
}

export const inventoryApi = {
  // Get all inventory items with pagination and filtering
  async getAll(filters: InventoryFilters = {}): Promise<PaginatedResponse<InventoryItem>> {
    return apiClient.get<PaginatedResponse<InventoryItem>>('/inventory', filters);
  },

  // Get inventory item by ID
  async getById(id: string): Promise<ApiResponse<InventoryItem>> {
    return apiClient.get<InventoryItem>(`/inventory/${id}`);
  },

  // Get inventory item by property number
  async getByPropertyNumber(propertyNumber: string): Promise<ApiResponse<InventoryItem>> {
    return apiClient.get<InventoryItem>(`/inventory/property/${propertyNumber}`);
  },

  // Create new inventory item
  async create(item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<InventoryItem>> {
    return apiClient.post<InventoryItem>('/inventory', item);
  },

  // Update inventory item
  async update(id: string, updates: Partial<InventoryItem>): Promise<ApiResponse<InventoryItem>> {
    return apiClient.put<InventoryItem>(`/inventory/${id}`, updates);
  },

  // Delete inventory item
  async delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/inventory/${id}`);
  },

  // Get inventory statistics
  async getStatistics(): Promise<ApiResponse<{
    totalItems: number;
    totalValue: number;
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
    byCondition: Record<string, number>;
  }>> {
    return apiClient.get('/inventory/statistics');
  },

  // Search inventory items
  async search(query: string, filters: Omit<InventoryFilters, 'search'> = {}): Promise<PaginatedResponse<InventoryItem>> {
    return apiClient.get<PaginatedResponse<InventoryItem>>('/inventory/search', { ...filters, search: query });
  },

  // Get inventory by category
  async getByCategory(category: string, filters: Omit<InventoryFilters, 'category'> = {}): Promise<PaginatedResponse<InventoryItem>> {
    return apiClient.get<PaginatedResponse<InventoryItem>>('/inventory/category', { ...filters, category });
  },

  // Get inventory by status
  async getByStatus(status: string, filters: Omit<InventoryFilters, 'status'> = {}): Promise<PaginatedResponse<InventoryItem>> {
    return apiClient.get<PaginatedResponse<InventoryItem>>('/inventory/status', { ...filters, status });
  },

  // Get inventory by condition
  async getByCondition(condition: string, filters: Omit<InventoryFilters, 'condition'> = {}): Promise<PaginatedResponse<InventoryItem>> {
    return apiClient.get<PaginatedResponse<InventoryItem>>('/inventory/condition', { ...filters, condition });
  },

  // Update inventory item condition
  async updateCondition(id: string, condition: string): Promise<ApiResponse<InventoryItem>> {
    return apiClient.patch<InventoryItem>(`/inventory/${id}/condition`, { condition });
  },

  // Update inventory item status
  async updateStatus(id: string, status: string): Promise<ApiResponse<InventoryItem>> {
    return apiClient.patch<InventoryItem>(`/inventory/${id}/status`, { status });
  },

  // Transfer inventory item
  async transfer(id: string, toLocation: string, toCustodian: string, reason: string): Promise<ApiResponse<InventoryItem>> {
    return apiClient.patch<InventoryItem>(`/inventory/${id}/transfer`, {
      toLocation,
      toCustodian,
      reason,
    });
  },

  // Get inventory history
  async getHistory(id: string): Promise<ApiResponse<any[]>> {
    return apiClient.get<any[]>(`/inventory/${id}/history`);
  },
};
