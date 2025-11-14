import { apiClient, ApiResponse, PaginatedResponse } from './client';

export interface AuditLog {
  id: string;
  tableName: string;
  recordId: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  oldValues?: any;
  newValues?: any;
  userId: string;
  timestamp: string;
}

export interface AuditLogFilters {
  limit?: number;
  offset?: number;
  tableName?: string;
  action?: string;
  userId?: string;
  recordId?: string;
  startDate?: string;
  endDate?: string;
}

export const auditLogApi = {
  // Get all audit logs with pagination and filtering
  async getAll(filters: AuditLogFilters = {}): Promise<PaginatedResponse<AuditLog>> {
    return apiClient.get<PaginatedResponse<AuditLog>>('/audit-logs', filters);
  },

  // Get audit log by ID
  async getById(id: string): Promise<ApiResponse<AuditLog>> {
    return apiClient.get<AuditLog>(`/audit-logs/${id}`);
  },

  // Get audit logs for a specific record
  async getRecordHistory(tableName: string, recordId: string): Promise<ApiResponse<AuditLog[]>> {
    return apiClient.get<AuditLog[]>(`/audit-logs/record/${tableName}/${recordId}`);
  },

  // Get audit logs for a specific user
  async getUserActivity(userId: string, limit = 50): Promise<ApiResponse<AuditLog[]>> {
    return apiClient.get<AuditLog[]>(`/audit-logs/user/${userId}`, { limit });
  },

  // Get audit logs for a specific table
  async getTableHistory(tableName: string, limit = 100): Promise<ApiResponse<AuditLog[]>> {
    return apiClient.get<AuditLog[]>(`/audit-logs/table/${tableName}`, { limit });
  },

  // Get audit statistics
  async getStatistics(): Promise<ApiResponse<{
    totalLogs: number;
    byAction: Record<string, number>;
    byTable: Record<string, number>;
    byUser: Record<string, number>;
  }>> {
    return apiClient.get('/audit-logs/statistics');
  },

  // Clean up old audit logs
  async cleanup(daysOld: number): Promise<ApiResponse<{ deletedCount: number }>> {
    return apiClient.post<{ deletedCount: number }>('/audit-logs/cleanup', { daysOld });
  },

  // Search audit logs
  async search(query: string, filters: Omit<AuditLogFilters, 'search'> = {}): Promise<PaginatedResponse<AuditLog>> {
    return apiClient.get<PaginatedResponse<AuditLog>>('/audit-logs/search', { ...filters, search: query });
  },

  // Get audit logs by action
  async getByAction(action: string, filters: Omit<AuditLogFilters, 'action'> = {}): Promise<PaginatedResponse<AuditLog>> {
    return apiClient.get<PaginatedResponse<AuditLog>>('/audit-logs/action', { ...filters, action });
  },

  // Get audit logs by table
  async getByTable(tableName: string, filters: Omit<AuditLogFilters, 'tableName'> = {}): Promise<PaginatedResponse<AuditLog>> {
    return apiClient.get<PaginatedResponse<AuditLog>>('/audit-logs/table', { ...filters, tableName });
  },

  // Get audit logs by user
  async getByUser(userId: string, filters: Omit<AuditLogFilters, 'userId'> = {}): Promise<PaginatedResponse<AuditLog>> {
    return apiClient.get<PaginatedResponse<AuditLog>>('/audit-logs/user', { ...filters, userId });
  },

  // Get audit logs by date range
  async getByDateRange(startDate: string, endDate: string, filters: Omit<AuditLogFilters, 'startDate' | 'endDate'> = {}): Promise<PaginatedResponse<AuditLog>> {
    return apiClient.get<PaginatedResponse<AuditLog>>('/audit-logs/date-range', { ...filters, startDate, endDate });
  },
};
