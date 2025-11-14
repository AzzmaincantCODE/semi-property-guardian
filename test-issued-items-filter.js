// Test script to debug issued items filter
// Run this in the browser console to check what's happening

console.log('🔍 Testing Issued Items Filter...');

// Test 1: Check what items have assignment_status = 'Assigned'
async function testAssignedItems() {
  console.log('\n📋 Test 1: Checking items with assignment_status = "Assigned"');
  
  try {
    const response = await fetch('/api/inventory-items');
    const allItems = await response.json();
    
    const assignedItems = allItems.filter(item => item.assignmentStatus === 'Assigned');
    const itemsWithCustodian = allItems.filter(item => item.custodian && item.custodian !== '');
    
    console.log(`Total items: ${allItems.length}`);
    console.log(`Items with assignment_status = "Assigned": ${assignedItems.length}`);
    console.log(`Items with custodian: ${itemsWithCustodian.length}`);
    
    if (assignedItems.length > 0) {
      console.log('Sample assigned items:', assignedItems.slice(0, 3).map(item => ({
        propertyNumber: item.propertyNumber,
        assignmentStatus: item.assignmentStatus,
        custodian: item.custodian
      })));
    }
    
    if (itemsWithCustodian.length > 0) {
      console.log('Sample items with custodian:', itemsWithCustodian.slice(0, 3).map(item => ({
        propertyNumber: item.propertyNumber,
        assignmentStatus: item.assignmentStatus,
        custodian: item.custodian
      })));
    }
    
  } catch (error) {
    console.log('❌ Error testing assigned items:', error);
  }
}

// Test 2: Check the issued filter directly
async function testIssuedFilter() {
  console.log('\n📋 Test 2: Testing issued filter directly');
  
  try {
    const response = await fetch('/api/inventory-items?filter=issued');
    const issuedItems = await response.json();
    
    console.log(`Issued items count: ${issuedItems.length}`);
    
    if (issuedItems.length > 0) {
      console.log('Sample issued items:', issuedItems.slice(0, 3).map(item => ({
        propertyNumber: item.propertyNumber,
        assignmentStatus: item.assignmentStatus,
        custodian: item.custodian,
        condition: item.condition,
        status: item.status
      })));
    } else {
      console.log('❌ No issued items found - this is the problem!');
    }
    
  } catch (error) {
    console.log('❌ Error testing issued filter:', error);
  }
}

// Test 3: Check database directly (if possible)
async function testDatabaseDirectly() {
  console.log('\n📋 Test 3: Checking database assignment_status values');
  
  try {
    // This would need to be run in Supabase SQL Editor
    console.log('Run this SQL in Supabase SQL Editor:');
    console.log(`
SELECT 
  property_number,
  assignment_status,
  custodian,
  condition,
  status
FROM inventory_items 
WHERE status = 'Active' AND condition = 'Serviceable'
ORDER BY created_at DESC;
    `);
    
  } catch (error) {
    console.log('❌ Error:', error);
  }
}

// Run all tests
async function runIssuedItemsTests() {
  console.log('🚀 Starting issued items filter tests...\n');
  
  await testAssignedItems();
  await testIssuedFilter();
  await testDatabaseDirectly();
  
  console.log('\n✅ Tests completed!');
  console.log('\n📝 Next Steps:');
  console.log('1. Check browser console for the debug logs');
  console.log('2. If no assigned items found, check if custodian slips are properly updating assignment_status');
  console.log('3. If assigned items exist but filter returns none, the query logic needs adjustment');
}

// Export for manual testing
window.testIssuedItems = runIssuedItemsTests;

console.log('Test functions loaded. Run testIssuedItems() to start testing.');
