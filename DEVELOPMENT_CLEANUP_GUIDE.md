# Development Cleanup Guide

## 🚨 **The Duplicate Assignment Problem**

You're right - during development, you need to be able to clean up mock data without breaking database constraints. The duplicate items are causing unique key conflicts.

## 🛠️ **Two Cleanup Approaches**

### **Option 1: Quick & Complete Reset** (RECOMMENDED)
**File**: `database/quick-dev-cleanup.sql`

**What it does:**
- ✅ **Resets ALL inventory items** to available status
- ✅ **Deletes ALL custodian slips** and slip items
- ✅ **Clears property card entries** related to slips
- ✅ **Temporarily disables triggers** to avoid conflicts
- ✅ **Re-enables triggers** after cleanup

**When to use:**
- You want to start completely fresh
- You have lots of mock data to clean up
- You don't need to preserve any specific assignments

### **Option 2: Smart Cleanup** (Advanced)
**File**: `database/development-cleanup-duplicates.sql`

**What it does:**
- ✅ **Keeps the most recent assignment** for each item
- ✅ **Removes duplicate assignments** intelligently
- ✅ **Preserves some data** while cleaning duplicates
- ✅ **More complex but selective**

**When to use:**
- You want to keep some assignments
- You need selective cleanup
- You're comfortable with more complex operations

## 🚀 **Recommended Development Workflow**

### **Phase 1: Development & Testing**
```sql
-- Use this when you have duplicate/mock data issues
-- Run: database/quick-dev-cleanup.sql
```

### **Phase 2: Pre-Production**
```sql
-- Clean up all mock data
-- Run: database/quick-dev-cleanup.sql
-- Then add only real, official data
```

### **Phase 3: Production**
```sql
-- Use the deletion policy for official data
-- Run: database/custodian-slip-deletion-policy.sql
-- Only draft slips can be deleted
```

## 📋 **Step-by-Step Instructions**

### **1. Run the Quick Cleanup**
```sql
-- Copy and paste the entire content of:
-- database/quick-dev-cleanup.sql
-- Into your Supabase SQL Editor
-- Click "Run"
```

### **2. Verify the Cleanup**
The script will show you:
- ✅ **Before cleanup**: How many items were assigned
- ✅ **After cleanup**: All items should be available
- ✅ **Available items**: Count of items ready for new custodian slips

### **3. Test the System**
1. **Create a new custodian slip** with some items
2. **Verify items disappear** from available list
3. **Try to create another slip** - assigned items should be missing
4. **Delete the slip** - items should become available again

## 🔧 **What the Cleanup Does**

### **Inventory Items:**
- ✅ **Resets custodian** to NULL
- ✅ **Resets assignment_status** to 'Available'
- ✅ **Clears assigned_date**
- ✅ **Makes items available** for new assignments

### **Custodian Slips:**
- ✅ **Deletes all slip items**
- ✅ **Deletes all slips**
- ✅ **Clears property card entries** related to slips

### **Database Triggers:**
- ✅ **Temporarily disabled** during cleanup
- ✅ **Re-enabled** after cleanup
- ✅ **No constraint conflicts**

## ⚠️ **Important Notes**

### **Development Only:**
- ❌ **NEVER run this in production**
- ❌ **This deletes ALL custodian slip data**
- ❌ **This resets ALL inventory assignments**

### **Safe for Development:**
- ✅ **Perfect for cleaning mock data**
- ✅ **Resolves unique key conflicts**
- ✅ **Gives you a fresh start**
- ✅ **No data loss concerns with test data**

## 🎯 **Expected Results**

### **Before Cleanup:**
```
assignment_status | count
------------------|-------
Assigned         | 15
Available        | 5
```

### **After Cleanup:**
```
assignment_status | count
------------------|-------
Available        | 20
```

### **Available Items:**
```
Available items for new custodian slips: 20
```

## 🚀 **Next Steps After Cleanup**

1. **Test the system** with fresh data
2. **Create custodian slips** to verify no duplicates
3. **Add real data** when ready for production
4. **Use the deletion policy** for official data management

## 💡 **Pro Tips**

### **For Development:**
- Run cleanup whenever you have duplicate issues
- Use mock data freely - you can always clean it up
- Test the system thoroughly before adding real data

### **For Production:**
- Use the deletion policy instead of cleanup scripts
- Only allow deletion of draft slips
- Preserve audit trail for issued slips

**This approach gives you the flexibility to experiment during development while maintaining data integrity!** 🎉
