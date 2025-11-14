// Lookup Service for related tables
import { supabase } from '../lib/supabase';

export interface LookupItem {
  id: string;
  name: string;
  code?: string;
}

export const lookupService = {
  // Get all suppliers
  async getSuppliers(): Promise<LookupItem[]> {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching suppliers:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Network error fetching suppliers:', err);
      return [];
    }
  },

  // Get all custodians (from dedicated table)
  async getCustodians(): Promise<LookupItem[]> {
    try {
      const { data, error } = await supabase
        .from('custodians')
        .select('id, name, custodian_no')
        .order('name');

      if (error) {
        console.error('Error fetching custodians:', error);
        // Return empty array instead of throwing to prevent app crashes
        return [];
      }
      return (data || []).map((r: any) => ({ id: r.id, name: r.name, code: r.custodian_no }));
    } catch (err) {
      console.error('Network error fetching custodians:', err);
      // Return empty array for network errors
      return [];
    }
  },


  // Get all fund sources
  async getFundSources(): Promise<LookupItem[]> {
    const { data, error } = await supabase
      .from('fund_sources')
      .select('id, name, code')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching fund sources:', error);
      return [];
    }

    return data || [];
  },

  // Get all users (for custodian)
  async getUsers(): Promise<LookupItem[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('is_active', true)
      .order('full_name');

    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }

    return data || [];
  },

  // Get all departments
  async getDepartments(): Promise<LookupItem[]> {
    const { data, error } = await supabase
      .from('departments')
      .select('id, name, code')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching departments:', error);
      return [];
    }

    return data || [];
  },

  // Get all semi expandable categories
  async getSemiExpandableCategories(): Promise<LookupItem[]> {
    const { data, error } = await supabase
      .from('semi_expandable_categories')
      .select('id, name, code')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching semi expandable categories:', error);
      return [];
    }

    return data || [];
  },

  // Create lookup
  async create(table: 'suppliers' | 'fund_sources' | 'departments' | 'custodians' | 'semi_expandable_categories', values: { name: string; code?: string }) {
    const payload: any = { name: values.name };
    const trimmedCode = values.code?.trim();
    
    // Handle different table requirements
    if (table === 'fund_sources') {
      // Fund sources require a code
      if (!trimmedCode) {
        throw new Error('Code is required for fund sources');
      }
      payload.code = trimmedCode;
    } else if (table === 'departments' || table === 'semi_expandable_categories') {
      // Departments and semi_expandable_categories can have optional code
      if (trimmedCode) payload.code = trimmedCode;
    } else if (table === 'custodians') {
      // For custodians, use custodian_no instead of code
      let custodianNo = trimmedCode;
      if (!custodianNo) {
        // Auto-generate custodian_no as next numeric sequence based on existing max
        const { data: rows, error: maxErr } = await supabase
          .from('custodians')
          .select('custodian_no')
          .order('custodian_no', { ascending: false })
          .limit(50);
        if (!maxErr && rows) {
          const nums = rows
            .map(r => String(r.custodian_no || '').trim())
            .map(s => (s.match(/\d+/) ? parseInt((s.match(/\d+/) as RegExpMatchArray)[0], 10) : NaN))
            .filter(n => Number.isFinite(n)) as number[];
          const next = (nums.length ? Math.max(...nums) + 1 : 1);
          custodianNo = String(next).padStart(4, '0');
        } else {
          custodianNo = '0001';
        }
      }
      // Normalize to CUST-0001 format for consistency
      const numeric = (custodianNo.match(/\d+/) ? (custodianNo.match(/\d+/) as RegExpMatchArray)[0] : custodianNo).padStart(4, '0');
      const normalized = `CUST-${numeric}`;
      // Pre-insert duplicate check for clearer UX
      const { data: existing, error: checkErr } = await supabase
        .from('custodians')
        .select('id')
        .in('custodian_no', [custodianNo, normalized])
        .limit(1);
      if (!checkErr && existing && existing.length > 0) {
        throw new Error('Custodian number already exists. Please use a different number.');
      }
      payload.custodian_no = normalized;
    }
    
    const selectCols = (table === 'fund_sources' || table === 'departments' || table === 'semi_expandable_categories') ? 'id, name, code' : 
                      table === 'custodians' ? 'id, name, custodian_no' : 'id, name';
    
    const { data, error } = await supabase.from(table).insert(payload).select(selectCols).single();
    if (error) {
      // Handle specific constraint violations
      if (error.code === '23505') {
        if (table === 'custodians') {
          throw new Error('Custodian number already exists. Please use a different number.');
        } else {
          throw new Error('A record with this code already exists. Please use a different code.');
        }
      }
      if (error.code === '23502' && table === 'departments') {
        // Not-null violation on departments.code — guide user to run migration
        throw new Error('Department code is optional, but your database still requires it. Please run database/make-department-code-optional.sql in Supabase.');
      }
      throw error;
    }
    
    // Map custodian response to standard format
    if (table === 'custodians') {
      return { id: data.id, name: data.name, code: data.custodian_no };
    }
    
    return data as any as LookupItem;
  },

  // Update lookup
  async update(table: 'suppliers' | 'fund_sources' | 'departments' | 'custodians' | 'semi_expandable_categories', id: string, values: { name?: string; code?: string }) {
    const payload: any = {};
    if (values.name !== undefined) payload.name = values.name;
    
    // Handle different table requirements
    const trimmedCode = values.code?.trim();
    if (table === 'fund_sources' || table === 'departments' || table === 'semi_expandable_categories') {
      if (values.code !== undefined) payload.code = trimmedCode ?? null;
    } else if (table === 'custodians') {
      // For custodians, use custodian_no instead of code
      if (values.code !== undefined) {
        if (trimmedCode) {
          const numeric = (trimmedCode.match(/\d+/) ? (trimmedCode.match(/\d+/) as RegExpMatchArray)[0] : trimmedCode).padStart(4, '0');
          payload.custodian_no = `CUST-${numeric}`;
        } else {
          payload.custodian_no = null;
        }
      }
    }
    
    const selectCols = (table === 'fund_sources' || table === 'departments' || table === 'semi_expandable_categories') ? 'id, name, code' : 
                      table === 'custodians' ? 'id, name, custodian_no' : 'id, name';
    
    const { data, error } = await supabase.from(table).update(payload).eq('id', id).select(selectCols).single();
    if (error) throw error;
    
    // Map custodian response to standard format
    if (table === 'custodians') {
      return { id: data.id, name: data.name, code: data.custodian_no };
    }
    
    return data as any as LookupItem;
  },

  // Delete lookup
  async remove(table: 'suppliers' | 'fund_sources' | 'departments' | 'custodians' | 'semi_expandable_categories', id: string) {
    // For departments, check if it's referenced by custodians
    if (table === 'departments') {
      const { data: custodians, error: checkError } = await supabase
        .from('custodians')
        .select('id')
        .eq('department_id', id)
        .limit(1);
      
      if (checkError) throw checkError;
      
      if (custodians && custodians.length > 0) {
        throw new Error('Cannot delete department: It is currently assigned to custodians. Please reassign the custodians to a different department first.');
      }
    }
    
    // For custodians, check if they're referenced by inventory items
    if (table === 'custodians') {
      const { data: inventoryItems, error: checkError } = await supabase
        .from('inventory_items')
        .select('id')
        .eq('custodian_id', id)
        .limit(1);
      
      if (checkError) throw checkError;
      
      if (inventoryItems && inventoryItems.length > 0) {
        throw new Error('Cannot delete custodian: They are assigned to inventory items. Please reassign the items first.');
      }
    }
    
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    return true;
  },
};
