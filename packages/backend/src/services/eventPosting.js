const mongoose = require('mongoose');
const {
  Event,
  InventoryItem,
  InventoryMovement,
  SiteInventory,
  Account,
  LedgerEntry,
} = require('../models');

/**
 * EventPostingService - Handles auto-posting of events to inventory and ledger
 *
 * When an event is created/updated, this service:
 * 1. Creates inventory movements for any items used/received
 * 2. Updates site inventory balances
 * 3. Creates balanced ledger entries
 */
class EventPostingService {
  /**
   * Post an event to inventory and ledger
   * @param {Object} event - The event document
   * @param {String} userId - The user performing the action
   * @returns {Object} - { inventoryMovements, ledgerEntries }
   */
  async postEvent(event, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const result = {
        inventoryMovements: [],
        ledgerEntries: [],
      };

      // 1. Process inventory used (deductions)
      if (event.inventoryUsed && event.inventoryUsed.length > 0) {
        const movements = await this.processInventoryUsed(event, userId, session);
        result.inventoryMovements.push(...movements);
      }

      // 2. Process inventory received (additions)
      if (event.inventoryReceived && event.inventoryReceived.length > 0) {
        const movements = await this.processInventoryReceived(event, userId, session);
        result.inventoryMovements.push(...movements);
      }

      // 3. Create ledger entries based on event type
      const entries = await this.createLedgerEntries(event, userId, session);
      result.ledgerEntries.push(...entries);

      // 4. Update event with posting info
      event.inventoryMovements = result.inventoryMovements.map((m) => m._id);
      event.ledgerEntries = result.ledgerEntries.map((e) => e._id);
      event.posted = true;
      event.postedAt = new Date();
      await event.save({ session });

      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Process inventory deductions (items used)
   */
  async processInventoryUsed(event, userId, session) {
    const movements = [];

    for (const item of event.inventoryUsed) {
      // Create movement record
      const movement = await InventoryMovement.create(
        [
          {
            tenantId: event.tenantId,
            siteId: event.siteId,
            itemId: item.itemId,
            itemName: item.itemName,
            movementType: 'out',
            quantity: item.quantity,
            unit: item.unit,
            unitCost: item.unitCost,
            totalCost: item.totalCost,
            eventId: event._id,
            eventType: event.type,
            movementDate: event.eventDate,
            createdBy: userId,
          },
        ],
        { session }
      );
      movements.push(movement[0]);

      // Update site inventory
      await this.updateSiteInventory(
        event.tenantId,
        event.siteId,
        item.itemId,
        -item.quantity,
        'out',
        session
      );

      // Update total quantity on item
      await InventoryItem.findByIdAndUpdate(
        item.itemId,
        { $inc: { totalQuantity: -item.quantity } },
        { session }
      );
    }

    return movements;
  }

  /**
   * Process inventory additions (items received)
   */
  async processInventoryReceived(event, userId, session) {
    const movements = [];

    for (const item of event.inventoryReceived) {
      // Create movement record
      const movement = await InventoryMovement.create(
        [
          {
            tenantId: event.tenantId,
            siteId: event.siteId,
            itemId: item.itemId,
            itemName: item.itemName,
            movementType: 'in',
            quantity: item.quantity,
            unit: item.unit,
            unitCost: item.unitCost,
            totalCost: item.totalCost,
            eventId: event._id,
            eventType: event.type,
            movementDate: event.eventDate,
            createdBy: userId,
          },
        ],
        { session }
      );
      movements.push(movement[0]);

      // Update site inventory
      await this.updateSiteInventory(
        event.tenantId,
        event.siteId,
        item.itemId,
        item.quantity,
        'in',
        session
      );

      // Update total quantity and last purchase price on item
      await InventoryItem.findByIdAndUpdate(
        item.itemId,
        {
          $inc: { totalQuantity: item.quantity },
          $set: { lastPurchasePrice: item.unitCost },
        },
        { session }
      );
    }

    return movements;
  }

  /**
   * Update site inventory levels
   */
  async updateSiteInventory(tenantId, siteId, itemId, quantityChange, movementType, session) {
    const siteInventory = await SiteInventory.findOneAndUpdate(
      { tenantId, siteId, itemId },
      {
        $inc: { quantity: quantityChange },
        $set: {
          lastMovementDate: new Date(),
          lastMovementType: movementType,
        },
      },
      { session, upsert: true, new: true }
    );

    // Check reorder point
    const item = await InventoryItem.findById(itemId).session(session);
    const reorderPoint = siteInventory.reorderPoint || item?.reorderPoint || 0;

    if (siteInventory.quantity <= reorderPoint && reorderPoint > 0) {
      siteInventory.isBelowReorderPoint = true;
      await siteInventory.save({ session });
    } else if (siteInventory.isBelowReorderPoint) {
      siteInventory.isBelowReorderPoint = false;
      await siteInventory.save({ session });
    }

    return siteInventory;
  }

  /**
   * Create ledger entries for the event
   */
  async createLedgerEntries(event, userId, session) {
    const entries = [];
    const journalId = new mongoose.Types.ObjectId();
    const entryDate = event.eventDate;
    const fiscalYear = entryDate.getFullYear();
    const fiscalPeriod = entryDate.getMonth() + 1;

    // Get accounts for this tenant
    const accounts = await Account.find({ tenantId: event.tenantId }).session(session);
    const getAccount = (subtype) => accounts.find((a) => a.subtype === subtype);

    switch (event.type) {
      case 'feeding':
      case 'treatment': {
        // Expense the cost of items used
        // DR: Feed/Medical Expense
        // CR: Inventory
        const totalCost = event.totalCost || 0;
        if (totalCost > 0) {
          const expenseAccount =
            event.type === 'feeding'
              ? getAccount('feed_expense')
              : getAccount('medical_expense');
          const inventoryAccount = getAccount('inventory');

          if (expenseAccount && inventoryAccount) {
            entries.push(
              await this.createEntry(
                {
                  tenantId: event.tenantId,
                  siteId: event.siteId,
                  journalId,
                  entryDate,
                  accountId: expenseAccount._id,
                  accountCode: expenseAccount.code,
                  accountName: expenseAccount.name,
                  debit: totalCost,
                  credit: 0,
                  description: `${event.type}: ${event.description}`,
                  eventId: event._id,
                  eventType: event.type,
                  fiscalYear,
                  fiscalPeriod,
                  createdBy: userId,
                },
                session
              )
            );

            entries.push(
              await this.createEntry(
                {
                  tenantId: event.tenantId,
                  siteId: event.siteId,
                  journalId,
                  entryDate,
                  accountId: inventoryAccount._id,
                  accountCode: inventoryAccount.code,
                  accountName: inventoryAccount.name,
                  debit: 0,
                  credit: totalCost,
                  description: `${event.type}: ${event.description}`,
                  eventId: event._id,
                  eventType: event.type,
                  fiscalYear,
                  fiscalPeriod,
                  createdBy: userId,
                },
                session
              )
            );
          }
        }
        break;
      }

      case 'purchase': {
        // Record purchase of inventory
        // DR: Inventory
        // CR: Cash or Accounts Payable
        const totalCost = event.totalCost || 0;
        if (totalCost > 0) {
          const inventoryAccount = getAccount('inventory');
          const cashAccount = getAccount('cash') || getAccount('bank');

          if (inventoryAccount && cashAccount) {
            entries.push(
              await this.createEntry(
                {
                  tenantId: event.tenantId,
                  siteId: event.siteId,
                  journalId,
                  entryDate,
                  accountId: inventoryAccount._id,
                  accountCode: inventoryAccount.code,
                  accountName: inventoryAccount.name,
                  debit: totalCost,
                  credit: 0,
                  description: `Purchase: ${event.description}`,
                  eventId: event._id,
                  eventType: event.type,
                  reference: event.vendor?.invoiceNumber,
                  fiscalYear,
                  fiscalPeriod,
                  createdBy: userId,
                },
                session
              )
            );

            entries.push(
              await this.createEntry(
                {
                  tenantId: event.tenantId,
                  siteId: event.siteId,
                  journalId,
                  entryDate,
                  accountId: cashAccount._id,
                  accountCode: cashAccount.code,
                  accountName: cashAccount.name,
                  debit: 0,
                  credit: totalCost,
                  description: `Purchase: ${event.description}`,
                  eventId: event._id,
                  eventType: event.type,
                  reference: event.vendor?.invoiceNumber,
                  fiscalYear,
                  fiscalPeriod,
                  createdBy: userId,
                },
                session
              )
            );
          }
        }
        break;
      }

      case 'sale': {
        // Record sale
        // DR: Cash or Accounts Receivable
        // CR: Sales Revenue
        const totalRevenue = event.totalRevenue || 0;
        if (totalRevenue > 0) {
          const cashAccount = getAccount('cash') || getAccount('bank');
          const salesAccount = getAccount('sales');

          if (cashAccount && salesAccount) {
            entries.push(
              await this.createEntry(
                {
                  tenantId: event.tenantId,
                  siteId: event.siteId,
                  journalId,
                  entryDate,
                  accountId: cashAccount._id,
                  accountCode: cashAccount.code,
                  accountName: cashAccount.name,
                  debit: totalRevenue,
                  credit: 0,
                  description: `Sale: ${event.description}`,
                  eventId: event._id,
                  eventType: event.type,
                  fiscalYear,
                  fiscalPeriod,
                  createdBy: userId,
                },
                session
              )
            );

            entries.push(
              await this.createEntry(
                {
                  tenantId: event.tenantId,
                  siteId: event.siteId,
                  journalId,
                  entryDate,
                  accountId: salesAccount._id,
                  accountCode: salesAccount.code,
                  accountName: salesAccount.name,
                  debit: 0,
                  credit: totalRevenue,
                  description: `Sale: ${event.description}`,
                  eventId: event._id,
                  eventType: event.type,
                  fiscalYear,
                  fiscalPeriod,
                  createdBy: userId,
                },
                session
              )
            );
          }
        }
        break;
      }

      case 'labor': {
        // Record labor expense
        // DR: Labor Expense
        // CR: Cash or Wages Payable
        const totalCost = event.labor?.hours * event.labor?.rate || event.totalCost || 0;
        if (totalCost > 0) {
          const laborAccount = getAccount('labor_expense');
          const cashAccount = getAccount('cash') || getAccount('bank');

          if (laborAccount && cashAccount) {
            entries.push(
              await this.createEntry(
                {
                  tenantId: event.tenantId,
                  siteId: event.siteId,
                  journalId,
                  entryDate,
                  accountId: laborAccount._id,
                  accountCode: laborAccount.code,
                  accountName: laborAccount.name,
                  debit: totalCost,
                  credit: 0,
                  description: `Labor: ${event.description}`,
                  eventId: event._id,
                  eventType: event.type,
                  fiscalYear,
                  fiscalPeriod,
                  createdBy: userId,
                },
                session
              )
            );

            entries.push(
              await this.createEntry(
                {
                  tenantId: event.tenantId,
                  siteId: event.siteId,
                  journalId,
                  entryDate,
                  accountId: cashAccount._id,
                  accountCode: cashAccount.code,
                  accountName: cashAccount.name,
                  debit: 0,
                  credit: totalCost,
                  description: `Labor: ${event.description}`,
                  eventId: event._id,
                  eventType: event.type,
                  fiscalYear,
                  fiscalPeriod,
                  createdBy: userId,
                },
                session
              )
            );
          }
        }
        break;
      }

      case 'maintenance': {
        // Record maintenance expense
        // DR: Repair Expense
        // CR: Cash
        const totalCost = event.totalCost || 0;
        if (totalCost > 0) {
          const repairAccount = getAccount('repair_expense');
          const cashAccount = getAccount('cash') || getAccount('bank');

          if (repairAccount && cashAccount) {
            entries.push(
              await this.createEntry(
                {
                  tenantId: event.tenantId,
                  siteId: event.siteId,
                  journalId,
                  entryDate,
                  accountId: repairAccount._id,
                  accountCode: repairAccount.code,
                  accountName: repairAccount.name,
                  debit: totalCost,
                  credit: 0,
                  description: `Maintenance: ${event.description}`,
                  eventId: event._id,
                  eventType: event.type,
                  fiscalYear,
                  fiscalPeriod,
                  createdBy: userId,
                },
                session
              )
            );

            entries.push(
              await this.createEntry(
                {
                  tenantId: event.tenantId,
                  siteId: event.siteId,
                  journalId,
                  entryDate,
                  accountId: cashAccount._id,
                  accountCode: cashAccount.code,
                  accountName: cashAccount.name,
                  debit: 0,
                  credit: totalCost,
                  description: `Maintenance: ${event.description}`,
                  eventId: event._id,
                  eventType: event.type,
                  fiscalYear,
                  fiscalPeriod,
                  createdBy: userId,
                },
                session
              )
            );
          }
        }
        break;
      }

      // Other event types (breeding, birth, death, harvest, custom)
      // may not have direct financial impact or are handled differently
      default:
        break;
    }

    // Update account balances
    for (const entry of entries) {
      await Account.findByIdAndUpdate(
        entry.accountId,
        {
          $inc: { currentBalance: entry.debit - entry.credit },
        },
        { session }
      );
    }

    return entries;
  }

  /**
   * Helper to create a ledger entry
   */
  async createEntry(data, session) {
    const entry = await LedgerEntry.create([data], { session });
    return entry[0];
  }

  /**
   * Reverse/void an event's postings
   */
  async reverseEvent(event, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Reverse inventory movements
      for (const movementId of event.inventoryMovements || []) {
        const movement = await InventoryMovement.findById(movementId).session(session);
        if (movement) {
          const reverseQuantity =
            movement.movementType === 'in' ? -movement.quantity : movement.quantity;
          await this.updateSiteInventory(
            movement.tenantId,
            movement.siteId,
            movement.itemId,
            reverseQuantity,
            'adjustment',
            session
          );

          await InventoryItem.findByIdAndUpdate(
            movement.itemId,
            { $inc: { totalQuantity: reverseQuantity } },
            { session }
          );
        }
      }

      // Reverse ledger entries
      for (const entryId of event.ledgerEntries || []) {
        const entry = await LedgerEntry.findById(entryId).session(session);
        if (entry) {
          // Reverse the account balance
          await Account.findByIdAndUpdate(
            entry.accountId,
            {
              $inc: { currentBalance: entry.credit - entry.debit },
            },
            { session }
          );

          // Mark entry as voided
          entry.status = 'voided';
          await entry.save({ session });
        }
      }

      // Update event
      event.posted = false;
      event.status = 'cancelled';
      await event.save({ session });

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

module.exports = new EventPostingService();
