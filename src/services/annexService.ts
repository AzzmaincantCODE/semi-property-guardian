// Annex-compliant service for managing data flow between inventory, property cards, and custodian slips
import { supabase } from '@/lib/supabase';
import { 
  AnnexInventoryItem, 
  AnnexPropertyCard, 
  AnnexSPCEntry, 
  AnnexCustodianSlip, 
  AnnexCustodianSlipItem,
  CreateCustodianSlipRequest,
  CreatePropertyCardFromInventoryRequest 
} from '@/types/annex';

export class AnnexService {
  
  // Create a property card from an inventory item (following Annex A.1)
  async createPropertyCardFromInventory(request: CreatePropertyCardFromInventoryRequest): Promise<AnnexPropertyCard> {
    // Get the inventory item
    const { data: inventoryItem, error: inventoryError } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', request.inventoryItemId)
      .single();

    if (inventoryError || !inventoryItem) {
      throw new Error(`Inventory item not found: ${inventoryError?.message}`);
    }

    // Compute safe description fallback
    const safeDescription: string = (inventoryItem.description 
      || (inventoryItem.model ? `${inventoryItem.brand ? inventoryItem.brand + ' ' : ''}${inventoryItem.model}` : inventoryItem.brand)
      || '').trim();

    // Create the property card
    const propertyCardData: any = {
      entity_name: request.entityName,
      fund_cluster: request.fundCluster,
      semi_expendable_property: inventoryItem.description || safeDescription,
      property_number: inventoryItem.property_number,
      description: safeDescription,
      date_acquired: inventoryItem.date_acquired,
      remarks: inventoryItem.remarks
    };

    // Add inventory_item_id if the column exists (will be handled by migration)
    propertyCardData.inventory_item_id = request.inventoryItemId;

    const { data: propertyCard, error: cardError } = await supabase
      .from('property_cards')
      .insert(propertyCardData)
      .select()
      .single();

    if (cardError) {
      throw new Error(`Failed to create property card: ${cardError.message}`);
    }

    // Create initial entry if provided
    if (request.initialEntry) {
      await this.addPropertyCardEntry(propertyCard.id, {
        ...request.initialEntry,
        reference: request.initialEntry.reference?.trim() || '',
        issueItemNo: '',
        issueQty: 0,
        officeOfficer: '',
        balanceQty: request.initialEntry.receiptQty,
        amount: request.initialEntry.totalCost
      }, request.inventoryItemId);
    }

    return this.mapToAnnexPropertyCard(propertyCard);
  }

  // Create custodian slip and automatically create/update property card entries
  // Now returns an array of slips - one for each sub-category
  async createCustodianSlip(request: CreateCustodianSlipRequest): Promise<AnnexCustodianSlip | AnnexCustodianSlip[]> {
    // Let the database auto-generate the slip number using the trigger
    // The trigger will generate format: ICS-YYYY-MM-NNNN

    console.log('Creating custodian slip(s) with inventory items:', request.inventoryItemIds?.length || 0);

    // Validate that we have inventory items
    if (!request.inventoryItemIds || request.inventoryItemIds.length === 0) {
      throw new Error('No inventory items provided for the custodian slip');
    }

    // FIRST: Fetch and validate all inventory items BEFORE creating any slips
    console.log('Validating inventory items and property cards...');
    const inventoryItems: any[] = [];
    
    for (const inventoryItemId of request.inventoryItemIds) {
      // Get inventory item details
      const { data: inventoryItem, error: invError } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('id', inventoryItemId)
        .single();

      if (invError || !inventoryItem) {
        throw new Error(`Inventory item ${inventoryItemId} not found`);
      }

      // Check if item is available for assignment
      if (inventoryItem.assignment_status === 'Assigned' || inventoryItem.custodian) {
        throw new Error(`Inventory item ${inventoryItem.property_number} is already assigned to ${inventoryItem.custodian}`);
      }

      if (inventoryItem.condition !== 'Serviceable') {
        throw new Error(`Inventory item ${inventoryItem.property_number} is not serviceable (${inventoryItem.condition})`);
      }

      // Note: Property card validation is now handled by filtering available items
      // Only items with property cards should be selectable for custodian slips
      console.log(`Processing inventory item: ${inventoryItem.property_number} (${inventoryItemId})`);
      inventoryItems.push(inventoryItem);
    }

    console.log('All validations passed, grouping items by sub-category...');

    // Group inventory items by sub_category
    const itemsBySubCategory: { [key: string]: any[] } = {};
    for (const item of inventoryItems) {
      const subCategory = item.sub_category || 'Unknown';
      if (!itemsBySubCategory[subCategory]) {
        itemsBySubCategory[subCategory] = [];
      }
      itemsBySubCategory[subCategory].push(item);
    }

    console.log(`Grouped items into ${Object.keys(itemsBySubCategory).length} sub-category(ies):`, Object.keys(itemsBySubCategory));

    const createdSlips: AnnexCustodianSlip[] = [];
    const successfulSlipMetadata: Array<{
      slipId: string;
      slipItemIds: string[];
      propertyCardEntryIds: string[];
      inventoryItemIds: string[];
    }> = [];

    try {
      // Create one slip for each sub-category
      for (const subCategory of Object.keys(itemsBySubCategory)) {
        const itemsForSubCategory = itemsBySubCategory[subCategory];
        
        console.log(`Creating slip for ${subCategory} with ${itemsForSubCategory.length} item(s)`);

        // Determine sub-category prefix for ICS number
        const subCategoryPrefix = subCategory === 'Small Value Expendable' ? 'SPLV' : 'SPHV';
        
        // Generate ICS number with sub-category prefix using RPC
        const { data: generatedNumber, error: icsError } = await supabase
          .rpc('generate_ics_number', { sub_category_prefix: subCategoryPrefix });
        
        let resolvedSlipNumber = generatedNumber;
        if (icsError) {
          console.error('Error generating ICS number:', icsError);
          // Fallback to default generation
          const { data: fallbackNumber } = await supabase
            .rpc('generate_ics_number', { sub_category_prefix: null });
          console.log('Using fallback ICS number:', fallbackNumber);
          resolvedSlipNumber = fallbackNumber || null;
        }

        // Create the custodian slip (always starts as Draft)
        const slipData = {
          slip_number: resolvedSlipNumber || null, // Allow trigger to set if still null
          custodian_name: request.custodianName,
          designation: request.designation,
          office: request.office,
          date_issued: request.dateIssued,
          issued_by: request.issuedBy,
          received_by: request.receivedBy,
          slip_status: 'Draft'  // Always create as Draft status
        };

        console.log('Inserting custodian slip:', slipData);

        const { data: slip, error: slipError } = await supabase
          .from('custodian_slips')
          .insert(slipData)
          .select()
          .single();

        if (slipError) {
          console.error('Error creating custodian slip:', slipError);
          throw new Error(`Failed to create custodian slip: ${slipError.message}`);
        }

        console.log('Custodian slip created successfully:', slip.id);

        // Process each inventory item for this sub-category
        const slipItems: AnnexCustodianSlipItem[] = [];
        const createdSlipItemIds: string[] = [];
        const updatedInventoryIds: string[] = [];
        const createdPropertyCardEntryIds: string[] = [];

        try {
          for (const inventoryItem of itemsForSubCategory) {
            // Create custodian slip item with cost calculations
            const itemQuantity = inventoryItem.quantity || 1;
            const itemUnitCost = inventoryItem.unit_cost || 0;
            const itemTotalCost = itemQuantity * itemUnitCost;
            
            const slipItemDescription: string = (inventoryItem.description 
              || (inventoryItem.model ? `${inventoryItem.brand ? inventoryItem.brand + ' ' : ''}${inventoryItem.model}` : inventoryItem.brand)
              || '').trim();

            const slipItemData = {
              slip_id: slip.id,
              inventory_item_id: inventoryItem.id,
              property_number: inventoryItem.property_number,
              description: slipItemDescription,
              quantity: itemQuantity,
              unit: inventoryItem.unit_of_measure,
              unit_cost: itemUnitCost,
              total_cost: itemTotalCost,
              amount: itemTotalCost, // Same as total_cost for Annex compliance
              date_issued: request.dateIssued
              // item_number and estimated_useful_life will be auto-generated by database trigger
            };

            const { data: slipItem, error: itemError } = await supabase
              .from('custodian_slip_items')
              .insert(slipItemData)
              .select()
              .single();

            if (itemError || !slipItem) {
              console.error(`Failed to create slip item for ${inventoryItem.id}:`, itemError);
              throw new Error(`Failed to add ${inventoryItem.property_number} to the custodian slip. ${itemError?.message || ''}`.trim());
            }

            createdSlipItemIds.push(slipItem.id);

            // Fetch the property card for this inventory item
            const { data: propertyCard, error: pcError } = await supabase
              .from('property_cards')
              .select('*')
              .eq('inventory_item_id', inventoryItem.id)
              .single();

            if (pcError || !propertyCard) {
              console.warn(`Property card not found for inventory item ${inventoryItem.id}`);
              throw new Error(`Property card not found for ${inventoryItem.property_number}. Please create the property card first.`);
            }

            // If the property card has no entries yet, add an initial receipt entry first (Annex A.1)
            const { data: existingEntries } = await supabase
              .from('property_card_entries')
              .select('id')
              .eq('property_card_id', propertyCard.id)
              .limit(1);
            if (!existingEntries || existingEntries.length === 0) {
              await this.addPropertyCardEntry(propertyCard.id, {
                date: inventoryItem.date_acquired,
                reference: 'Initial Receipt',
                receiptQty: inventoryItem.quantity,
                unitCost: Number(inventoryItem.unit_cost || 0),
                totalCost: Number(inventoryItem.total_cost || ((inventoryItem.quantity || 1) * (Number(inventoryItem.unit_cost || 0)))),
                issueItemNo: '',
                issueQty: 0,
                officeOfficer: '',
                balanceQty: inventoryItem.quantity,
                amount: Number(inventoryItem.total_cost || 0),
                remarks: '',
                relatedSlipId: undefined,
                relatedTransferId: undefined
              }, inventoryItem.id);
            }

            // Add issue entry to property card for this custodian assignment
            let lastBalance = 0;
            const { data: lastEntry } = await supabase
              .from('property_card_entries')
              .select('balance_qty')
              .eq('property_card_id', propertyCard.id)
              .order('date', { ascending: false })
              .limit(1)
              .single();
            if (lastEntry && typeof lastEntry.balance_qty === 'number') {
              lastBalance = lastEntry.balance_qty;
            }
            const issueQty = inventoryItem.quantity || 1;
            const newBalance = Math.max(0, (lastBalance || 0) - issueQty);

            const propertyCardEntry = await this.addPropertyCardEntry(propertyCard.id, {
              date: request.dateIssued,
              reference: `ICS ${slip.slip_number || resolvedSlipNumber || 'PENDING'}`,
              receiptQty: 0,
              unitCost: 0,
              totalCost: 0,
              issueItemNo: inventoryItem.property_number || '',
              issueQty: issueQty,
              officeOfficer: `${request.custodianName} (${request.designation})`,
              balanceQty: newBalance,
              amount: 0,
              remarks: `Issued via ICS ${slip.slip_number || resolvedSlipNumber || 'PENDING'}`,
              relatedSlipId: slip.id,
              relatedTransferId: undefined
            }, inventoryItem.id);

            createdPropertyCardEntryIds.push(propertyCardEntry.id);

            // Update slip item with property card entry reference
            await supabase
              .from('custodian_slip_items')
              .update({ property_card_entry_id: propertyCardEntry.id })
              .eq('id', slipItem.id);

            // Update inventory assignment once everything else succeeded
            const { error: assignmentError } = await supabase
              .from('inventory_items')
              .update({
                custodian: request.custodianName,
                custodian_position: request.designation,
                assignment_status: 'Assigned',
                assigned_date: request.dateIssued,
                ics_number: slip.slip_number || resolvedSlipNumber,
                ics_date: request.dateIssued,
                updated_at: new Date().toISOString()
              })
              .eq('id', inventoryItem.id);

            if (assignmentError) {
              console.warn(`Failed to update inventory assignment for ${inventoryItem.property_number}:`, assignmentError);
              throw new Error(`Could not update inventory record for ${inventoryItem.property_number}. ${assignmentError.message}`);
            }

            updatedInventoryIds.push(inventoryItem.id);

            slipItems.push(
              this.mapToAnnexCustodianSlipItem({
                ...slipItem,
                property_card_entry_id: propertyCardEntry.id
              })
            );
          }
        } catch (itemProcessingError) {
          console.error('Encountered error while processing slip items, rolling back slip:', itemProcessingError);
          await this.rollbackCustodianSlipCreation(
            slip.id,
            createdSlipItemIds,
            createdPropertyCardEntryIds,
            updatedInventoryIds
          );
          throw itemProcessingError;
        }

        console.log(`Created ${slipItems.length} slip items for custodian slip ${slip.id}`);

        // If no items were successfully created for this slip, delete the empty slip and throw an error
        if (slipItems.length !== itemsForSubCategory.length) {
          console.error(
            `Mismatch between requested items (${itemsForSubCategory.length}) and created slip items (${slipItems.length}). Rolling back slip ${slip.id}.`
          );
          await this.rollbackCustodianSlipCreation(
            slip.id,
            createdSlipItemIds,
            createdPropertyCardEntryIds,
            updatedInventoryIds
          );
          throw new Error('Failed to add all selected items to the custodian slip. No changes were saved.');
        }

        successfulSlipMetadata.push({
          slipId: slip.id,
          slipItemIds: [...createdSlipItemIds],
          propertyCardEntryIds: [...createdPropertyCardEntryIds],
          inventoryItemIds: [...updatedInventoryIds]
        });

        createdSlips.push({
          ...this.mapToAnnexCustodianSlip(slip),
          items: slipItems
        });
      }
    } catch (categoryError) {
      console.error('Custodian slip creation failed across categories. Rolling back previous slips.', categoryError);
      for (const meta of successfulSlipMetadata.reverse()) {
        await this.rollbackCustodianSlipCreation(
          meta.slipId,
          meta.slipItemIds,
          meta.propertyCardEntryIds,
          meta.inventoryItemIds
        );
      }
      throw categoryError;
    }

    // If only one slip was created, return it as a single object (backward compatibility)
    if (createdSlips.length === 1) {
      console.log('Single slip created, returning as single object');
      return createdSlips[0];
    }

    // Multiple slips created, return array
    console.log(`${createdSlips.length} slips created (separated by sub-category)`);
    return createdSlips;
  }

  private async rollbackCustodianSlipCreation(
    slipId: string,
    slipItemIds: string[],
    propertyCardEntryIds: string[],
    inventoryItemIds: string[]
  ) {
    try {
      if (propertyCardEntryIds.length > 0) {
        await supabase
          .from('property_card_entries')
          .delete()
          .in('id', propertyCardEntryIds);
      }

      if (slipItemIds.length > 0) {
        await supabase
          .from('custodian_slip_items')
          .delete()
          .in('id', slipItemIds);
      }

      if (inventoryItemIds.length > 0) {
        await supabase
          .from('inventory_items')
          .update({
            custodian: null,
            custodian_position: null,
            assignment_status: 'Available',
            assigned_date: null,
            ics_number: null,
            ics_date: null,
            updated_at: new Date().toISOString()
          })
          .in('id', inventoryItemIds);
      }

      await supabase
        .from('custodian_slips')
        .delete()
        .eq('id', slipId);
    } catch (rollbackError) {
      console.error('Failed to fully roll back custodian slip creation:', rollbackError);
    }
  }

  // Add entry to property card
  async addPropertyCardEntry(propertyCardId: string, entry: Omit<AnnexSPCEntry, 'id' | 'propertyCardId' | 'createdAt' | 'updatedAt'>, inventoryItemId?: string): Promise<AnnexSPCEntry> {
    // Get inventory_item_id from property card if not provided
    let finalInventoryItemId = inventoryItemId;
    if (!finalInventoryItemId) {
      const { data: card } = await supabase
        .from('property_cards')
        .select('inventory_item_id')
        .eq('id', propertyCardId)
        .single();
      if (card) {
        finalInventoryItemId = card.inventory_item_id;
      }
    }

    const entryData: any = {
      property_card_id: propertyCardId,
      date: entry.date,
      reference: entry.reference,
      receipt_qty: entry.receiptQty,
      unit_cost: entry.unitCost,
      total_cost: entry.totalCost,
      issue_item_no: entry.issueItemNo,
      issue_qty: entry.issueQty,
      office_officer: entry.officeOfficer,
      balance_qty: entry.balanceQty,
      amount: entry.amount,
      remarks: entry.remarks,
      related_slip_id: entry.relatedSlipId,
      related_transfer_id: entry.relatedTransferId
    };

    // Add inventory_item_id if available
    if (finalInventoryItemId) {
      entryData.inventory_item_id = finalInventoryItemId;
    }

    const { data, error } = await supabase
      .from('property_card_entries')
      .insert(entryData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add property card entry: ${error.message}`);
    }

    return this.mapToAnnexSPCEntry(data);
  }

  // Find property card by inventory item
  async findPropertyCardByInventoryItem(inventoryItemId: string): Promise<AnnexPropertyCard | null> {
    try {
      console.log(`Searching for property card with inventory_item_id: ${inventoryItemId}`);
      const { data, error } = await supabase
        .from('property_cards')
        .select('*')
        .eq('inventory_item_id', inventoryItemId)
        .single();

      console.log(`Property card query result - data:`, data, 'error:', error);

      if (error) {
        // If the column doesn't exist, return null instead of throwing
        if (error.message.includes('column "inventory_item_id" does not exist')) {
          console.warn('inventory_item_id column not found in property_cards table. Please run the database migration.');
          return null;
        }
        console.error('Error finding property card by inventory item:', error);
        return null;
      }

      if (!data) {
        console.log('No property card found for inventory item:', inventoryItemId);
        return null;
      }

      console.log('Found property card:', data);
      return this.mapToAnnexPropertyCard(data);
    } catch (err) {
      console.error('Unexpected error finding property card:', err);
      return null;
    }
  }

  // Get property card with entries
  async getPropertyCardWithEntries(propertyCardId: string): Promise<AnnexPropertyCard | null> {
    const { data: card, error: cardError } = await supabase
      .from('property_cards')
      .select('*')
      .eq('id', propertyCardId)
      .single();

    if (cardError || !card) {
      return null;
    }

    const { data: entries, error: entriesError } = await supabase
      .from('property_card_entries')
      .select('*')
      .eq('property_card_id', propertyCardId)
      .order('date', { ascending: true });

    if (entriesError) {
      console.error('Failed to fetch property card entries:', entriesError);
      return this.mapToAnnexPropertyCard(card);
    }

    return {
      ...this.mapToAnnexPropertyCard(card),
      entries: entries.map(entry => this.mapToAnnexSPCEntry(entry))
    };
  }

  // Get custodian slip with items
  async getCustodianSlipWithItems(slipId: string): Promise<AnnexCustodianSlip | null> {
    const { data: slip, error: slipError } = await supabase
      .from('custodian_slips')
      .select('*')
      .eq('id', slipId)
      .single();

    if (slipError || !slip) {
      return null;
    }

    const { data: items, error: itemsError } = await supabase
      .from('custodian_slip_items')
      .select('*')
      .eq('slip_id', slipId)
      .order('created_at', { ascending: true });

    if (itemsError) {
      console.error('Failed to fetch custodian slip items:', itemsError);
      return this.mapToAnnexCustodianSlip(slip);
    }

    return {
      ...this.mapToAnnexCustodianSlip(slip),
      items: items.map(item => this.mapToAnnexCustodianSlipItem(item))
    };
  }

  // Mapping functions
  private mapToAnnexPropertyCard(data: any): AnnexPropertyCard {
    return {
      id: data.id,
      entityName: data.entity_name,
      fundCluster: data.fund_cluster,
      semiExpendableProperty: data.semi_expendable_property,
      propertyNumber: data.property_number,
      description: data.description,
      dateAcquired: data.date_acquired,
      remarks: data.remarks,
      inventoryItemId: data.inventory_item_id,
      entries: [], // Will be populated separately if needed
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapToAnnexSPCEntry(data: any): AnnexSPCEntry {
    return {
      id: data.id,
      propertyCardId: data.property_card_id,
      date: data.date,
      reference: data.reference,
      receiptQty: data.receipt_qty || 0,
      unitCost: data.unit_cost || 0,
      totalCost: data.total_cost || 0,
      issueItemNo: data.issue_item_no || '',
      issueQty: data.issue_qty || 0,
      officeOfficer: data.office_officer || '',
      balanceQty: data.balance_qty || 0,
      amount: data.amount || 0,
      remarks: data.remarks,
      relatedSlipId: data.related_slip_id,
      relatedTransferId: data.related_transfer_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapToAnnexCustodianSlip(data: any): AnnexCustodianSlip {
    return {
      id: data.id,
      slipNumber: data.slip_number,
      custodianName: data.custodian_name,
      designation: data.designation,
      office: data.office,
      dateIssued: data.date_issued,
      issuedBy: data.issued_by,
      receivedBy: data.received_by,
      items: [], // Will be populated separately if needed
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapToAnnexCustodianSlipItem(data: any): AnnexCustodianSlipItem {
    return {
      id: data.id,
      slipId: data.slip_id,
      inventoryItemId: data.inventory_item_id,
      propertyNumber: data.property_number,
      description: data.description,
      quantity: data.quantity,
      unit: data.unit,
      unitCost: data.unit_cost || 0,
      totalCost: data.total_cost || 0,
      amount: data.amount || 0,
      itemNumber: data.item_number || '',
      estimatedUsefulLife: data.estimated_useful_life || '',
      dateIssued: data.date_issued,
      propertyCardEntryId: data.property_card_entry_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

export const annexService = new AnnexService();
