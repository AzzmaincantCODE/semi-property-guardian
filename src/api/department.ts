import { apiClient, ApiResponse, PaginatedResponse } from './client';

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  headOfficer?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentFilters {
  limit?: number;
  offset?: number;
  isActive?: boolean;
  search?: string;
}

export const departmentApi = {
  // Get all departments with pagination and filtering
  async getAll(filters: DepartmentFilters = {}): Promise<PaginatedResponse<Department>> {
    return apiClient.get<PaginatedResponse<Department>>('/departments', filters);
  },

  // Get department by ID
  async getById(id: string): Promise<ApiResponse<Department>> {
    return apiClient.get<Department>(`/departments/${id}`);
  },

  // Get department by code
  async getByCode(code: string): Promise<ApiResponse<Department>> {
    return apiClient.get<Department>(`/departments/code/${code}`);
  },

  // Create new department
  async create(department: Omit<Department, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Department>> {
    return apiClient.post<Department>('/departments', department);
  },

  // Update department
  async update(id: string, updates: Partial<Department>): Promise<ApiResponse<Department>> {
    return apiClient.put<Department>(`/departments/${id}`, updates);
  },

  // Delete department
  async delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/departments/${id}`);
  },

  // Activate department
  async activate(id: string): Promise<ApiResponse<Department>> {
    return apiClient.patch<Department>(`/departments/${id}/activate`);
  },

  // Deactivate department
  async deactivate(id: string): Promise<ApiResponse<Department>> {
    return apiClient.patch<Department>(`/departments/${id}/deactivate`);
  },

  // Search departments
  async search(query: string, filters: Omit<DepartmentFilters, 'search'> = {}): Promise<PaginatedResponse<Department>> {
    return apiClient.get<PaginatedResponse<Department>>('/departments/search', { ...filters, search: query });
  },

  // Get active departments
  async getActive(filters: Omit<DepartmentFilters, 'isActive'> = {}): Promise<PaginatedResponse<Department>> {
    return apiClient.get<PaginatedResponse<Department>>('/departments/active', { ...filters, isActive: true });
  },
};
