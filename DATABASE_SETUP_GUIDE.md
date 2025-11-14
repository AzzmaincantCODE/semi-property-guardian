# Database Setup Guide

## 🚨 **The 400 Bad Request Error**

The error occurs because the `safe_delete_inventory_item` function doesn't exist in your database yet. You need to run the database setup scripts first.

## 🚀 **Quick Setup Steps**

### **Step 1: Run Function Creation Script**
```sql
-- Copy and paste the entire content of:
-- database/check-and-create-functions.sql
-- Into your Supabase SQL Editor
-- Click "Run"
```

### **Step 2: Verify Functions Created**
The script will show:
- ✅ **Function status** - whether functions exist
- ✅ **Functions created** - confirmation of creation
- ✅ **Available functions** - list of created functions

### **Step 3: Test Inventory Deletion**
1. **Try deleting an inventory item** in the frontend
2. **Should work without errors** now
3. **Related data will be cleaned up** automatically

## 📋 **What the Script Does**

### **Creates Required Functions:**
- ✅ **`safe_delete_inventory_item`** - Safely deletes items and related data
- ✅ **`can_delete_inventory_item`** - Checks if item can be deleted
- ✅ **`prevent_inventory_item_deletion`** - Prevents direct deletion

### **Creates Protection Triggers:**
- ✅ **Prevents direct deletion** of items with references
- ✅ **Forces use of safe deletion** function
- ✅ **Provides clear error messages**

## 🔧 **Alternative: Run All Setup Scripts**

If you want to set up everything at once:

### **1. Hybrid Estimated Life:**
```sql
-- Run: database/hybrid-estimated-life-clean.sql
```

### **2. Custodian Assignment Fix:**
```sql
-- Run: database/fix-custodian-assignment-duplication.sql
```

### **3. Deletion Policies:**
```sql
-- Run: database/custodian-slip-deletion-policy.sql
-- Run: database/inventory-deletion-policy.sql
```

### **4. Development Cleanup:**
```sql
-- Run: database/quick-dev-cleanup.sql (if you have duplicate data)
```

## 🎯 **Expected Results**

### **After Running Scripts:**
- ✅ **No more 400 errors** when deleting inventory items
- ✅ **Safe deletion** handles foreign key constraints
- ✅ **Clear error messages** when deletion fails
- ✅ **Automatic cleanup** of related data

### **Frontend Behavior:**
- ✅ **Delete button works** for inventory items
- ✅ **Related data cleaned up** automatically
- ✅ **Clear error messages** if deletion fails
- ✅ **No more 409 conflicts**

## 🚨 **Troubleshooting**

### **If you still get 400 errors:**
1. **Check the script ran successfully** - look for "Functions created successfully"
2. **Verify functions exist** - check the "Available functions" output
3. **Try refreshing the page** - sometimes cache needs to be cleared

### **If you get permission errors:**
1. **Check your Supabase permissions** - you need to be able to create functions
2. **Run scripts in order** - some functions depend on others
3. **Check RLS policies** - make sure they allow the operations

## 💡 **Pro Tips**

### **For Development:**
- **Run cleanup scripts** to remove mock data with duplicates
- **Use safe deletion** for testing different scenarios
- **Check function status** before testing deletion

### **For Production:**
- **Run all setup scripts** before going live
- **Test deletion functionality** thoroughly
- **Verify data integrity** after deletions

**Once you run the database setup script, inventory deletion will work perfectly!** 🎉
