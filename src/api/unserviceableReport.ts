import { apiClient, ApiResponse, PaginatedResponse } from './client';

export interface UnserviceableReport {
  id: string;
  reportNumber: string;
  reportDate: string;
  department: string;
  inspectedBy: string[];
  reviewPeriod: string;
  totalValue: number;
  createdAt: string;
  updatedAt: string;
}

export interface UnserviceableReportItem {
  id: string;
  reportId: string;
  propertyNumber: string;
  description: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  dateAcquired: string;
  condition: string;
  defects: string;
  recommendation: 'Repair' | 'Condemn' | 'Donate' | 'Sell';
  estimatedRepairCost?: number;
  createdAt: string;
}

export interface UnserviceableReportFilters {
  limit?: number;
  offset?: number;
  department?: string;
  search?: string;
}

export const unserviceableReportApi = {
  // Get all unserviceable reports with pagination and filtering
  async getAll(filters: UnserviceableReportFilters = {}): Promise<PaginatedResponse<UnserviceableReport>> {
    return apiClient.get<PaginatedResponse<UnserviceableReport>>('/unserviceable-reports', filters);
  },

  // Get unserviceable report by ID
  async getById(id: string): Promise<ApiResponse<UnserviceableReport>> {
    return apiClient.get<UnserviceableReport>(`/unserviceable-reports/${id}`);
  },

  // Get unserviceable report by report number
  async getByReportNumber(reportNumber: string): Promise<ApiResponse<UnserviceableReport>> {
    return apiClient.get<UnserviceableReport>(`/unserviceable-reports/report/${reportNumber}`);
  },

  // Create new unserviceable report
  async create(report: Omit<UnserviceableReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<UnserviceableReport>> {
    return apiClient.post<UnserviceableReport>('/unserviceable-reports', report);
  },

  // Update unserviceable report
  async update(id: string, updates: Partial<UnserviceableReport>): Promise<ApiResponse<UnserviceableReport>> {
    return apiClient.put<UnserviceableReport>(`/unserviceable-reports/${id}`, updates);
  },

  // Delete unserviceable report
  async delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/unserviceable-reports/${id}`);
  },

  // Get unserviceable report with items
  async getWithItems(id: string): Promise<ApiResponse<UnserviceableReport & { items: UnserviceableReportItem[] }>> {
    return apiClient.get<UnserviceableReport & { items: UnserviceableReportItem[] }>(`/unserviceable-reports/${id}/items`);
  },

  // Add item to unserviceable report
  async addItem(reportId: string, item: Omit<UnserviceableReportItem, 'id' | 'reportId' | 'createdAt'>): Promise<ApiResponse<UnserviceableReportItem>> {
    return apiClient.post<UnserviceableReportItem>(`/unserviceable-reports/${reportId}/items`, item);
  },

  // Update unserviceable report item
  async updateItem(reportId: string, itemId: string, updates: Partial<UnserviceableReportItem>): Promise<ApiResponse<UnserviceableReportItem>> {
    return apiClient.put<UnserviceableReportItem>(`/unserviceable-reports/${reportId}/items/${itemId}`, updates);
  },

  // Delete unserviceable report item
  async deleteItem(reportId: string, itemId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/unserviceable-reports/${reportId}/items/${itemId}`);
  },

  // Get items for unserviceable report
  async getItems(reportId: string): Promise<ApiResponse<UnserviceableReportItem[]>> {
    return apiClient.get<UnserviceableReportItem[]>(`/unserviceable-reports/${reportId}/items`);
  },

  // Calculate total value for report
  async calculateTotalValue(reportId: string): Promise<ApiResponse<number>> {
    return apiClient.get<number>(`/unserviceable-reports/${reportId}/total-value`);
  },

  // Update total value for report
  async updateTotalValue(reportId: string): Promise<ApiResponse<UnserviceableReport>> {
    return apiClient.patch<UnserviceableReport>(`/unserviceable-reports/${reportId}/total-value`);
  },

  // Search unserviceable reports
  async search(query: string, filters: Omit<UnserviceableReportFilters, 'search'> = {}): Promise<PaginatedResponse<UnserviceableReport>> {
    return apiClient.get<PaginatedResponse<UnserviceableReport>>('/unserviceable-reports/search', { ...filters, search: query });
  },

  // Get unserviceable reports by department
  async getByDepartment(department: string, filters: Omit<UnserviceableReportFilters, 'department'> = {}): Promise<PaginatedResponse<UnserviceableReport>> {
    return apiClient.get<PaginatedResponse<UnserviceableReport>>('/unserviceable-reports/department', { ...filters, department });
  },
};
