import { apiClient, ApiResponse, PaginatedResponse } from './client';

export interface PropertyCard {
  id: string;
  entityName: string;
  fundCluster: string;
  semiExpendableProperty: string;
  propertyNumber: string;
  description: string;
  dateAcquired: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SPCEntry {
  id: string;
  propertyCardId: string;
  date: string;
  reference: string;
  receiptQty: number;
  unitCost: number;
  totalCost: number;
  issueItemNo: string;
  issueQty: number;
  officeOfficer: string;
  balanceQty: number;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyCardFilters {
  limit?: number;
  offset?: number;
  search?: string;
  fundCluster?: string;
}

export const propertyCardApi = {
  // Get all property cards with pagination and filtering
  async getAll(filters: PropertyCardFilters = {}): Promise<PaginatedResponse<PropertyCard>> {
    return apiClient.get<PaginatedResponse<PropertyCard>>('/property-cards', filters);
  },

  // Get property card by ID
  async getById(id: string): Promise<ApiResponse<PropertyCard>> {
    return apiClient.get<PropertyCard>(`/property-cards/${id}`);
  },

  // Get property card by property number
  async getByPropertyNumber(propertyNumber: string): Promise<ApiResponse<PropertyCard>> {
    return apiClient.get<PropertyCard>(`/property-cards/property/${propertyNumber}`);
  },

  // Create new property card
  async create(card: Omit<PropertyCard, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<PropertyCard>> {
    return apiClient.post<PropertyCard>('/property-cards', card);
  },

  // Update property card
  async update(id: string, updates: Partial<PropertyCard>): Promise<ApiResponse<PropertyCard>> {
    return apiClient.put<PropertyCard>(`/property-cards/${id}`, updates);
  },

  // Delete property card
  async delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/property-cards/${id}`);
  },

  // Get property card with entries
  async getWithEntries(id: string): Promise<ApiResponse<PropertyCard & { entries: SPCEntry[] }>> {
    return apiClient.get<PropertyCard & { entries: SPCEntry[] }>(`/property-cards/${id}/entries`);
  },

  // Add entry to property card
  async addEntry(propertyCardId: string, entry: Omit<SPCEntry, 'id' | 'propertyCardId' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<SPCEntry>> {
    return apiClient.post<SPCEntry>(`/property-cards/${propertyCardId}/entries`, entry);
  },

  // Update entry
  async updateEntry(propertyCardId: string, entryId: string, updates: Partial<SPCEntry>): Promise<ApiResponse<SPCEntry>> {
    return apiClient.put<SPCEntry>(`/property-cards/${propertyCardId}/entries/${entryId}`, updates);
  },

  // Delete entry
  async deleteEntry(propertyCardId: string, entryId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/property-cards/${propertyCardId}/entries/${entryId}`);
  },

  // Get entries for property card
  async getEntries(propertyCardId: string): Promise<ApiResponse<SPCEntry[]>> {
    return apiClient.get<SPCEntry[]>(`/property-cards/${propertyCardId}/entries`);
  },

  // Search property cards
  async search(query: string, filters: Omit<PropertyCardFilters, 'search'> = {}): Promise<PaginatedResponse<PropertyCard>> {
    return apiClient.get<PaginatedResponse<PropertyCard>>('/property-cards/search', { ...filters, search: query });
  },

  // Get property cards by fund cluster
  async getByFundCluster(fundCluster: string, filters: Omit<PropertyCardFilters, 'fundCluster'> = {}): Promise<PaginatedResponse<PropertyCard>> {
    return apiClient.get<PaginatedResponse<PropertyCard>>('/property-cards/fund-cluster', { ...filters, fundCluster });
  },
};
