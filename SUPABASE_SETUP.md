# Supabase Database Setup Guide

This guide explains how to set up the Property Management application with Supabase as your database backend.

## Overview

The application has been adapted to work with Supabase PostgreSQL, providing:
- **Real-time subscriptions** for live data updates
- **Row Level Security (RLS)** for data protection
- **Built-in authentication** with Supabase Auth
- **Auto-generated APIs** with PostgREST
- **File storage** for attachments
- **Edge functions** for serverless logic

## Prerequisites

1. **Supabase Account** - Sign up at [supabase.com](https://supabase.com)
2. **Node.js** - Version 18 or higher
3. **npm** or **yarn** package manager

## Setup Instructions

> **Lost project recovery (new Supabase ref)**
>
> If your original Supabase project was deleted and a fresh one was created (for example, you now have project ref `jiusoksloniuozxrdiok`), follow the checklist below *before* running the app again:
>
> 1. **Update env vars** – set `.env.local` to the new `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, stop `npm run dev`, and restart it so Vite reloads the values.
> 2. **Run the base schema** – in Supabase SQL Editor execute `database/supabase-schema.sql`. This creates the core tables that the UI expects.
> 3. **Apply incremental migrations** (in order):
>    - `database/add-subcategory-to-inventory.sql`
>    - `database/add-semi-expandable-category-to-inventory.sql`
>    - `database/add-entity-name-to-inventory.sql`
>    - `database/add-entity-name-fund-cluster-to-transfers.sql`
>    - `database/add-transfer-items-fields.sql`
>    - `database/add-inventory-item-id-to-transfer-items.sql`
>    - `database/add-missing-ics-fields.sql`
>    - `database/add-unique-property-number-constraint.sql`
>    - `database/update-transfer-status-to-draft-issued.sql`
>    - `database/setup-ics-generation.sql`
>    - `database/custodians-setup.sql`
>    - `database/inventory-custodian-setup.sql`
>    - `database/custodian-slips-setup-fixed.sql`
> 4. **Create helper functions/views** – run:
>    - `database/check-and-create-functions.sql`
>    - `database/create-available-items-with-property-cards-view.sql`
>    - `database/item-availability-logic.sql`
> 5. **Seed lookups (optional but recommended)** – execute `database/seed-semi-expandable-categories.sql` plus any org-specific seed scripts you rely on.
> 6. **Enable RLS again** – for every public table flagged by Studio run `ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;` and re-create the policies you previously had (see “Security Best Practices” below). Minimal set:
>    ```sql
>    ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
>    ALTER TABLE public.property_transfers ENABLE ROW LEVEL SECURITY;
>    ALTER TABLE public.transfer_items ENABLE ROW LEVEL SECURITY;
>    ALTER TABLE public.property_transactions ENABLE ROW LEVEL SECURITY;
>    ```
>    Afterwards, add policies matching your roles (admins full access, managers read/write, users read-only, etc.).
> 7. **Clean slate (optional)** – if you need an empty DB after restoring, run `database/safe-delete-transfers-inventory-property-cards.sql`.
>
> When all scripts finish without “relation does not exist” errors, reload the browser—the Inventory, Transfers, and Property Cards pages will stop failing because the required tables now exist inside `jiusoksloniuozxrdiok`.

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: Property Management System
   - **Database Password**: Choose a strong password
   - **Region**: Select closest to your users
5. Click "Create new project"
6. Wait for the project to be ready (2-3 minutes)

### 2. Get Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://your-project.supabase.co`)
   - **Anon public key** (starts with `eyJ...`)

### 3. Set Up Environment Variables

Create a `.env.local` file in your project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the contents of `database/supabase-schema.sql`
3. Paste it into the SQL Editor
4. Click **Run** to execute the schema

### 6. Configure Authentication

1. Go to **Authentication** → **Settings**
2. Configure your site URL (e.g., `http://localhost:5173` for development)
3. Set up email templates if needed
4. Configure OAuth providers if desired

### 7. Set Up Row Level Security (RLS)

The schema includes basic RLS policies, but you may want to customize them:

1. Go to **Authentication** → **Policies**
2. Review and modify policies based on your security requirements
3. Consider implementing role-based access control

## Database Schema Features

### Core Tables
- **user_profiles** - Extended user information
- **departments** - Organizational departments
- **suppliers** - External suppliers
- **fund_sources** - Funding sources
- **locations** - Physical locations

### Property Management
- **inventory_items** - Main property inventory
- **property_cards** - Semi-expandable property cards
- **property_transfers** - Property transfer records
- **custodian_slips** - Custodian assignment records

### Reports
- **physical_counts** - Physical inventory counts
- **loss_reports** - Property loss reports
- **unserviceable_reports** - Unserviceable property reports

### Audit
- **audit_logs** - Complete audit trail

## Usage Examples

### Using Supabase Service

```typescript
import { supabaseService } from './services/supabaseService';

// Get all inventory items
const inventory = await supabaseService.inventory.getAll({
  page: 1,
  limit: 50,
  category: 'Equipment'
});

// Create new inventory item
const newItem = await supabaseService.inventory.create({
  property_number: 'SB-2024-001',
  description: 'Desktop Computer',
  // ... other fields
});
```

### Using Custom Hooks

```typescript
import { useSupabaseInventory } from './hooks/useSupabaseInventory';

function InventoryComponent() {
  const { 
    inventory, 
    loading, 
    error, 
    createItem, 
    updateItem, 
    deleteItem 
  } = useSupabaseInventory();

  // Component logic here
}
```

### Real-time Subscriptions

```typescript
import { supabase } from './lib/supabase';

// Subscribe to inventory changes
const subscription = supabase
  .channel('inventory_changes')
  .on('postgres_changes', 
    { 
      event: '*', 
      schema: 'public', 
      table: 'inventory_items' 
    }, 
    (payload) => {
      console.log('Inventory changed:', payload);
      // Update your UI
    }
  )
  .subscribe();

// Don't forget to unsubscribe
subscription.unsubscribe();
```

## Authentication Integration

### User Management

```typescript
import { supabase } from './lib/supabase';

// Sign up new user
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    data: {
      full_name: 'John Doe',
      role: 'user'
    }
  }
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// Sign out
await supabase.auth.signOut();
```

### Protected Routes

```typescript
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

function ProtectedComponent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please sign in</div>;

  return <div>Welcome, {user.email}!</div>;
}
```

## File Storage

### Upload Attachments

```typescript
import { supabase } from './lib/supabase';

// Upload file
const { data, error } = await supabase.storage
  .from('attachments')
  .upload('loss-report-001/document.pdf', file);

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('attachments')
  .getPublicUrl('loss-report-001/document.pdf');
```

## Performance Optimization

### Database Indexes

The schema includes optimized indexes for:
- Property numbers
- Categories and statuses
- Date ranges
- Search queries

### Query Optimization

- Use `select()` to limit returned columns
- Implement pagination with `range()`
- Use filters to reduce data transfer
- Consider materialized views for complex reports

## Security Best Practices

### Row Level Security

1. **Enable RLS** on all tables
2. **Create policies** based on user roles
3. **Test policies** thoroughly
4. **Regular audits** of access patterns

### API Security

1. **Validate inputs** on the client side
2. **Use TypeScript** for type safety
3. **Implement rate limiting** for API calls
4. **Monitor usage** and suspicious activity

## Monitoring and Analytics

### Supabase Dashboard

- **Database** - Query performance and logs
- **Authentication** - User activity and security
- **Storage** - File usage and costs
- **Edge Functions** - Serverless function metrics

### Custom Analytics

```typescript
// Track user actions
const trackAction = async (action: string, data: any) => {
  await supabase
    .from('user_actions')
    .insert({
      user_id: user.id,
      action,
      data,
      timestamp: new Date().toISOString()
    });
};
```

## Troubleshooting

### Common Issues

1. **RLS Policy Errors**
   - Check policy conditions
   - Verify user authentication
   - Test with different user roles

2. **Connection Issues**
   - Verify environment variables
   - Check network connectivity
   - Review Supabase status page

3. **Performance Issues**
   - Check query execution plans
   - Optimize database indexes
   - Consider query caching

### Debug Mode

```typescript
// Enable debug logging
const supabase = createClient(url, key, {
  auth: {
    debug: true
  }
});
```

## Production Deployment

### Environment Setup

1. **Production Supabase Project**
2. **Custom Domain** (optional)
3. **SSL Certificates**
4. **CDN Configuration**

### Security Hardening

1. **Strong Database Passwords**
2. **API Key Rotation**
3. **Network Security Groups**
4. **Regular Security Audits**

### Backup Strategy

1. **Automated Backups** (Supabase handles this)
2. **Point-in-time Recovery**
3. **Cross-region Replication**
4. **Export/Import Procedures**

## Support and Resources

- **Supabase Documentation**: [supabase.com/docs](https://supabase.com/docs)
- **Community Forum**: [github.com/supabase/supabase/discussions](https://github.com/supabase/supabase/discussions)
- **Discord Community**: [discord.supabase.com](https://discord.supabase.com)

## Migration from SQLite

If you were previously using the SQLite version:

1. **Export data** from SQLite database
2. **Transform data** to match Supabase schema
3. **Import data** using Supabase dashboard or API
4. **Update application** to use Supabase services
5. **Test thoroughly** before going live

The Supabase version provides better scalability, real-time features, and built-in authentication compared to the SQLite version.
