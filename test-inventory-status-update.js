// Test script to verify inventory status updates when custodian slips are created
// Run this in the browser console on the application

console.log('🧪 Testing Inventory Status Updates...');

// Test 1: Check if inventory items show assignment status
async function testInventoryAssignmentStatus() {
  console.log('\n📋 Test 1: Checking inventory assignment status fields');
  
  try {
    // This would be run in the browser console
    const response = await fetch('/api/inventory-items');
    const items = await response.json();
    
    console.log(`Found ${items.length} inventory items`);
    
    // Check if items have assignment status fields
    const sampleItem = items[0];
    if (sampleItem) {
      console.log('Sample item fields:', {
        propertyNumber: sampleItem.propertyNumber,
        custodian: sampleItem.custodian,
        custodianPosition: sampleItem.custodianPosition,
        assignmentStatus: sampleItem.assignmentStatus,
        assignedDate: sampleItem.assignedDate
      });
      
      const hasAssignmentFields = sampleItem.custodian !== undefined && 
                                 sampleItem.assignmentStatus !== undefined;
      
      console.log(hasAssignmentFields ? '✅ Assignment fields present' : '❌ Assignment fields missing');
    }
  } catch (error) {
    console.log('❌ Error testing inventory assignment status:', error);
  }
}

// Test 2: Check if available items filter works
async function testAvailableItemsFilter() {
  console.log('\n📋 Test 2: Checking available items filter');
  
  try {
    const response = await fetch('/api/inventory-items?filter=available');
    const availableItems = await response.json();
    
    console.log(`Found ${availableItems.length} available items`);
    
    // Check if all items are actually available
    const allAvailable = availableItems.every(item => 
      item.assignmentStatus === 'Available' && 
      item.condition === 'Serviceable' && 
      item.status === 'Active'
    );
    
    console.log(allAvailable ? '✅ All items are properly available' : '❌ Some items may not be available');
    
    // Show sample available items
    console.log('Sample available items:', availableItems.slice(0, 3).map(item => ({
      propertyNumber: item.propertyNumber,
      assignmentStatus: item.assignmentStatus,
      condition: item.condition
    })));
    
  } catch (error) {
    console.log('❌ Error testing available items filter:', error);
  }
}

// Test 3: Check if issued items filter works
async function testIssuedItemsFilter() {
  console.log('\n📋 Test 3: Checking issued items filter');
  
  try {
    const response = await fetch('/api/inventory-items?filter=issued');
    const issuedItems = await response.json();
    
    console.log(`Found ${issuedItems.length} issued items`);
    
    // Check if all items are actually issued
    const allIssued = issuedItems.every(item => 
      item.assignmentStatus === 'Assigned' && 
      item.custodian && 
      item.custodian !== ''
    );
    
    console.log(allIssued ? '✅ All items are properly issued' : '❌ Some items may not be issued');
    
    // Show sample issued items
    console.log('Sample issued items:', issuedItems.slice(0, 3).map(item => ({
      propertyNumber: item.propertyNumber,
      assignmentStatus: item.assignmentStatus,
      custodian: item.custodian
    })));
    
  } catch (error) {
    console.log('❌ Error testing issued items filter:', error);
  }
}

// Test 4: Check custodian service
async function testCustodianService() {
  console.log('\n📋 Test 4: Checking custodian service');
  
  try {
    const response = await fetch('/api/custodians');
    const custodians = await response.json();
    
    console.log(`Found ${custodians.length} custodians`);
    
    if (custodians.length > 0) {
      const sampleCustodian = custodians[0];
      console.log('Sample custodian:', {
        name: sampleCustodian.name,
        custodian_no: sampleCustodian.custodian_no,
        department_name: sampleCustodian.department_name
      });
      
      // Test getting custodian summary
      const summaryResponse = await fetch(`/api/custodians/${sampleCustodian.id}/summary`);
      const summary = await summaryResponse.json();
      
      console.log('Custodian summary:', {
        currently_assigned_items: summary.currently_assigned_items,
        currently_assigned_value: summary.currently_assigned_value,
        total_items_assigned: summary.total_items_assigned
      });
      
      console.log('✅ Custodian service working');
    }
    
  } catch (error) {
    console.log('❌ Error testing custodian service:', error);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting inventory status update tests...\n');
  
  await testInventoryAssignmentStatus();
  await testAvailableItemsFilter();
  await testIssuedItemsFilter();
  await testCustodianService();
  
  console.log('\n✅ All tests completed!');
  console.log('\n📝 Manual Test Instructions:');
  console.log('1. Go to Inventory tab and check if items show assignment status');
  console.log('2. Create a custodian slip with some items');
  console.log('3. Check if those items now show as "Assigned" in inventory');
  console.log('4. Go to Custodians tab and verify items appear under the custodian');
  console.log('5. Check if items no longer appear in "Available" filter');
}

// Export for manual testing
window.testInventoryStatus = runAllTests;

console.log('Test functions loaded. Run testInventoryStatus() to start testing.');
