// Supabase Client Configuration
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

// Debug: Log the actual values being used (remove in production)
if (import.meta.env.DEV) {
  console.log('🔧 Supabase Config:', {
    url: supabaseUrl,
    keyLength: supabaseAnonKey.length,
    isPlaceholder: supabaseUrl === 'https://placeholder.supabase.co' || supabaseAnonKey === 'placeholder-key'
  });
}

// Check if we're in development and show a helpful message
if (import.meta.env.DEV && (supabaseUrl === 'https://placeholder.supabase.co' || supabaseAnonKey === 'placeholder-key')) {
  console.warn('⚠️ Supabase environment variables not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types for TypeScript
export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          full_name: string;
          position: string | null;
          department_id: string | null;
          role: 'admin' | 'manager' | 'user';
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          position?: string | null;
          department_id?: string | null;
          role?: 'admin' | 'manager' | 'user';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          position?: string | null;
          department_id?: string | null;
          role?: 'admin' | 'manager' | 'user';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      departments: {
        Row: {
          id: string;
          name: string;
          code: string;
          description: string | null;
          head_officer: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          description?: string | null;
          head_officer?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          description?: string | null;
          head_officer?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      inventory_items: {
        Row: {
          id: string;
          property_number: string;
          description: string;
          brand: string | null;
          model: string | null;
          serial_number: string | null;
          unit_of_measure: string;
          quantity: number;
          unit_cost: number;
          total_cost: number;
          date_acquired: string;
          supplier_id: string | null;
          condition: 'Serviceable' | 'Unserviceable' | 'For Repair' | 'Lost' | 'Stolen' | 'Damaged' | 'Destroyed';
          location_id: string | null;
          custodian_id: string | null;
          custodian_position: string | null;
          accountable_officer: string | null;
          fund_source_id: string | null;
          remarks: string | null;
          last_inventory_date: string | null;
          category: 'Semi-Expandable' | 'Equipment' | 'Furniture';
          status: 'Active' | 'Transferred' | 'Disposed' | 'Missing';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          property_number: string;
          description: string;
          brand?: string | null;
          model?: string | null;
          serial_number?: string | null;
          unit_of_measure?: string;
          quantity?: number;
          unit_cost?: number;
          total_cost?: number;
          date_acquired: string;
          supplier_id?: string | null;
          condition?: 'Serviceable' | 'Unserviceable' | 'For Repair' | 'Lost' | 'Stolen' | 'Damaged' | 'Destroyed';
          location_id?: string | null;
          custodian_id?: string | null;
          custodian_position?: string | null;
          accountable_officer?: string | null;
          fund_source_id?: string | null;
          remarks?: string | null;
          last_inventory_date?: string | null;
          category?: 'Semi-Expandable' | 'Equipment' | 'Furniture';
          status?: 'Active' | 'Transferred' | 'Disposed' | 'Missing';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          property_number?: string;
          description?: string;
          brand?: string | null;
          model?: string | null;
          serial_number?: string | null;
          unit_of_measure?: string;
          quantity?: number;
          unit_cost?: number;
          total_cost?: number;
          date_acquired?: string;
          supplier_id?: string | null;
          condition?: 'Serviceable' | 'Unserviceable' | 'For Repair' | 'Lost' | 'Stolen' | 'Damaged' | 'Destroyed';
          location_id?: string | null;
          custodian_id?: string | null;
          custodian_position?: string | null;
          accountable_officer?: string | null;
          fund_source_id?: string | null;
          remarks?: string | null;
          last_inventory_date?: string | null;
          category?: 'Semi-Expandable' | 'Equipment' | 'Furniture';
          status?: 'Active' | 'Transferred' | 'Disposed' | 'Missing';
          created_at?: string;
          updated_at?: string;
        };
      };
      // Add other table types as needed
    };
  };
}

// Helper function to handle Supabase responses
export const handleSupabaseResponse = <T>(response: { data: T | null; error: any }) => {
  if (response.error) {
    throw new Error(response.error.message);
  }
  return response.data;
};

// Helper function for pagination
export const createPaginationParams = (page: number = 1, limit: number = 50) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return { from, to };
};
