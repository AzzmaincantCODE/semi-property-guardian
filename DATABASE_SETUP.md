# Database Setup Guide

This guide explains how to set up and use the comprehensive database system for the Property Management application.

## Overview

The application now includes a complete database layer with:
- **SQLite Database** with comprehensive schema
- **Database Models** for all entities
- **API Layer** for data access
- **Data Service** for easy integration
- **Custom Hooks** for React components

## Database Schema

The database includes the following main entities:

### Core Entities
- **Users** - System users and authentication
- **Departments** - Organizational departments
- **Suppliers** - External suppliers
- **Fund Sources** - Funding sources
- **Locations** - Physical locations

### Property Management
- **Inventory Items** - Main property inventory
- **Property Cards** - Semi-expandable property cards
- **Property Transfers** - Property transfer records
- **Custodian Slips** - Custodian assignment records

### Reports
- **Physical Counts** - Physical inventory counts
- **Loss Reports** - Property loss reports
- **Unserviceable Reports** - Unserviceable property reports

### Audit
- **Audit Logs** - Complete audit trail

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Database

```bash
# Create and populate database with sample data
npm run db:setup

# Or reset existing database
npm run db:reset
```

### 3. Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=http://localhost:3001/api
```

## Database Structure

### Key Features

1. **Foreign Key Constraints** - Ensures data integrity
2. **Audit Logging** - Tracks all changes
3. **Soft Deletes** - Maintains data history
4. **Indexes** - Optimized for performance
5. **Triggers** - Automatic timestamp updates

### Relationships

- Users belong to Departments
- Inventory Items reference Suppliers, Locations, Users, and Fund Sources
- All reports reference Inventory Items
- Audit Logs track all changes

## Usage Examples

### Using the Data Service

```typescript
import { dataService } from './services/dataService';

// Get all inventory items
const inventory = await dataService.inventory.getAll();

// Create new inventory item
const newItem = await dataService.inventory.create({
  propertyNumber: 'SB-2024-001',
  description: 'Desktop Computer',
  // ... other fields
});

// Search inventory
const results = await dataService.inventory.search('computer');
```

### Using Custom Hooks

```typescript
import { useInventory } from './hooks/useInventory';

function InventoryComponent() {
  const { inventory, loading, error, createItem, updateItem, deleteItem } = useInventory();

  // Component logic here
}
```

### Direct API Usage

```typescript
import { inventoryApi } from './api/inventory';

// Get inventory with filters
const response = await inventoryApi.getAll({
  category: 'Equipment',
  status: 'Active',
  limit: 50
});
```

## API Endpoints

All entities have full CRUD operations:

### Inventory
- `GET /api/inventory` - Get all items
- `POST /api/inventory` - Create item
- `PUT /api/inventory/:id` - Update item
- `DELETE /api/inventory/:id` - Delete item
- `GET /api/inventory/statistics` - Get statistics

### Property Cards
- `GET /api/property-cards` - Get all cards
- `POST /api/property-cards` - Create card
- `GET /api/property-cards/:id/entries` - Get card entries

### Transfers
- `GET /api/transfers` - Get all transfers
- `POST /api/transfers` - Create transfer
- `PATCH /api/transfers/:id/approve` - Approve transfer

### Reports
- `GET /api/physical-counts` - Get physical counts
- `GET /api/loss-reports` - Get loss reports
- `GET /api/unserviceable-reports` - Get unserviceable reports

## Data Validation

All data is validated at multiple levels:
1. **Database Schema** - Type and constraint validation
2. **Model Layer** - Business logic validation
3. **API Layer** - Request validation
4. **Frontend** - Form validation

## Performance Optimization

- **Indexes** on frequently queried fields
- **Pagination** for large datasets
- **Filtering** and **searching** capabilities
- **Caching** at the service layer

## Security Features

- **Audit Logging** - Complete change tracking
- **User Authentication** - Role-based access
- **Data Validation** - Input sanitization
- **Foreign Key Constraints** - Data integrity

## Sample Data

The setup script includes sample data for:
- 4 Departments
- 4 Users (admin, manager, 2 users)
- 2 Suppliers
- 3 Fund Sources
- 4 Locations
- 3 Inventory Items

## Troubleshooting

### Database Not Found
```bash
npm run db:setup
```

### Permission Errors
Ensure the application has write permissions to the database directory.

### Connection Issues
Check that the database file exists and is accessible.

## Development

### Adding New Entities

1. Add table to `database/schema.sql`
2. Create model in `database/models/`
3. Add API endpoints in `src/api/`
4. Update data service in `src/services/dataService.ts`
5. Create custom hooks if needed

### Database Migrations

For production deployments, consider implementing proper migration scripts.

## Production Considerations

- **Backup Strategy** - Regular database backups
- **Performance Monitoring** - Query optimization
- **Security** - Database access controls
- **Scaling** - Consider PostgreSQL for larger deployments

## Support

For issues or questions about the database setup, please refer to the application documentation or contact the development team.
