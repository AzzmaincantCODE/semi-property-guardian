// Custom hook for inventory management
import { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { InventoryItem } from '../types/inventory';

export const useInventory = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all inventory items
  const loadInventory = async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await dataService.inventory.getAll(filters);
      if (response.success && response.data) {
        setInventory(response.data);
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
      const response = await dataService.inventory.create(item);
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
      const response = await dataService.inventory.update(id, updates);
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
      const response = await dataService.inventory.delete(id);
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
      const response = await dataService.inventory.search(query, filters);
      if (response.success && response.data) {
        setInventory(response.data);
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
      const response = await dataService.inventory.getStatistics();
      if (response.success && response.data) {
        return response.data;
      } else {
        setError(response.error || 'Failed to get statistics');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  };

  // Load inventory on mount
  useEffect(() => {
    loadInventory();
  }, []);

  return {
    inventory,
    loading,
    error,
    loadInventory,
    createItem,
    updateItem,
    deleteItem,
    searchItems,
    getStatistics,
  };
};
