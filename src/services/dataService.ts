// Data Service Layer - Centralized data access for all database operations
import {
  inventoryApi,
  propertyCardApi,
  transferApi,
  custodianSlipApi,
  physicalCountApi,
  lossReportApi,
  unserviceableReportApi,
  userApi,
  departmentApi,
  supplierApi,
  fundSourceApi,
  auditLogApi,
} from '../api';

// Re-export all API types for convenience
export type { InventoryItem } from '../types/inventory';
export type { PropertyCard, SPCEntry } from '../api/propertyCard';
export type { Transfer, TransferItem } from '../api/transfer';
export type { CustodianSlip, CustodianSlipItem } from '../api/custodianSlip';
export type { PhysicalCount, PhysicalCountItem } from '../api/physicalCount';
export type { LossReport, LossReportItem } from '../api/lossReport';
export type { UnserviceableReport, UnserviceableReportItem } from '../api/unserviceableReport';
export type { User } from '../api/user';
export type { Department } from '../api/department';
export type { Supplier } from '../api/supplier';
export type { FundSource } from '../api/fundSource';
export type { Location } from '../api/location';
export type { AuditLog } from '../api/auditLog';

// Centralized data service that provides easy access to all database operations
export const dataService = {
  // Inventory Management
  inventory: {
    // Get all inventory items
    async getAll(filters = {}) {
      return inventoryApi.getAll(filters);
    },

    // Get inventory item by ID
    async getById(id: string) {
      return inventoryApi.getById(id);
    },

    // Get inventory item by property number
    async getByPropertyNumber(propertyNumber: string) {
      return inventoryApi.getByPropertyNumber(propertyNumber);
    },

    // Create new inventory item
    async create(item: unknown) {
      return inventoryApi.create(item);
    },

    // Update inventory item
    async update(id: string, updates: unknown) {
      return inventoryApi.update(id, updates);
    },

    // Delete inventory item
    async delete(id: string) {
      return inventoryApi.delete(id);
    },

    // Get inventory statistics
    async getStatistics() {
      return inventoryApi.getStatistics();
    },

    // Search inventory items
    async search(query: string, filters = {}) {
      return inventoryApi.search(query, filters);
    },

    // Get inventory by category
    async getByCategory(category: string, filters = {}) {
      return inventoryApi.getByCategory(category, filters);
    },

    // Get inventory by status
    async getByStatus(status: string, filters = {}) {
      return inventoryApi.getByStatus(status, filters);
    },

    // Get inventory by condition
    async getByCondition(condition: string, filters = {}) {
      return inventoryApi.getByCondition(condition, filters);
    },

    // Update inventory item condition
    async updateCondition(id: string, condition: string) {
      return inventoryApi.updateCondition(id, condition);
    },

    // Update inventory item status
    async updateStatus(id: string, status: string) {
      return inventoryApi.updateStatus(id, status);
    },

    // Transfer inventory item
    async transfer(id: string, toLocation: string, toCustodian: string, reason: string) {
      return inventoryApi.transfer(id, toLocation, toCustodian, reason);
    },

    // Get inventory history
    async getHistory(id: string) {
      return inventoryApi.getHistory(id);
    },
  },

  // Property Card Management
  propertyCards: {
    // Get all property cards
    async getAll(filters = {}) {
      return propertyCardApi.getAll(filters);
    },

    // Get property card by ID
    async getById(id: string) {
      return propertyCardApi.getById(id);
    },

    // Get property card by property number
    async getByPropertyNumber(propertyNumber: string) {
      return propertyCardApi.getByPropertyNumber(propertyNumber);
    },

    // Create new property card
    async create(card: unknown) {
      return propertyCardApi.create(card);
    },

    // Update property card
    async update(id: string, updates: unknown) {
      return propertyCardApi.update(id, updates);
    },

    // Delete property card
    async delete(id: string) {
      return propertyCardApi.delete(id);
    },

    // Get property card with entries
    async getWithEntries(id: string) {
      return propertyCardApi.getWithEntries(id);
    },

    // Add entry to property card
    async addEntry(propertyCardId: string, entry: unknown) {
      return propertyCardApi.addEntry(propertyCardId, entry);
    },

    // Update entry
    async updateEntry(propertyCardId: string, entryId: string, updates: unknown) {
      return propertyCardApi.updateEntry(propertyCardId, entryId, updates);
    },

    // Delete entry
    async deleteEntry(propertyCardId: string, entryId: string) {
      return propertyCardApi.deleteEntry(propertyCardId, entryId);
    },

    // Get entries for property card
    async getEntries(propertyCardId: string) {
      return propertyCardApi.getEntries(propertyCardId);
    },

    // Search property cards
    async search(query: string, filters = {}) {
      return propertyCardApi.search(query, filters);
    },

    // Get property cards by fund cluster
    async getByFundCluster(fundCluster: string, filters = {}) {
      return propertyCardApi.getByFundCluster(fundCluster, filters);
    },
  },

  // Transfer Management
  transfers: {
    // Get all transfers
    async getAll(filters = {}) {
      return transferApi.getAll(filters);
    },

    // Get transfer by ID
    async getById(id: string) {
      return transferApi.getById(id);
    },

    // Get transfer by transfer number
    async getByTransferNumber(transferNumber: string) {
      return transferApi.getByTransferNumber(transferNumber);
    },

    // Create new transfer
    async create(transfer: unknown) {
      return transferApi.create(transfer);
    },

    // Update transfer
    async update(id: string, updates: unknown) {
      return transferApi.update(id, updates);
    },

    // Delete transfer
    async delete(id: string) {
      return transferApi.delete(id);
    },

    // Get transfer with items
    async getWithItems(id: string) {
      return transferApi.getWithItems(id);
    },

    // Add item to transfer
    async addItem(transferId: string, item: unknown) {
      return transferApi.addItem(transferId, item);
    },

    // Update transfer item
    async updateItem(transferId: string, itemId: string, updates: unknown) {
      return transferApi.updateItem(transferId, itemId, updates);
    },

    // Delete transfer item
    async deleteItem(transferId: string, itemId: string) {
      return transferApi.deleteItem(transferId, itemId);
    },

    // Get items for transfer
    async getItems(transferId: string) {
      return transferApi.getItems(transferId);
    },

    // Approve transfer
    async approve(id: string, approvedBy: string) {
      return transferApi.approve(id, approvedBy);
    },

    // Complete transfer
    async complete(id: string) {
      return transferApi.complete(id);
    },

    // Reject transfer
    async reject(id: string) {
      return transferApi.reject(id);
    },

    // Get transfer statistics
    async getStatistics() {
      return transferApi.getStatistics();
    },

    // Search transfers
    async search(query: string, filters = {}) {
      return transferApi.search(query, filters);
    },

    // Get transfers by status
    async getByStatus(status: string, filters = {}) {
      return transferApi.getByStatus(status, filters);
    },

    // Get transfers by type
    async getByType(transferType: string, filters = {}) {
      return transferApi.getByType(transferType, filters);
    },
  },

  // Custodian Slip Management
  custodianSlips: {
    // Get all custodian slips
    async getAll(filters = {}) {
      return custodianSlipApi.getAll(filters);
    },

    // Get custodian slip by ID
    async getById(id: string) {
      return custodianSlipApi.getById(id);
    },

    // Get custodian slip by slip number
    async getBySlipNumber(slipNumber: string) {
      return custodianSlipApi.getBySlipNumber(slipNumber);
    },

    // Create new custodian slip
    async create(slip: unknown) {
      return custodianSlipApi.create(slip);
    },

    // Update custodian slip
    async update(id: string, updates: unknown) {
      return custodianSlipApi.update(id, updates);
    },

    // Delete custodian slip
    async delete(id: string) {
      return custodianSlipApi.delete(id);
    },

    // Get custodian slip with items
    async getWithItems(id: string) {
      return custodianSlipApi.getWithItems(id);
    },

    // Add item to custodian slip
    async addItem(slipId: string, item: unknown) {
      return custodianSlipApi.addItem(slipId, item);
    },

    // Update custodian slip item
    async updateItem(slipId: string, itemId: string, updates: unknown) {
      return custodianSlipApi.updateItem(slipId, itemId, updates);
    },

    // Delete custodian slip item
    async deleteItem(slipId: string, itemId: string) {
      return custodianSlipApi.deleteItem(slipId, itemId);
    },

    // Get items for custodian slip
    async getItems(slipId: string) {
      return custodianSlipApi.getItems(slipId);
    },

    // Search custodian slips
    async search(query: string, filters = {}) {
      return custodianSlipApi.search(query, filters);
    },

    // Get custodian slips by office
    async getByOffice(office: string, filters = {}) {
      return custodianSlipApi.getByOffice(office, filters);
    },

    // Print custodian slip
    async print(id: string) {
      return custodianSlipApi.print(id);
    },
  },

  // Physical Count Management
  physicalCounts: {
    // Get all physical counts
    async getAll(filters = {}) {
      return physicalCountApi.getAll(filters);
    },

    // Get physical count by ID
    async getById(id: string) {
      return physicalCountApi.getById(id);
    },

    // Get physical count by count number
    async getByCountNumber(countNumber: string) {
      return physicalCountApi.getByCountNumber(countNumber);
    },

    // Create new physical count
    async create(count: unknown) {
      return physicalCountApi.create(count);
    },

    // Update physical count
    async update(id: string, updates: unknown) {
      return physicalCountApi.update(id, updates);
    },

    // Delete physical count
    async delete(id: string) {
      return physicalCountApi.delete(id);
    },

    // Get physical count with items
    async getWithItems(id: string) {
      return physicalCountApi.getWithItems(id);
    },

    // Add item to physical count
    async addItem(countId: string, item: unknown) {
      return physicalCountApi.addItem(countId, item);
    },

    // Update physical count item
    async updateItem(countId: string, itemId: string, updates: unknown) {
      return physicalCountApi.updateItem(countId, itemId, updates);
    },

    // Delete physical count item
    async deleteItem(countId: string, itemId: string) {
      return physicalCountApi.deleteItem(countId, itemId);
    },

    // Get items for physical count
    async getItems(countId: string) {
      return physicalCountApi.getItems(countId);
    },

    // Calculate totals for physical count
    async calculateTotals(countId: string) {
      return physicalCountApi.calculateTotals(countId);
    },

    // Update totals for physical count
    async updateTotals(countId: string) {
      return physicalCountApi.updateTotals(countId);
    },

    // Start physical count
    async start(id: string) {
      return physicalCountApi.start(id);
    },

    // Complete physical count
    async complete(id: string) {
      return physicalCountApi.complete(id);
    },

    // Search physical counts
    async search(query: string, filters = {}) {
      return physicalCountApi.search(query, filters);
    },

    // Get physical counts by status
    async getByStatus(status: string, filters = {}) {
      return physicalCountApi.getByStatus(status, filters);
    },

    // Get physical counts by type
    async getByType(countType: string, filters = {}) {
      return physicalCountApi.getByType(countType, filters);
    },

    // Get physical counts by department
    async getByDepartment(department: string, filters = {}) {
      return physicalCountApi.getByDepartment(department, filters);
    },
  },

  // Loss Report Management
  lossReports: {
    // Get all loss reports
    async getAll(filters = {}) {
      return lossReportApi.getAll(filters);
    },

    // Get loss report by ID
    async getById(id: string) {
      return lossReportApi.getById(id);
    },

    // Get loss report by report number
    async getByReportNumber(reportNumber: string) {
      return lossReportApi.getByReportNumber(reportNumber);
    },

    // Create new loss report
    async create(report: unknown) {
      return lossReportApi.create(report);
    },

    // Update loss report
    async update(id: string, updates: unknown) {
      return lossReportApi.update(id, updates);
    },

    // Delete loss report
    async delete(id: string) {
      return lossReportApi.delete(id);
    },

    // Get loss report with items
    async getWithItems(id: string) {
      return lossReportApi.getWithItems(id);
    },

    // Add item to loss report
    async addItem(reportId: string, item: unknown) {
      return lossReportApi.addItem(reportId, item);
    },

    // Update loss report item
    async updateItem(reportId: string, itemId: string, updates: unknown) {
      return lossReportApi.updateItem(reportId, itemId, updates);
    },

    // Delete loss report item
    async deleteItem(reportId: string, itemId: string) {
      return lossReportApi.deleteItem(reportId, itemId);
    },

    // Get items for loss report
    async getItems(reportId: string) {
      return lossReportApi.getItems(reportId);
    },

    // Calculate total loss amount for report
    async calculateTotalLoss(reportId: string) {
      return lossReportApi.calculateTotalLoss(reportId);
    },

    // Update total loss amount for report
    async updateTotalLoss(reportId: string) {
      return lossReportApi.updateTotalLoss(reportId);
    },

    // Submit report for investigation
    async submit(id: string) {
      return lossReportApi.submit(id);
    },

    // Approve report
    async approve(id: string, approvedBy: string) {
      return lossReportApi.approve(id, approvedBy);
    },

    // Reject report
    async reject(id: string) {
      return lossReportApi.reject(id);
    },

    // Search loss reports
    async search(query: string, filters = {}) {
      return lossReportApi.search(query, filters);
    },

    // Get loss reports by status
    async getByStatus(status: string, filters = {}) {
      return lossReportApi.getByStatus(status, filters);
    },

    // Get loss reports by type
    async getByType(reportType: string, filters = {}) {
      return lossReportApi.getByType(reportType, filters);
    },

    // Get loss reports by department
    async getByDepartment(department: string, filters = {}) {
      return lossReportApi.getByDepartment(department, filters);
    },
  },

  // Unserviceable Report Management
  unserviceableReports: {
    // Get all unserviceable reports
    async getAll(filters = {}) {
      return unserviceableReportApi.getAll(filters);
    },

    // Get unserviceable report by ID
    async getById(id: string) {
      return unserviceableReportApi.getById(id);
    },

    // Get unserviceable report by report number
    async getByReportNumber(reportNumber: string) {
      return unserviceableReportApi.getByReportNumber(reportNumber);
    },

    // Create new unserviceable report
    async create(report: unknown) {
      return unserviceableReportApi.create(report);
    },

    // Update unserviceable report
    async update(id: string, updates: unknown) {
      return unserviceableReportApi.update(id, updates);
    },

    // Delete unserviceable report
    async delete(id: string) {
      return unserviceableReportApi.delete(id);
    },

    // Get unserviceable report with items
    async getWithItems(id: string) {
      return unserviceableReportApi.getWithItems(id);
    },

    // Add item to unserviceable report
    async addItem(reportId: string, item: unknown) {
      return unserviceableReportApi.addItem(reportId, item);
    },

    // Update unserviceable report item
    async updateItem(reportId: string, itemId: string, updates: unknown) {
      return unserviceableReportApi.updateItem(reportId, itemId, updates);
    },

    // Delete unserviceable report item
    async deleteItem(reportId: string, itemId: string) {
      return unserviceableReportApi.deleteItem(reportId, itemId);
    },

    // Get items for unserviceable report
    async getItems(reportId: string) {
      return unserviceableReportApi.getItems(reportId);
    },

    // Calculate total value for report
    async calculateTotalValue(reportId: string) {
      return unserviceableReportApi.calculateTotalValue(reportId);
    },

    // Update total value for report
    async updateTotalValue(reportId: string) {
      return unserviceableReportApi.updateTotalValue(reportId);
    },

    // Search unserviceable reports
    async search(query: string, filters = {}) {
      return unserviceableReportApi.search(query, filters);
    },

    // Get unserviceable reports by department
    async getByDepartment(department: string, filters = {}) {
      return unserviceableReportApi.getByDepartment(department, filters);
    },
  },

  // User Management
  users: {
    // Get all users
    async getAll(filters = {}) {
      return userApi.getAll(filters);
    },

    // Get user by ID
    async getById(id: string) {
      return userApi.getById(id);
    },

    // Get user by username
    async getByUsername(username: string) {
      return userApi.getByUsername(username);
    },

    // Get user by email
    async getByEmail(email: string) {
      return userApi.getByEmail(email);
    },

    // Create new user
    async create(user: unknown) {
      return userApi.create(user);
    },

    // Update user
    async update(id: string, updates: unknown) {
      return userApi.update(id, updates);
    },

    // Delete user
    async delete(id: string) {
      return userApi.delete(id);
    },

    // Activate user
    async activate(id: string) {
      return userApi.activate(id);
    },

    // Deactivate user
    async deactivate(id: string) {
      return userApi.deactivate(id);
    },

    // Change user password
    async changePassword(id: string, newPasswordHash: string) {
      return userApi.changePassword(id, newPasswordHash);
    },

    // Get user statistics
    async getStatistics() {
      return userApi.getStatistics();
    },

    // Search users
    async search(query: string, filters = {}) {
      return userApi.search(query, filters);
    },

    // Get users by role
    async getByRole(role: string, filters = {}) {
      return userApi.getByRole(role, filters);
    },

    // Get users by department
    async getByDepartment(department: string, filters = {}) {
      return userApi.getByDepartment(department, filters);
    },

    // Get active users
    async getActive(filters = {}) {
      return userApi.getActive(filters);
    },
  },

  // Department Management
  departments: {
    // Get all departments
    async getAll(filters = {}) {
      return departmentApi.getAll(filters);
    },

    // Get department by ID
    async getById(id: string) {
      return departmentApi.getById(id);
    },

    // Get department by code
    async getByCode(code: string) {
      return departmentApi.getByCode(code);
    },

    // Create new department
    async create(department: unknown) {
      return departmentApi.create(department);
    },

    // Update department
    async update(id: string, updates: unknown) {
      return departmentApi.update(id, updates);
    },

    // Delete department
    async delete(id: string) {
      return departmentApi.delete(id);
    },

    // Activate department
    async activate(id: string) {
      return departmentApi.activate(id);
    },

    // Deactivate department
    async deactivate(id: string) {
      return departmentApi.deactivate(id);
    },

    // Search departments
    async search(query: string, filters = {}) {
      return departmentApi.search(query, filters);
    },

    // Get active departments
    async getActive(filters = {}) {
      return departmentApi.getActive(filters);
    },
  },

  // Supplier Management
  suppliers: {
    // Get all suppliers
    async getAll(filters = {}) {
      return supplierApi.getAll(filters);
    },

    // Get supplier by ID
    async getById(id: string) {
      return supplierApi.getById(id);
    },

    // Get supplier by name
    async getByName(name: string) {
      return supplierApi.getByName(name);
    },

    // Create new supplier
    async create(supplier: unknown) {
      return supplierApi.create(supplier);
    },

    // Update supplier
    async update(id: string, updates: unknown) {
      return supplierApi.update(id, updates);
    },

    // Delete supplier
    async delete(id: string) {
      return supplierApi.delete(id);
    },

    // Activate supplier
    async activate(id: string) {
      return supplierApi.activate(id);
    },

    // Deactivate supplier
    async deactivate(id: string) {
      return supplierApi.deactivate(id);
    },

    // Search suppliers
    async search(query: string, filters = {}) {
      return supplierApi.search(query, filters);
    },

    // Get active suppliers
    async getActive(filters = {}) {
      return supplierApi.getActive(filters);
    },
  },

  // Fund Source Management
  fundSources: {
    // Get all fund sources
    async getAll(filters = {}) {
      return fundSourceApi.getAll(filters);
    },

    // Get fund source by ID
    async getById(id: string) {
      return fundSourceApi.getById(id);
    },

    // Get fund source by code
    async getByCode(code: string) {
      return fundSourceApi.getByCode(code);
    },

    // Create new fund source
    async create(fundSource: unknown) {
      return fundSourceApi.create(fundSource);
    },

    // Update fund source
    async update(id: string, updates: unknown) {
      return fundSourceApi.update(id, updates);
    },

    // Delete fund source
    async delete(id: string) {
      return fundSourceApi.delete(id);
    },

    // Activate fund source
    async activate(id: string) {
      return fundSourceApi.activate(id);
    },

    // Deactivate fund source
    async deactivate(id: string) {
      return fundSourceApi.deactivate(id);
    },

    // Search fund sources
    async search(query: string, filters = {}) {
      return fundSourceApi.search(query, filters);
    },

    // Get active fund sources
    async getActive(filters = {}) {
      return fundSourceApi.getActive(filters);
    },
  },


  // Audit Log Management
  auditLogs: {
    // Get all audit logs
    async getAll(filters = {}) {
      return auditLogApi.getAll(filters);
    },

    // Get audit log by ID
    async getById(id: string) {
      return auditLogApi.getById(id);
    },

    // Get audit logs for a specific record
    async getRecordHistory(tableName: string, recordId: string) {
      return auditLogApi.getRecordHistory(tableName, recordId);
    },

    // Get audit logs for a specific user
    async getUserActivity(userId: string, limit = 50) {
      return auditLogApi.getUserActivity(userId, limit);
    },

    // Get audit logs for a specific table
    async getTableHistory(tableName: string, limit = 100) {
      return auditLogApi.getTableHistory(tableName, limit);
    },

    // Get audit statistics
    async getStatistics() {
      return auditLogApi.getStatistics();
    },

    // Clean up old audit logs
    async cleanup(daysOld: number) {
      return auditLogApi.cleanup(daysOld);
    },

    // Search audit logs
    async search(query: string, filters = {}) {
      return auditLogApi.search(query, filters);
    },

    // Get audit logs by action
    async getByAction(action: string, filters = {}) {
      return auditLogApi.getByAction(action, filters);
    },

    // Get audit logs by table
    async getByTable(tableName: string, filters = {}) {
      return auditLogApi.getByTable(tableName, filters);
    },

    // Get audit logs by user
    async getByUser(userId: string, filters = {}) {
      return auditLogApi.getByUser(userId, filters);
    },

    // Get audit logs by date range
    async getByDateRange(startDate: string, endDate: string, filters = {}) {
      return auditLogApi.getByDateRange(startDate, endDate, filters);
    },
  },

  // Utility functions for common operations
  utils: {
    // Get dashboard statistics
    async getDashboardStats() {
      const [inventoryStats, transferStats, userStats] = await Promise.all([
        inventoryApi.getStatistics(),
        transferApi.getStatistics(),
        userApi.getStatistics(),
      ]);

      return {
        inventory: inventoryStats.data,
        transfers: transferStats.data,
        users: userStats.data,
      };
    },

    // Search across all entities
    async globalSearch(query: string) {
      const [inventory, propertyCards, transfers, custodianSlips, physicalCounts, lossReports, unserviceableReports] = await Promise.all([
        inventoryApi.search(query, { limit: 10 }),
        propertyCardApi.search(query, { limit: 10 }),
        transferApi.search(query, { limit: 10 }),
        custodianSlipApi.search(query, { limit: 10 }),
        physicalCountApi.search(query, { limit: 10 }),
        lossReportApi.search(query, { limit: 10 }),
        unserviceableReportApi.search(query, { limit: 10 }),
      ]);

      return {
        inventory: inventory.data || [],
        propertyCards: propertyCards.data || [],
        transfers: transfers.data || [],
        custodianSlips: custodianSlips.data || [],
        physicalCounts: physicalCounts.data || [],
        lossReports: lossReports.data || [],
        unserviceableReports: unserviceableReports.data || [],
      };
    },

    // Get recent activity
    async getRecentActivity(limit = 20) {
      return auditLogApi.getAll({ limit, offset: 0 });
    },
  },
};

export default dataService;
