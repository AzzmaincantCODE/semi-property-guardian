import { apiClient, ApiResponse, PaginatedResponse } from './client';

export interface Transfer {
  id: string;
  transferNumber: string;
  fromDepartment: string;
  toDepartment: string;
  transferType: 'Permanent' | 'Temporary' | 'Loan';
  status: 'Pending' | 'In Transit' | 'Completed' | 'Rejected';
  requestedBy: string;
  approvedBy?: string;
  dateRequested: string;
  dateApproved?: string;
  dateCompleted?: string;
  reason: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransferItem {
  id: string;
  transferId: string;
  propertyNumber: string;
  description: string;
  quantity: number;
  condition: string;
  createdAt: string;
}

export interface TransferFilters {
  limit?: number;
  offset?: number;
  status?: string;
  transferType?: string;
  fromDepartment?: string;
  toDepartment?: string;
  search?: string;
}

export const transferApi = {
  // Get all transfers with pagination and filtering
  async getAll(filters: TransferFilters = {}): Promise<PaginatedResponse<Transfer>> {
    return apiClient.get<PaginatedResponse<Transfer>>('/transfers', filters);
  },

  // Get transfer by ID
  async getById(id: string): Promise<ApiResponse<Transfer>> {
    return apiClient.get<Transfer>(`/transfers/${id}`);
  },

  // Get transfer by transfer number
  async getByTransferNumber(transferNumber: string): Promise<ApiResponse<Transfer>> {
    return apiClient.get<Transfer>(`/transfers/transfer/${transferNumber}`);
  },

  // Create new transfer
  async create(transfer: Omit<Transfer, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Transfer>> {
    return apiClient.post<Transfer>('/transfers', transfer);
  },

  // Update transfer
  async update(id: string, updates: Partial<Transfer>): Promise<ApiResponse<Transfer>> {
    return apiClient.put<Transfer>(`/transfers/${id}`, updates);
  },

  // Delete transfer
  async delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/transfers/${id}`);
  },

  // Get transfer with items
  async getWithItems(id: string): Promise<ApiResponse<Transfer & { items: TransferItem[] }>> {
    return apiClient.get<Transfer & { items: TransferItem[] }>(`/transfers/${id}/items`);
  },

  // Add item to transfer
  async addItem(transferId: string, item: Omit<TransferItem, 'id' | 'transferId' | 'createdAt'>): Promise<ApiResponse<TransferItem>> {
    return apiClient.post<TransferItem>(`/transfers/${transferId}/items`, item);
  },

  // Update transfer item
  async updateItem(transferId: string, itemId: string, updates: Partial<TransferItem>): Promise<ApiResponse<TransferItem>> {
    return apiClient.put<TransferItem>(`/transfers/${transferId}/items/${itemId}`, updates);
  },

  // Delete transfer item
  async deleteItem(transferId: string, itemId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/transfers/${transferId}/items/${itemId}`);
  },

  // Get items for transfer
  async getItems(transferId: string): Promise<ApiResponse<TransferItem[]>> {
    return apiClient.get<TransferItem[]>(`/transfers/${transferId}/items`);
  },

  // Approve transfer
  async approve(id: string, approvedBy: string): Promise<ApiResponse<Transfer>> {
    return apiClient.patch<Transfer>(`/transfers/${id}/approve`, { approvedBy });
  },

  // Complete transfer
  async complete(id: string): Promise<ApiResponse<Transfer>> {
    return apiClient.patch<Transfer>(`/transfers/${id}/complete`);
  },

  // Reject transfer
  async reject(id: string): Promise<ApiResponse<Transfer>> {
    return apiClient.patch<Transfer>(`/transfers/${id}/reject`);
  },

  // Get transfer statistics
  async getStatistics(): Promise<ApiResponse<{
    totalTransfers: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
  }>> {
    return apiClient.get('/transfers/statistics');
  },

  // Search transfers
  async search(query: string, filters: Omit<TransferFilters, 'search'> = {}): Promise<PaginatedResponse<Transfer>> {
    return apiClient.get<PaginatedResponse<Transfer>>('/transfers/search', { ...filters, search: query });
  },

  // Get transfers by status
  async getByStatus(status: string, filters: Omit<TransferFilters, 'status'> = {}): Promise<PaginatedResponse<Transfer>> {
    return apiClient.get<PaginatedResponse<Transfer>>('/transfers/status', { ...filters, status });
  },

  // Get transfers by type
  async getByType(transferType: string, filters: Omit<TransferFilters, 'transferType'> = {}): Promise<PaginatedResponse<Transfer>> {
    return apiClient.get<PaginatedResponse<Transfer>>('/transfers/type', { ...filters, transferType });
  },
};
