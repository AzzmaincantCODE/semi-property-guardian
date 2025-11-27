// Simple Inventory Service - Basic CRUD without complex joins
import { supabase, handleSupabaseResponse, createPaginationParams } from '../lib/supabase';
import { InventoryItem } from '../types/inventory';
import { enqueueOfflineMutation } from '@/lib/offlineQueue';

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

export const simpleInventoryService = {
  // Get all inventory items with pagination and filtering
  async getAll(filters: {
    page?: number;
    limit?: number;
    status?: string;
    condition?: string;
    search?: string;
    filter?: 'available' | 'issued';
    valueFilter?: 'high-value' | 'low-value';
  } = {}): Promise<PaginatedResponse<InventoryItem>> {
    const { page = 1, limit = 1000, status, condition, search, filter, valueFilter } = filters;
    const { from, to } = createPaginationParams(page, limit);

    let query;
    
    // Handle special filters for available/issued items
    if (filter === 'available') {
      // Get ALL available items (including those without property cards)
      // Available means: Active, Serviceable, and NOT assigned
      // We'll filter in code to handle complex OR logic
      query = supabase
        .from('inventory_items')
        .select('*', { count: 'planned' })
        .range(from, to)
        .eq('status', 'Active')
        .eq('condition', 'Serviceable')
        .or('assignment_status.is.null,assignment_status.eq.Available');
    } else if (filter === 'issued') {
      // Get issued items - items that are assigned to custodians
      console.log('Fetching issued items with filter:', filter);
      query = supabase
        .from('inventory_items')
        .select('*', { count: 'planned' })
        .range(from, to)
        .eq('status', 'Active')
        .eq('condition', 'Serviceable')
        .eq('assignment_status', 'Assigned');
    } else {
      // Default: get all items
      query = supabase
      .from('inventory_items')
        .select('*', { count: 'planned' })
      .range(from, to);
    }

    // Apply filters
    if (status) query = query.eq('status', status);
    if (condition) query = query.eq('condition', condition);
    if (valueFilter === 'high-value') {
      query = query.eq('sub_category', 'High Value Expendable');
    } else if (valueFilter === 'low-value') {
      query = query.eq('sub_category', 'Small Value Expendable');
    }
    if (search) {
      query = query.or(`property_number.ilike.%${search}%,description.ilike.%${search}%,brand.ilike.%${search}%`);
    }

    const response = await query.order('created_at', { ascending: false });
    
    if (response.error) {
      console.error('Error fetching inventory items:', response.error);
      return {
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
        success: false,
        error: response.error.message,
      };
    }

    // Filter out assigned items in code if filter is 'available' (to include items without property cards)
    let filteredData = response.data || [];
    if (filter === 'available') {
      filteredData = filteredData.filter(item => {
        // Exclude items that are explicitly assigned
        if (item.assignment_status === 'Assigned') return false;
        // Exclude items with a custodian assigned
        if (item.custodian && item.custodian.trim() !== '') return false;
        // Include items with null/empty assignment_status or 'Available'
        return true;
      });
    }

    console.log('Raw database response:', {
      filter: filter,
      dataCount: filteredData.length,
      totalCount: response.count,
      sampleItems: filteredData.slice(0, 3).map(item => ({
        id: item.id,
        property_number: item.property_number,
        assignment_status: item.assignment_status,
        custodian: item.custodian,
        sub_category: item.sub_category
      }))
    });

    const total = filter === 'available' ? filteredData.length : (response.count || 0);
    const totalPages = Math.ceil(total / limit);

    // Check which items have property cards (batch query for performance)
    const itemsWithPropertyCards = new Set<string>();
    if (filteredData.length > 0) {
      const itemIds = filteredData.map(item => item.id);
      // Split into chunks of 100 to avoid query limits
      for (let i = 0; i < itemIds.length; i += 100) {
        const chunk = itemIds.slice(i, i + 100);
        const { data: propertyCards } = await supabase
          .from('property_cards')
          .select('inventory_item_id')
          .in('inventory_item_id', chunk);
        
        if (propertyCards) {
          propertyCards.forEach(pc => itemsWithPropertyCards.add(pc.inventory_item_id));
        }
      }
    }
    
    // Transform the data to match the expected interface
    const transformedData = filteredData.map(item => ({
      id: item.id,
      propertyNumber: item.property_number,
      description: item.description || (item.model ? `${item.brand ? item.brand + ' ' : ''}${item.model}` : item.brand) || '',
      brand: item.brand || '',
      model: item.model || '',
      serialNumber: item.serial_number || '',
      unitOfMeasure: item.unit_of_measure,
      quantity: item.quantity,
      unitCost: item.unit_cost,
      totalCost: item.total_cost,
      dateAcquired: item.date_acquired,
      supplier: item.supplier_id || '',
      condition: item.condition,
      fundSource: item.fund_source_id || '',
      remarks: item.remarks || '',
      lastInventoryDate: item.last_inventory_date || '',
      semiExpandableCategory: item.semi_expandable_category || undefined,
      subCategory: item.sub_category || undefined,
      entityName: item.entity_name || undefined,
      status: item.status,
      // Add assignment status fields
      custodian: item.custodian || '',
      custodianPosition: item.custodian_position || '',
        assignmentStatus: item.assignment_status || 'Available',
        assignedDate: item.assigned_date || '',
        hasPropertyCard: itemsWithPropertyCards.has(item.id), // Add flag to indicate if item has property card
        createdAt: item.created_at,
        updatedAt: item.updated_at
    }));

    console.log('Transformed data sample:', {
      totalItems: transformedData.length,
      spHVItems: transformedData.filter(item => item.propertyNumber?.startsWith('SPHV')),
      spLVItems: transformedData.filter(item => item.propertyNumber?.startsWith('SPLV')),
      sampleTransformed: transformedData.slice(0, 3).map(item => ({
        propertyNumber: item.propertyNumber,
        subCategory: item.subCategory
      }))
    });

    return {
      data: transformedData,
      pagination: { page, limit, total, totalPages },
      success: true,
    };
  },

  // Get inventory item by ID
  async getById(id: string): Promise<SupabaseResponse<InventoryItem>> {
    const response = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', id)
      .single();

    if (response.error) {
      return {
        data: null,
        error: response.error.message,
        success: false,
      };
    }

    const transformedData = {
      id: response.data.id,
      propertyNumber: response.data.property_number,
      description: response.data.description || (response.data.model ? `${response.data.brand ? response.data.brand + ' ' : ''}${response.data.model}` : response.data.brand) || '',
      brand: response.data.brand || '',
      model: response.data.model || '',
      serialNumber: response.data.serial_number || '',
      unitOfMeasure: response.data.unit_of_measure,
      quantity: response.data.quantity,
      unitCost: response.data.unit_cost,
      totalCost: response.data.total_cost,
      dateAcquired: response.data.date_acquired,
      supplier: response.data.supplier_id || '',
      condition: response.data.condition,
      fundSource: response.data.fund_source_id || '',
      remarks: response.data.remarks || '',
      lastInventoryDate: response.data.last_inventory_date || '',
      semiExpandableCategory: response.data.semi_expandable_category || undefined,
      subCategory: response.data.sub_category || undefined,
      entityName: response.data.entity_name || undefined,
      status: response.data.status,
      // Add assignment status fields
      custodian: response.data.custodian || '',
      custodianPosition: response.data.custodian_position || '',
      assignmentStatus: response.data.assignment_status || 'Available',
      assignedDate: response.data.assigned_date || '',
      createdAt: response.data.created_at,
      updatedAt: response.data.updated_at
    };

    return {
      data: transformedData,
      error: null,
      success: true,
    };
  },

  // Create new inventory item
  async create(item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<SupabaseResponse<InventoryItem>> {
    console.log('Creating inventory item with data:', item);
    
    if (!navigator.onLine) {
      await enqueueOfflineMutation('inventory.create', { item });
      // Optimistic response with temporary ID
      const temp: InventoryItem = {
        id: `temp-${Date.now()}`,
        ...item,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any;
      return { data: temp, error: null, success: true };
    }

    // Check for duplicate property number before creating
    if (item.propertyNumber) {
      const { data: existingItem, error: checkError } = await supabase
      .from('inventory_items')
        .select('id, property_number')
        .eq('property_number', item.propertyNumber)
        .limit(1);

      if (checkError) {
        console.error('Error checking for duplicate property number:', checkError);
        return {
          data: null,
          error: 'Failed to validate property number uniqueness',
          success: false,
        };
      }

      if (existingItem && existingItem.length > 0) {
        console.error('Duplicate property number detected:', item.propertyNumber);
        return {
          data: null,
          error: `Property number ${item.propertyNumber} already exists. Please generate a new property number.`,
          success: false,
        };
      }
    }
    
    // Generate entity_name from brand/model/serial if not provided
    let entityName = item.entityName;
    if (!entityName || entityName.trim() === '') {
      const parts: string[] = [];
      if (item.brand) parts.push(item.brand);
      if (item.model) parts.push(item.model);
      if (item.serialNumber) parts.push(item.serialNumber);
      entityName = parts.join(' ').trim() || item.description || '';
    }
    
    const insertData: any = {
        property_number: item.propertyNumber,
        description: item.description,
        brand: item.brand || null,
        model: item.model || null,
        serial_number: item.serialNumber || null,
        unit_of_measure: item.unitOfMeasure || 'piece',
        quantity: item.quantity || 1,
        unit_cost: item.unitCost || 0,
        total_cost: item.totalCost || 0,
        date_acquired: item.dateAcquired,
        supplier_id: item.supplier || null,
        condition: item.condition || 'Serviceable',
        fund_source_id: item.fundSource || null,
        remarks: item.remarks || null,
        last_inventory_date: item.lastInventoryDate || null,
        category: 'Semi-Expandable', // Always Semi-Expendable
        status: item.status || 'Active',
        entity_name: entityName, // Required NOT NULL column - always include (auto-generated if not provided)
        estimated_useful_life_override: item.estimatedUsefulLifeOverride || null,
    };
    
    // Add optional columns if they exist
    if (item.subCategory) {
      insertData.sub_category = item.subCategory;
    }
    if (item.semiExpandableCategory) {
      insertData.semi_expandable_category = item.semiExpandableCategory;
    }
    
    // Add assignment status fields (with defaults)
    insertData.assignment_status = item.assignmentStatus || 'Available';
    if (item.custodian) {
      insertData.custodian = item.custodian;
    }
    if (item.custodianPosition) {
      insertData.custodian_position = item.custodianPosition;
    }
    
    console.log('Inserting data:', insertData);
    
    const response = await supabase
      .from('inventory_items')
      .insert(insertData)
      .select()
      .single();

    console.log('Supabase response:', response);

    if (response.error) {
      console.error('Error creating inventory item:', response.error);
      return {
        data: null,
        error: response.error.message,
        success: false,
      };
    }

    const transformedData = {
      id: response.data.id,
      propertyNumber: response.data.property_number,
      description: response.data.description || (response.data.model ? `${response.data.brand ? response.data.brand + ' ' : ''}${response.data.model}` : response.data.brand) || '',
      brand: response.data.brand || '',
      model: response.data.model || '',
      serialNumber: response.data.serial_number || '',
      unitOfMeasure: response.data.unit_of_measure,
      quantity: response.data.quantity,
      unitCost: response.data.unit_cost,
      totalCost: response.data.total_cost,
      dateAcquired: response.data.date_acquired,
      supplier: response.data.supplier_id || '',
      condition: response.data.condition,
      semiExpandableCategory: response.data.semi_expandable_category || undefined,
      subCategory: response.data.sub_category,
      entityName: response.data.entity_name,
      fundSource: response.data.fund_source_id || '',
      remarks: response.data.remarks || '',
      lastInventoryDate: response.data.last_inventory_date || '',
      status: response.data.status,
      estimatedUsefulLife: response.data.estimated_useful_life,
      estimatedUsefulLifeOverride: response.data.estimated_useful_life_override,
      // Add assignment status fields
      custodian: response.data.custodian || '',
      custodianPosition: response.data.custodian_position || '',
      assignmentStatus: response.data.assignment_status || 'Available',
      assignedDate: response.data.assigned_date || '',
      createdAt: response.data.created_at,
      updatedAt: response.data.updated_at
    };

    return {
      data: transformedData,
      error: null,
      success: true,
    };
  },

  // Update inventory item
  async update(id: string, updates: Partial<InventoryItem>): Promise<SupabaseResponse<InventoryItem>> {
    if (!navigator.onLine) {
      await enqueueOfflineMutation('inventory.update', { id, updates });
      // Optimistic success; caller should update cache/UI
      const optimistic: InventoryItem = {
        id,
        propertyNumber: updates.propertyNumber ?? '',
        description: updates.description ?? '',
        brand: updates.brand ?? '',
        model: updates.model ?? '',
        serialNumber: updates.serialNumber ?? '',
        unitOfMeasure: updates.unitOfMeasure ?? '',
        quantity: updates.quantity ?? 0,
        unitCost: updates.unitCost ?? 0,
        totalCost: updates.totalCost ?? 0,
        dateAcquired: updates.dateAcquired ?? new Date().toISOString(),
        supplier: updates.supplier ?? '',
        condition: updates.condition ?? '',
        fundSource: updates.fundSource ?? '',
        remarks: updates.remarks ?? '',
        lastInventoryDate: updates.lastInventoryDate ?? '',
        semiExpandableCategory: updates.semiExpandableCategory,
        subCategory: updates.subCategory,
        entityName: updates.entityName,
        status: updates.status ?? 'Active',
        estimatedUsefulLife: 0,
        estimatedUsefulLifeOverride: updates.estimatedUsefulLifeOverride ?? null,
        custodian: '',
        custodianPosition: '',
        assignmentStatus: 'Available',
        assignedDate: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return { data: optimistic, error: null, success: true };
    }
    const updateData: Record<string, unknown> = {};
    
    if (updates.propertyNumber) updateData.property_number = updates.propertyNumber;
    if (updates.description) updateData.description = updates.description;
    if (updates.brand) updateData.brand = updates.brand;
    if (updates.model) updateData.model = updates.model;
    if (updates.serialNumber) updateData.serial_number = updates.serialNumber;
    if (updates.unitOfMeasure) updateData.unit_of_measure = updates.unitOfMeasure;
    if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
    if (updates.unitCost !== undefined) updateData.unit_cost = updates.unitCost;
    if (updates.totalCost !== undefined) updateData.total_cost = updates.totalCost;
    if (updates.dateAcquired) updateData.date_acquired = updates.dateAcquired;
    if (updates.supplier) updateData.supplier_id = updates.supplier;
    if (updates.condition) updateData.condition = updates.condition;
    if (updates.semiExpandableCategory !== undefined) updateData.semi_expandable_category = updates.semiExpandableCategory || null;
    if (updates.subCategory) updateData.sub_category = updates.subCategory;
    if (updates.entityName) updateData.entity_name = updates.entityName;
    if (updates.fundSource) updateData.fund_source_id = updates.fundSource;
    if (updates.remarks) updateData.remarks = updates.remarks;
    if (updates.lastInventoryDate) updateData.last_inventory_date = updates.lastInventoryDate;
    // Category is always 'Semi-Expendable', no need to update
    if (updates.status) updateData.status = updates.status;
    if (updates.estimatedUsefulLifeOverride !== undefined) updateData.estimated_useful_life_override = updates.estimatedUsefulLifeOverride;

    const response = await supabase
      .from('inventory_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (response.error) {
      return {
        data: null,
        error: response.error.message,
        success: false,
      };
    }

    const transformedData = {
      id: response.data.id,
      propertyNumber: response.data.property_number,
      description: response.data.description || (response.data.model ? `${response.data.brand ? response.data.brand + ' ' : ''}${response.data.model}` : response.data.brand) || '',
      brand: response.data.brand || '',
      model: response.data.model || '',
      serialNumber: response.data.serial_number || '',
      unitOfMeasure: response.data.unit_of_measure,
      quantity: response.data.quantity,
      unitCost: response.data.unit_cost,
      totalCost: response.data.total_cost,
      dateAcquired: response.data.date_acquired,
      supplier: response.data.supplier_id || '',
      condition: response.data.condition,
      semiExpandableCategory: response.data.semi_expandable_category || undefined,
      subCategory: response.data.sub_category,
      entityName: response.data.entity_name,
      fundSource: response.data.fund_source_id || '',
      remarks: response.data.remarks || '',
      lastInventoryDate: response.data.last_inventory_date || '',
      status: response.data.status,
      estimatedUsefulLife: response.data.estimated_useful_life,
      estimatedUsefulLifeOverride: response.data.estimated_useful_life_override,
      // Add assignment status fields
      custodian: response.data.custodian || '',
      custodianPosition: response.data.custodian_position || '',
      assignmentStatus: response.data.assignment_status || 'Available',
      assignedDate: response.data.assigned_date || '',
      createdAt: response.data.created_at,
      updatedAt: response.data.updated_at
    };

    return {
      data: transformedData,
      error: null,
      success: true,
    };
  },

  // Delete inventory item
  async delete(id: string): Promise<SupabaseResponse<void>> {
    if (!navigator.onLine) {
      await enqueueOfflineMutation('inventory.delete', { id });
      return { data: null, error: null, success: true };
    }
    
    // First, check if the item is under custody
    const { data: item, error: fetchError } = await supabase
      .from('inventory_items')
      .select('id, assignment_status, custodian')
      .eq('id', id)
      .single();

    if (fetchError) {
      return {
        data: null,
        error: fetchError.message || 'Failed to fetch item details',
        success: false,
      };
    }

    // Check if item is under custody
    const isUnderCustody = item.assignment_status === 'Assigned' || 
                           (item.custodian && item.custodian.trim() !== '');
    
    if (isUnderCustody) {
      return {
        data: null,
        error: `This inventory item cannot be deleted because it is currently assigned to ${item.custodian || 'a custodian'}. Please unassign the item from the custodian first before deleting.`,
        success: false,
      };
    }
    
    // Use the safe deletion function to handle foreign key constraints
    const { data, error } = await supabase
      .rpc('safe_delete_inventory_item', { item_id: id });

    if (error) {
      
      // Check if function doesn't exist (400 Bad Request)
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        return {
          data: null,
          error: 'Safe deletion function not found. Please run the database setup script first.',
          success: false,
        };
      }
      
      // Check if it's a foreign key constraint error
      if (error.message.includes('Cannot delete inventory item')) {
        return {
          data: null,
          error: 'This inventory item cannot be deleted because it is assigned to custodian slips or has property card entries.',
          success: false,
        };
      }
      
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
  },

  // Search inventory items
  async search(query: string, filters: {
    page?: number;
    limit?: number;
    status?: string;
    condition?: string;
    filter?: 'available' | 'issued';
    valueFilter?: 'high-value' | 'low-value';
  } = {}): Promise<PaginatedResponse<InventoryItem>> {
    return this.getAll({
      ...filters,
      search: query,
    });
  },
};
