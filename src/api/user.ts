import { apiClient, ApiResponse, PaginatedResponse } from './client';

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  fullName: string;
  position?: string;
  department?: string;
  role: 'admin' | 'manager' | 'user';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserFilters {
  limit?: number;
  offset?: number;
  role?: string;
  department?: string;
  isActive?: boolean;
  search?: string;
}

export const userApi = {
  // Get all users with pagination and filtering
  async getAll(filters: UserFilters = {}): Promise<PaginatedResponse<User>> {
    return apiClient.get<PaginatedResponse<User>>('/users', filters);
  },

  // Get user by ID
  async getById(id: string): Promise<ApiResponse<User>> {
    return apiClient.get<User>(`/users/${id}`);
  },

  // Get user by username
  async getByUsername(username: string): Promise<ApiResponse<User>> {
    return apiClient.get<User>(`/users/username/${username}`);
  },

  // Get user by email
  async getByEmail(email: string): Promise<ApiResponse<User>> {
    return apiClient.get<User>(`/users/email/${email}`);
  },

  // Create new user
  async create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<User>> {
    return apiClient.post<User>('/users', user);
  },

  // Update user
  async update(id: string, updates: Partial<User>): Promise<ApiResponse<User>> {
    return apiClient.put<User>(`/users/${id}`, updates);
  },

  // Delete user
  async delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/users/${id}`);
  },

  // Activate user
  async activate(id: string): Promise<ApiResponse<User>> {
    return apiClient.patch<User>(`/users/${id}/activate`);
  },

  // Deactivate user
  async deactivate(id: string): Promise<ApiResponse<User>> {
    return apiClient.patch<User>(`/users/${id}/deactivate`);
  },

  // Change user password
  async changePassword(id: string, newPasswordHash: string): Promise<ApiResponse<User>> {
    return apiClient.patch<User>(`/users/${id}/password`, { newPasswordHash });
  },

  // Get user statistics
  async getStatistics(): Promise<ApiResponse<{
    totalUsers: number;
    activeUsers: number;
    byRole: Record<string, number>;
    byDepartment: Record<string, number>;
  }>> {
    return apiClient.get('/users/statistics');
  },

  // Search users
  async search(query: string, filters: Omit<UserFilters, 'search'> = {}): Promise<PaginatedResponse<User>> {
    return apiClient.get<PaginatedResponse<User>>('/users/search', { ...filters, search: query });
  },

  // Get users by role
  async getByRole(role: string, filters: Omit<UserFilters, 'role'> = {}): Promise<PaginatedResponse<User>> {
    return apiClient.get<PaginatedResponse<User>>('/users/role', { ...filters, role });
  },

  // Get users by department
  async getByDepartment(department: string, filters: Omit<UserFilters, 'department'> = {}): Promise<PaginatedResponse<User>> {
    return apiClient.get<PaginatedResponse<User>>('/users/department', { ...filters, department });
  },

  // Get active users
  async getActive(filters: Omit<UserFilters, 'isActive'> = {}): Promise<PaginatedResponse<User>> {
    return apiClient.get<PaginatedResponse<User>>('/users/active', { ...filters, isActive: true });
  },
};
