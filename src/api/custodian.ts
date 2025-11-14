import { apiClient, ApiResponse, PaginatedResponse } from './client';

export interface Custodian {
  id: string;
  custodianNo: string;
  name: string;
  position?: string;
  departmentId?: string;
  departmentName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustodianItemHistory {
  id: string;
  propertyNumber: string;
  description: string;
  category: string;
  subCategory?: string;
  unitCost: number;
  totalCost: number;
  condition: string;
  status: string;
  assignmentStatus: string;
  assignedDate?: string;
  custodianSlipId: string;
  custodianSlipNumber: string;
  dateIssued: string;
  dateReturned?: string;
  isCurrentlyAssigned: boolean;
}

export interface CustodianSummary {
  custodian: Custodian;
  totalItemsAssigned: number;
  totalValueAssigned: number;
  currentlyAssignedItems: number;
  currentlyAssignedValue: number;
  historicalItems: number;
  historicalValue: number;
  lastActivityDate?: string;
}

export interface CustodianFilters {
  limit?: number;
  offset?: number;
  search?: string;
  departmentId?: string;
  isActive?: boolean;
}

export const custodianApi = {
  // Get all custodians with pagination and filtering
  async getAll(filters: CustodianFilters = {}): Promise<PaginatedResponse<Custodian>> {
    return apiClient.get<PaginatedResponse<Custodian>>('/custodians', filters);
  },

  // Get custodian by ID
  async getById(id: string): Promise<ApiResponse<Custodian>> {
    return apiClient.get<Custodian>(`/custodians/${id}`);
  },

  // Get custodian by custodian number
  async getByCustodianNo(custodianNo: string): Promise<ApiResponse<Custodian>> {
    return apiClient.get<Custodian>(`/custodians/custodian-no/${custodianNo}`);
  },

  // Create new custodian
  async create(custodian: Omit<Custodian, 'id' | 'createdAt' | 'updatedAt' | 'custodianNo'>): Promise<ApiResponse<Custodian>> {
    return apiClient.post<Custodian>('/custodians', custodian);
  },

  // Update custodian
  async update(id: string, updates: Partial<Custodian>): Promise<ApiResponse<Custodian>> {
    return apiClient.put<Custodian>(`/custodians/${id}`, updates);
  },

  // Delete custodian
  async delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/custodians/${id}`);
  },

  // Get custodian summary with statistics
  async getSummary(id: string): Promise<ApiResponse<CustodianSummary>> {
    return apiClient.get<CustodianSummary>(`/custodians/${id}/summary`);
  },

  // Get custodian item history
  async getItemHistory(id: string, filters: { limit?: number; offset?: number; includeReturned?: boolean } = {}): Promise<PaginatedResponse<CustodianItemHistory>> {
    return apiClient.get<PaginatedResponse<CustodianItemHistory>>(`/custodians/${id}/items`, filters);
  },

  // Get currently assigned items for custodian
  async getCurrentItems(id: string): Promise<ApiResponse<CustodianItemHistory[]>> {
    return apiClient.get<CustodianItemHistory[]>(`/custodians/${id}/current-items`);
  },

  // Search custodians
  async search(query: string, filters: Omit<CustodianFilters, 'search'> = {}): Promise<PaginatedResponse<Custodian>> {
    return apiClient.get<PaginatedResponse<Custodian>>('/custodians/search', { ...filters, search: query });
  },

  // Get custodians by department
  async getByDepartment(departmentId: string, filters: Omit<CustodianFilters, 'departmentId'> = {}): Promise<PaginatedResponse<Custodian>> {
    return apiClient.get<PaginatedResponse<Custodian>>('/custodians/department', { ...filters, departmentId });
  },

  // Get all custodian summaries
  async getAllSummaries(filters: CustodianFilters = {}): Promise<PaginatedResponse<CustodianSummary>> {
    return apiClient.get<PaginatedResponse<CustodianSummary>>('/custodians/summaries', filters);
  },
};
