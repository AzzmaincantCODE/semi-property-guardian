# Setup Instructions for Property Management System

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Supabase Environment Variables

Create a `.env.local` file in the root directory with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**To get your Supabase credentials:**
1. Go to [supabase.com](https://supabase.com) and sign in
2. Create a new project or select an existing one
3. Go to **Settings** → **API**
4. Copy the **Project URL** and **Anon public key**

### 3. Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the contents of `database/supabase-schema.sql`
3. Paste it into the SQL Editor and click **Run**

### 4. Start the Application
```bash
npm run dev
```

## 🔧 Troubleshooting

### Error: "Failed to resolve import @supabase/supabase-js"
**Solution:** Run `npm install` to install the Supabase package.

### Error: "Missing Supabase environment variables"
**Solution:** Create a `.env.local` file with your Supabase credentials (see step 2 above).

### Error: "Database connection failed"
**Solution:** 
1. Verify your Supabase credentials are correct
2. Make sure the database schema has been set up
3. Check that your Supabase project is active

### Error: "Table doesn't exist"
**Solution:** Run the database schema setup (see step 3 above).

## 📁 File Structure

```
src/
├── lib/
│   └── supabase.ts          # Supabase client configuration
├── services/
│   ├── supabaseService.ts   # Main service layer
│   └── propertyCardService.ts # Property card operations
├── hooks/
│   ├── useSupabaseInventory.ts
│   └── useSupabasePropertyCards.ts
└── pages/
    ├── Inventory.tsx        # Updated with database integration
    └── PropertyCards.tsx    # Updated with database integration
```

## 🎯 Features

- ✅ **Real-time database integration** with Supabase
- ✅ **No mock data** - all inputs are automatically saved
- ✅ **Live updates** across all components
- ✅ **Error handling** and loading states
- ✅ **Search and filtering** capabilities
- ✅ **CRUD operations** for all entities

## 🔄 Next Steps

1. **Set up your Supabase project** and get credentials
2. **Create the `.env.local` file** with your credentials
3. **Run the database schema** in Supabase
4. **Start the application** and begin adding real data

The application will now automatically save all user inputs to your Supabase database!
