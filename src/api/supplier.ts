import { apiClient, ApiResponse, PaginatedResponse } from './client';

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierFilters {
  limit?: number;
  offset?: number;
  isActive?: boolean;
  search?: string;
}

export const supplierApi = {
  // Get all suppliers with pagination and filtering
  async getAll(filters: SupplierFilters = {}): Promise<PaginatedResponse<Supplier>> {
    return apiClient.get<PaginatedResponse<Supplier>>('/suppliers', filters);
  },

  // Get supplier by ID
  async getById(id: string): Promise<ApiResponse<Supplier>> {
    return apiClient.get<Supplier>(`/suppliers/${id}`);
  },

  // Get supplier by name
  async getByName(name: string): Promise<ApiResponse<Supplier>> {
    return apiClient.get<Supplier>(`/suppliers/name/${name}`);
  },

  // Create new supplier
  async create(supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Supplier>> {
    return apiClient.post<Supplier>('/suppliers', supplier);
  },

  // Update supplier
  async update(id: string, updates: Partial<Supplier>): Promise<ApiResponse<Supplier>> {
    return apiClient.put<Supplier>(`/suppliers/${id}`, updates);
  },

  // Delete supplier
  async delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/suppliers/${id}`);
  },

  // Activate supplier
  async activate(id: string): Promise<ApiResponse<Supplier>> {
    return apiClient.patch<Supplier>(`/suppliers/${id}/activate`);
  },

  // Deactivate supplier
  async deactivate(id: string): Promise<ApiResponse<Supplier>> {
    return apiClient.patch<Supplier>(`/suppliers/${id}/deactivate`);
  },

  // Search suppliers
  async search(query: string, filters: Omit<SupplierFilters, 'search'> = {}): Promise<PaginatedResponse<Supplier>> {
    return apiClient.get<PaginatedResponse<Supplier>>('/suppliers/search', { ...filters, search: query });
  },

  // Get active suppliers
  async getActive(filters: Omit<SupplierFilters, 'isActive'> = {}): Promise<PaginatedResponse<Supplier>> {
    return apiClient.get<PaginatedResponse<Supplier>>('/suppliers/active', { ...filters, isActive: true });
  },
};
