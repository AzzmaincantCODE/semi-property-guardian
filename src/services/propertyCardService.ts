// Property Card Service for Supabase
import { supabase, handleSupabaseResponse, createPaginationParams } from '../lib/supabase';
import { enqueueOfflineMutation } from '@/lib/offlineQueue';

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

export interface SupabaseResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  success: boolean;
  error?: string;
}

export const propertyCardService = {
  mapRow(row: DbPropertyCardRow): PropertyCard {
    return {
      id: row.id,
      entityName: row.entity_name,
      fundCluster: row.fund_cluster,
      semiExpendableProperty: row.semi_expendable_property,
      propertyNumber: row.property_number,
      description: row.description,
      dateAcquired: row.date_acquired,
      remarks: row.remarks ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },
  mapEntry(row: DbEntryRow): SPCEntry {
    return {
      id: row.id,
      propertyCardId: row.property_card_id,
      date: row.date,
      reference: row.reference,
      receiptQty: row.receipt_qty,
      unitCost: Number(row.unit_cost || 0),
      totalCost: Number(row.total_cost || 0),
      issueItemNo: row.issue_item_no,
      issueQty: row.issue_qty,
      officeOfficer: row.office_officer,
      balanceQty: row.balance_qty,
      amount: Number(row.amount || 0),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },
  // Get all property cards with pagination and filtering
  async getAll(filters: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}): Promise<PaginatedResponse<PropertyCard>> {
    const { page = 1, limit = 50, search } = filters;
    const { from, to } = createPaginationParams(page, limit);

    let query = supabase
      .from('property_cards')
      .select('*', { count: 'exact' })
      .range(from, to);

    if (search) {
      query = query.or(`property_number.ilike.%${search}%,description.ilike.%${search}%,entity_name.ilike.%${search}%`);
    }

    const response = await query.order('created_at', { ascending: false });
    
    if (response.error) {
      return {
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
        success: false,
        error: response.error.message,
      };
    }

    const total = response.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: (response.data || []).map((r) => propertyCardService.mapRow(r as DbPropertyCardRow)),
      pagination: { page, limit, total, totalPages },
      success: true,
    };
  },

  // Get property card by ID
  async getById(id: string): Promise<SupabaseResponse<PropertyCard>> {
    const response = await supabase
      .from('property_cards')
      .select('*')
      .eq('id', id)
      .single();

    return {
      data: response.data ? propertyCardService.mapRow(response.data) : null,
      error: response.error?.message || null,
      success: !response.error,
    };
  },

  // Get property card with entries
  async getWithEntries(id: string): Promise<SupabaseResponse<PropertyCard & { entries: SPCEntry[] }>> {
    const response = await supabase
      .from('property_cards')
      .select(`
        *,
        entries:property_card_entries(*)
      `)
      .eq('id', id)
      .single();

    const mapped = response.data
      ? {
          ...propertyCardService.mapRow(response.data as DbPropertyCardRow),
          entries: (response.data.entries || []).map((e) => propertyCardService.mapEntry(e as DbEntryRow)),
        }
      : null;

    return {
      data: mapped,
      error: response.error?.message || null,
      success: !response.error,
    };
  },

  // Create new property card
  async create(card: Omit<PropertyCard, 'id' | 'createdAt' | 'updatedAt'>): Promise<SupabaseResponse<PropertyCard>> {
    if (!navigator.onLine) {
      await enqueueOfflineMutation('propertyCards.create', { card });
      // Optimistic response with temporary ID
      const temp: PropertyCard = {
        id: `temp-${Date.now()}`,
        entityName: card.entityName,
        fundCluster: card.fundCluster,
        semiExpendableProperty: card.semiExpendableProperty,
        propertyNumber: card.propertyNumber,
        description: card.description,
        dateAcquired: card.dateAcquired,
        remarks: card.remarks,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return { data: temp, error: null, success: true };
    }
    const response = await supabase
      .from('property_cards')
      .insert({
        entity_name: card.entityName,
        fund_cluster: card.fundCluster,
        semi_expendable_property: card.semiExpendableProperty,
        property_number: card.propertyNumber,
        description: card.description,
        date_acquired: card.dateAcquired,
        remarks: card.remarks,
      })
      .select()
      .single();

    return {
      data: response.data ? propertyCardService.mapRow(response.data) : null,
      error: response.error?.message || null,
      success: !response.error,
    };
  },

  // Update property card
  async update(id: string, updates: Partial<PropertyCard>): Promise<SupabaseResponse<PropertyCard>> {
    if (!navigator.onLine) {
      await enqueueOfflineMutation('propertyCards.update', { id, updates });
      // Optimistic success; caller should update cache/UI
      const optimistic: PropertyCard = {
        id,
        entityName: updates.entityName ?? '',
        fundCluster: updates.fundCluster ?? '',
        semiExpendableProperty: updates.semiExpendableProperty ?? '',
        propertyNumber: updates.propertyNumber ?? '',
        description: updates.description ?? '',
        dateAcquired: updates.dateAcquired ?? new Date().toISOString(),
        remarks: updates.remarks,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return { data: optimistic, error: null, success: true };
    }
    const updateData: Record<string, unknown> = {};
    
    if (updates.entityName) updateData.entity_name = updates.entityName;
    if (updates.fundCluster) updateData.fund_cluster = updates.fundCluster;
    if (updates.semiExpendableProperty) updateData.semi_expendable_property = updates.semiExpendableProperty;
    if (updates.propertyNumber) updateData.property_number = updates.propertyNumber;
    if (updates.description) updateData.description = updates.description;
    if (updates.dateAcquired) updateData.date_acquired = updates.dateAcquired;
    if (updates.remarks !== undefined) updateData.remarks = updates.remarks;

    const response = await supabase
      .from('property_cards')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    return {
      data: response.data ? propertyCardService.mapRow(response.data) : null,
      error: response.error?.message || null,
      success: !response.error,
    };
  },

  // Delete property card
  async delete(id: string): Promise<SupabaseResponse<void>> {
    if (!navigator.onLine) {
      await enqueueOfflineMutation('propertyCards.delete', { id });
      return { data: null, error: null, success: true };
    }
    const response = await supabase
      .from('property_cards')
      .delete()
      .eq('id', id);

    return {
      data: response.data ? propertyCardService.mapEntry(response.data) : null,
      error: response.error?.message || null,
      success: !response.error,
    };
  },

  // Add entry to property card
  async addEntry(propertyCardId: string, entry: Omit<SPCEntry, 'id' | 'propertyCardId' | 'createdAt' | 'updatedAt'>): Promise<SupabaseResponse<SPCEntry>> {
    if (!navigator.onLine) {
      await enqueueOfflineMutation('propertyCards.addEntry', { propertyCardId, entry });
      const temp: SPCEntry = {
        id: `temp-entry-${Date.now()}`,
        propertyCardId,
        date: entry.date,
        reference: entry.reference,
        receiptQty: entry.receiptQty,
        unitCost: entry.unitCost,
        totalCost: entry.totalCost,
        issueItemNo: entry.issueItemNo,
        issueQty: entry.issueQty,
        officeOfficer: entry.officeOfficer,
        balanceQty: entry.balanceQty,
        amount: entry.amount,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return { data: temp, error: null, success: true };
    }
    const response = await supabase
      .from('property_card_entries')
      .insert({
        property_card_id: propertyCardId,
        date: entry.date,
        reference: entry.reference,
        receipt_qty: entry.receiptQty,
        unit_cost: entry.unitCost,
        total_cost: entry.totalCost,
        issue_item_no: entry.issueItemNo,
        issue_qty: entry.issueQty,
        office_officer: entry.officeOfficer,
        balance_qty: entry.balanceQty,
        amount: entry.amount,
      })
      .select()
      .single();

    return {
      data: response.data ? propertyCardService.mapEntry(response.data) : null,
      error: response.error?.message || null,
      success: !response.error,
    };
  },

  // Update entry
  async updateEntry(propertyCardId: string, entryId: string, updates: Partial<SPCEntry>): Promise<SupabaseResponse<SPCEntry>> {
    if (!navigator.onLine) {
      await enqueueOfflineMutation('propertyCards.updateEntry', { propertyCardId, entryId, updates });
      const optimistic: SPCEntry = {
        id: entryId,
        propertyCardId,
        date: updates.date ?? '',
        reference: updates.reference ?? '',
        receiptQty: updates.receiptQty ?? 0,
        unitCost: updates.unitCost ?? 0,
        totalCost: updates.totalCost ?? 0,
        issueItemNo: updates.issueItemNo ?? '',
        issueQty: updates.issueQty ?? 0,
        officeOfficer: updates.officeOfficer ?? '',
        balanceQty: updates.balanceQty ?? 0,
        amount: updates.amount ?? 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return { data: optimistic, error: null, success: true };
    }
    const updateData: Record<string, unknown> = {};
    
    if (updates.date) updateData.date = updates.date;
    if (updates.reference) updateData.reference = updates.reference;
    if (updates.receiptQty !== undefined) updateData.receipt_qty = updates.receiptQty;
    if (updates.unitCost !== undefined) updateData.unit_cost = updates.unitCost;
    if (updates.totalCost !== undefined) updateData.total_cost = updates.totalCost;
    if (updates.issueItemNo) updateData.issue_item_no = updates.issueItemNo;
    if (updates.issueQty !== undefined) updateData.issue_qty = updates.issueQty;
    if (updates.officeOfficer) updateData.office_officer = updates.officeOfficer;
    if (updates.balanceQty !== undefined) updateData.balance_qty = updates.balanceQty;
    if (updates.amount !== undefined) updateData.amount = updates.amount;

    const response = await supabase
      .from('property_card_entries')
      .update(updateData)
      .eq('id', entryId)
      .eq('property_card_id', propertyCardId)
      .select()
      .single();

    return {
      data: response.data,
      error: response.error?.message || null,
      success: !response.error,
    };
  },

  // Delete entry
  async deleteEntry(propertyCardId: string, entryId: string): Promise<SupabaseResponse<void>> {
    if (!navigator.onLine) {
      await enqueueOfflineMutation('propertyCards.deleteEntry', { propertyCardId, entryId });
      return { data: null, error: null, success: true };
    }
    const response = await supabase
      .from('property_card_entries')
      .delete()
      .eq('id', entryId)
      .eq('property_card_id', propertyCardId);

    return {
      data: response.data,
      error: response.error?.message || null,
      success: !response.error,
    };
  },

  // Get entries for a property card
  async getEntries(propertyCardId: string): Promise<SupabaseResponse<SPCEntry[]>> {
    const response = await supabase
      .from('property_card_entries')
      .select('*')
      .eq('property_card_id', propertyCardId)
      .order('date', { ascending: true });

    return {
      data: (response.data || []).map((r) => propertyCardService.mapEntry(r as DbEntryRow)),
      error: response.error?.message || null,
      success: !response.error,
    };
  },

  // Search property cards
  async search(query: string, filters: {
    page?: number;
    limit?: number;
  } = {}): Promise<PaginatedResponse<PropertyCard>> {
    return this.getAll({
      ...filters,
      search: query,
    });
  },

  // Safe delete property card
  async safeDelete(id: string): Promise<SupabaseResponse<boolean>> {
    try {
      // First try to use the database function
      const { data, error } = await supabase
        .rpc('safe_delete_property_card', { card_id: id });

      if (error) {
        // If function doesn't exist, fall back to manual deletion
        if (error.code === 'PGRST202' || error.message.includes('Could not find the function')) {
          console.warn('safe_delete_property_card function not found, using fallback deletion');
          
          // Check if we can delete first
          const canDeleteResult = await this.canDelete(id);
          if (!canDeleteResult.success || !canDeleteResult.data) {
            return {
              data: null,
              error: 'Cannot delete property card - it has custodian slip or transfer references',
              success: false,
            };
          }
          
          // Manually delete: first remove references, then delete entries, then delete card
          // Remove property_card_entry_id references in custodian_slip_items
          const { data: entries } = await supabase
            .from('property_card_entries')
            .select('id')
            .eq('property_card_id', id);
          
          if (entries && entries.length > 0) {
            const entryIds = entries.map(e => e.id);
            await supabase
              .from('custodian_slip_items')
              .update({ property_card_entry_id: null })
              .in('property_card_entry_id', entryIds);
          }
          
          // Delete the property card (entries will cascade if ON DELETE CASCADE is set)
          const { error: deleteError } = await supabase
            .from('property_cards')
            .delete()
            .eq('id', id);
          
          if (deleteError) {
            return {
              data: null,
              error: deleteError.message,
              success: false,
            };
          }
          
          return {
            data: true,
            error: null,
            success: true,
          };
        }
        
        console.error('Safe delete property card error:', error);
        return {
          data: null,
          error: error.message,
          success: false,
        };
      }

      return {
        data: data,
        error: null,
        success: true,
      };
    } catch (err) {
      console.error('Safe delete property card exception:', err);
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error occurred',
        success: false,
      };
    }
  },

  // Check if property card can be deleted
  async canDelete(id: string): Promise<SupabaseResponse<boolean>> {
    try {
      // First try to use the database function
      const { data, error } = await supabase
        .rpc('can_delete_property_card', { card_id: id });

      if (error) {
        // If function doesn't exist, fall back to manual check
        if (error.code === 'PGRST202' || error.message.includes('Could not find the function')) {
          console.warn('can_delete_property_card function not found, using fallback check');
          
          // Manual check: see if there are any custodian slip items referencing this card's entries
          const { data: entries } = await supabase
            .from('property_card_entries')
            .select('id')
            .eq('property_card_id', id)
            .limit(1);
          
          if (!entries || entries.length === 0) {
            // No entries, safe to delete
            return { data: true, error: null, success: true };
          }
          
          const entryIds = entries.map(e => e.id);
          const { data: slipItems } = await supabase
            .from('custodian_slip_items')
            .select('id')
            .in('property_card_entry_id', entryIds)
            .limit(1);
          
          // Can delete if no slip items reference the entries
          return {
            data: !slipItems || slipItems.length === 0,
            error: null,
            success: true,
          };
        }
        
        console.error('Can delete property card error:', error);
        return {
          data: null,
          error: error.message,
          success: false,
        };
      }

      return {
        data: data,
        error: null,
        success: true,
      };
    } catch (err) {
      console.error('Can delete property card exception:', err);
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error occurred',
        success: false,
      };
    }
  },
};
