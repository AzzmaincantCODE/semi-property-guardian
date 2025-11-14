import { apiClient, ApiResponse, PaginatedResponse } from './client';

export interface LossReport {
  id: string;
  reportNumber: string;
  department: string;
  reportDate: string;
  incidentDate: string;
  reportType: 'Lost' | 'Stolen' | 'Damaged' | 'Destroyed';
  status: 'Draft' | 'Submitted' | 'Under Investigation' | 'Approved' | 'Rejected';
  reportedBy: string;
  investigatedBy?: string;
  approvedBy?: string;
  totalLossAmount: number;
  incidentDescription: string;
  actionsTaken?: string;
  recommendations?: string;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LossReportItem {
  id: string;
  reportId: string;
  propertyNumber: string;
  description: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  dateAcquired: string;
  condition: 'Lost' | 'Stolen' | 'Damaged' | 'Destroyed';
  circumstances: string;
  createdAt: string;
}

export interface LossReportFilters {
  limit?: number;
  offset?: number;
  status?: string;
  reportType?: string;
  department?: string;
  search?: string;
}

export const lossReportApi = {
  // Get all loss reports with pagination and filtering
  async getAll(filters: LossReportFilters = {}): Promise<PaginatedResponse<LossReport>> {
    return apiClient.get<PaginatedResponse<LossReport>>('/loss-reports', filters);
  },

  // Get loss report by ID
  async getById(id: string): Promise<ApiResponse<LossReport>> {
    return apiClient.get<LossReport>(`/loss-reports/${id}`);
  },

  // Get loss report by report number
  async getByReportNumber(reportNumber: string): Promise<ApiResponse<LossReport>> {
    return apiClient.get<LossReport>(`/loss-reports/report/${reportNumber}`);
  },

  // Create new loss report
  async create(report: Omit<LossReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<LossReport>> {
    return apiClient.post<LossReport>('/loss-reports', report);
  },

  // Update loss report
  async update(id: string, updates: Partial<LossReport>): Promise<ApiResponse<LossReport>> {
    return apiClient.put<LossReport>(`/loss-reports/${id}`, updates);
  },

  // Delete loss report
  async delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/loss-reports/${id}`);
  },

  // Get loss report with items
  async getWithItems(id: string): Promise<ApiResponse<LossReport & { items: LossReportItem[] }>> {
    return apiClient.get<LossReport & { items: LossReportItem[] }>(`/loss-reports/${id}/items`);
  },

  // Add item to loss report
  async addItem(reportId: string, item: Omit<LossReportItem, 'id' | 'reportId' | 'createdAt'>): Promise<ApiResponse<LossReportItem>> {
    return apiClient.post<LossReportItem>(`/loss-reports/${reportId}/items`, item);
  },

  // Update loss report item
  async updateItem(reportId: string, itemId: string, updates: Partial<LossReportItem>): Promise<ApiResponse<LossReportItem>> {
    return apiClient.put<LossReportItem>(`/loss-reports/${reportId}/items/${itemId}`, updates);
  },

  // Delete loss report item
  async deleteItem(reportId: string, itemId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/loss-reports/${reportId}/items/${itemId}`);
  },

  // Get items for loss report
  async getItems(reportId: string): Promise<ApiResponse<LossReportItem[]>> {
    return apiClient.get<LossReportItem[]>(`/loss-reports/${reportId}/items`);
  },

  // Calculate total loss amount for report
  async calculateTotalLoss(reportId: string): Promise<ApiResponse<number>> {
    return apiClient.get<number>(`/loss-reports/${reportId}/total-loss`);
  },

  // Update total loss amount for report
  async updateTotalLoss(reportId: string): Promise<ApiResponse<LossReport>> {
    return apiClient.patch<LossReport>(`/loss-reports/${reportId}/total-loss`);
  },

  // Submit report for investigation
  async submit(id: string): Promise<ApiResponse<LossReport>> {
    return apiClient.patch<LossReport>(`/loss-reports/${id}/submit`);
  },

  // Approve report
  async approve(id: string, approvedBy: string): Promise<ApiResponse<LossReport>> {
    return apiClient.patch<LossReport>(`/loss-reports/${id}/approve`, { approvedBy });
  },

  // Reject report
  async reject(id: string): Promise<ApiResponse<LossReport>> {
    return apiClient.patch<LossReport>(`/loss-reports/${id}/reject`);
  },

  // Search loss reports
  async search(query: string, filters: Omit<LossReportFilters, 'search'> = {}): Promise<PaginatedResponse<LossReport>> {
    return apiClient.get<PaginatedResponse<LossReport>>('/loss-reports/search', { ...filters, search: query });
  },

  // Get loss reports by status
  async getByStatus(status: string, filters: Omit<LossReportFilters, 'status'> = {}): Promise<PaginatedResponse<LossReport>> {
    return apiClient.get<PaginatedResponse<LossReport>>('/loss-reports/status', { ...filters, status });
  },

  // Get loss reports by type
  async getByType(reportType: string, filters: Omit<LossReportFilters, 'reportType'> = {}): Promise<PaginatedResponse<LossReport>> {
    return apiClient.get<PaginatedResponse<LossReport>>('/loss-reports/type', { ...filters, reportType });
  },

  // Get loss reports by department
  async getByDepartment(department: string, filters: Omit<LossReportFilters, 'department'> = {}): Promise<PaginatedResponse<LossReport>> {
    return apiClient.get<PaginatedResponse<LossReport>>('/loss-reports/department', { ...filters, department });
  },
};
