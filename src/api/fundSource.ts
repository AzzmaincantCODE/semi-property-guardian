import { apiClient, ApiResponse, PaginatedResponse } from './client';

export interface FundSource {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FundSourceFilters {
  limit?: number;
  offset?: number;
  isActive?: boolean;
  search?: string;
}

export const fundSourceApi = {
  // Get all fund sources with pagination and filtering
  async getAll(filters: FundSourceFilters = {}): Promise<PaginatedResponse<FundSource>> {
    return apiClient.get<PaginatedResponse<FundSource>>('/fund-sources', filters);
  },

  // Get fund source by ID
  async getById(id: string): Promise<ApiResponse<FundSource>> {
    return apiClient.get<FundSource>(`/fund-sources/${id}`);
  },

  // Get fund source by code
  async getByCode(code: string): Promise<ApiResponse<FundSource>> {
    return apiClient.get<FundSource>(`/fund-sources/code/${code}`);
  },

  // Create new fund source
  async create(fundSource: Omit<FundSource, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<FundSource>> {
    return apiClient.post<FundSource>('/fund-sources', fundSource);
  },

  // Update fund source
  async update(id: string, updates: Partial<FundSource>): Promise<ApiResponse<FundSource>> {
    return apiClient.put<FundSource>(`/fund-sources/${id}`, updates);
  },

  // Delete fund source
  async delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/fund-sources/${id}`);
  },

  // Activate fund source
  async activate(id: string): Promise<ApiResponse<FundSource>> {
    return apiClient.patch<FundSource>(`/fund-sources/${id}/activate`);
  },

  // Deactivate fund source
  async deactivate(id: string): Promise<ApiResponse<FundSource>> {
    return apiClient.patch<FundSource>(`/fund-sources/${id}/deactivate`);
  },

  // Search fund sources
  async search(query: string, filters: Omit<FundSourceFilters, 'search'> = {}): Promise<PaginatedResponse<FundSource>> {
    return apiClient.get<PaginatedResponse<FundSource>>('/fund-sources/search', { ...filters, search: query });
  },

  // Get active fund sources
  async getActive(filters: Omit<FundSourceFilters, 'isActive'> = {}): Promise<PaginatedResponse<FundSource>> {
    return apiClient.get<PaginatedResponse<FundSource>>('/fund-sources/active', { ...filters, isActive: true });
  },
};
