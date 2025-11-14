// Custom hook for inventory management with Supabase
import { useState, useEffect } from 'react';
import { simpleInventoryService } from '../services/simpleInventoryService';
import { supabase } from '../lib/supabase';
import { InventoryItem } from '../types/inventory';

export const useSupabaseInventory = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  // Load all inventory items
  const loadInventory = async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await simpleInventoryService.getAll(filters);
      if (response.success && response.data) {
        setInventory(response.data);
        setPagination(response.pagination);
      } else {
        setError(response.error || 'Failed to load inventory');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Create new inventory item
  const createItem = async (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await simpleInventoryService.create(item);
      if (response.success && response.data) {
        setInventory(prev => [response.data!, ...prev]);
        return response.data;
      } else {
        setError(response.error || 'Failed to create inventory item');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update inventory item
  const updateItem = async (id: string, updates: Partial<InventoryItem>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await simpleInventoryService.update(id, updates);
      if (response.success && response.data) {
        setInventory(prev => 
          prev.map(item => item.id === id ? response.data! : item)
        );
        return response.data;
      } else {
        setError(response.error || 'Failed to update inventory item');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Delete inventory item
  const deleteItem = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await simpleInventoryService.delete(id);
      if (response.success) {
        setInventory(prev => prev.filter(item => item.id !== id));
        return true;
      } else {
        setError(response.error || 'Failed to delete inventory item');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Search inventory items
  const searchItems = async (query: string, filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await simpleInventoryService.search(query, filters);
      if (response.success && response.data) {
        setInventory(response.data);
        setPagination(response.pagination);
        return response.data;
      } else {
        setError(response.error || 'Failed to search inventory');
        return [];
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Get inventory statistics
  const getStatistics = async () => {
    try {
      // For now, return basic statistics without complex queries
      return {
        totalItems: inventory.length,
        totalValue: inventory.reduce((sum, item) => sum + (item.totalCost || 0), 0),
        byCategory: inventory.reduce((acc, item) => {
          acc[item.category] = (acc[item.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byStatus: inventory.reduce((acc, item) => {
          acc[item.status] = (acc[item.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byCondition: inventory.reduce((acc, item) => {
          acc[item.condition] = (acc[item.condition] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  };

  // Load inventory on mount
  useEffect(() => {
    loadInventory();

    const channel = supabase
      .channel('realtime:inventory_items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => {
        loadInventory();
      })
      .subscribe();

    const onFocus = () => loadInventory();
    window.addEventListener('focus', onFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return {
    inventory,
    loading,
    error,
    pagination,
    loadInventory,
    createItem,
    updateItem,
    deleteItem,
    searchItems,
    getStatistics,
  };
};
