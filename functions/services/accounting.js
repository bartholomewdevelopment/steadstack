const crypto = require('crypto');
const mongoose = require('mongoose');
const { Account, LedgerTransaction, LedgerEntry } = require('../models');
const firestoreService = require('./firestore');

/**
 * Accounting Service
 * Handles Chart of Accounts seeding and posting engine logic
 */

// ============================================
// CHART OF ACCOUNTS SEEDING
// ============================================

/**
 * Default Chart of Accounts for a new tenant
 * Minimal but correct set for farm/ranch operations
 */
const DEFAULT_COA = [
  // Assets
  { code: '1000', name: 'Cash', type: 'ASSET', subtype: 'CASH', normalBalance: 'DEBIT' },
  { code: '1100', name: 'Accounts Receivable', type: 'ASSET', subtype: 'AR', normalBalance: 'DEBIT' },
  { code: '1200', name: 'Feed Inventory', type: 'ASSET', subtype: 'INVENTORY', normalBalance: 'DEBIT' },
  { code: '1300', name: 'Supply Inventory', type: 'ASSET', subtype: 'INVENTORY', normalBalance: 'DEBIT' },
  { code: '1400', name: 'Livestock - Market', type: 'ASSET', subtype: 'LIVESTOCK', normalBalance: 'DEBIT' },
  { code: '1500', name: 'Equipment', type: 'ASSET', subtype: 'EQUIPMENT', normalBalance: 'DEBIT' },

  // Liabilities
  { code: '2000', name: 'Accounts Payable', type: 'LIABILITY', subtype: 'AP', normalBalance: 'CREDIT' },
  { code: '2100', name: 'Notes Payable', type: 'LIABILITY', subtype: 'LOAN', normalBalance: 'CREDIT' },

  // Equity
  { code: '3000', name: "Owner's Equity", type: 'EQUITY', subtype: 'OWNER_EQUITY', normalBalance: 'CREDIT' },
  { code: '3100', name: 'Retained Earnings', type: 'EQUITY', subtype: 'RETAINED_EARNINGS', normalBalance: 'CREDIT' },

  // Income
  { code: '4000', name: 'Sales Revenue', type: 'INCOME', subtype: 'SALES', normalBalance: 'CREDIT' },
  { code: '4100', name: 'Service Income', type: 'INCOME', subtype: 'SERVICE_INCOME', normalBalance: 'CREDIT' },

  // Cost of Goods Sold
  { code: '5000', name: 'Cost of Goods Sold', type: 'COGS', normalBalance: 'DEBIT' },

  // Expenses
  { code: '6000', name: 'Feed Expense', type: 'EXPENSE', subtype: 'FEED', normalBalance: 'DEBIT' },
  { code: '6100', name: 'Supplies Expense', type: 'EXPENSE', subtype: 'OTHER', normalBalance: 'DEBIT' },
  { code: '6200', name: 'Inventory Adjustment', type: 'EXPENSE', subtype: 'OTHER', normalBalance: 'DEBIT' },
  { code: '6300', name: 'Medical Expense', type: 'EXPENSE', subtype: 'MEDICAL', normalBalance: 'DEBIT' },
  { code: '6400', name: 'Labor Expense', type: 'EXPENSE', subtype: 'LABOR', normalBalance: 'DEBIT' },
  { code: '6500', name: 'Fuel Expense', type: 'EXPENSE', subtype: 'FUEL', normalBalance: 'DEBIT' },
  { code: '6600', name: 'Repairs & Maintenance', type: 'EXPENSE', subtype: 'REPAIRS', normalBalance: 'DEBIT' },
  { code: '6700', name: 'Utilities', type: 'EXPENSE', subtype: 'UTILITIES', normalBalance: 'DEBIT' },
  { code: '6800', name: 'Insurance', type: 'EXPENSE', subtype: 'INSURANCE', normalBalance: 'DEBIT' },
  { code: '6900', name: 'Depreciation', type: 'EXPENSE', subtype: 'DEPRECIATION', normalBalance: 'DEBIT' },
];

/**
 * Seed Chart of Accounts for a new tenant
 * @param {string} tenantId - Firestore tenant ID
 */
const seedChartOfAccounts = async (tenantId) => {
  // Check if accounts already exist for this tenant
  const existingCount = await Account.countDocuments({ tenantId });
  if (existingCount > 0) {
    console.log(`CoA already exists for tenant ${tenantId}, skipping seed`);
    return;
  }

  const accounts = DEFAULT_COA.map((acc) => ({
    ...acc,
    tenantId,
    isSystem: true,
    isActive: true,
  }));

  await Account.insertMany(accounts);
  console.log(`Seeded ${accounts.length} accounts for tenant ${tenantId}`);
};

/**
 * Get account by code for a tenant
 */
const getAccountByCode = async (tenantId, code) => {
  return Account.findOne({ tenantId, code, isActive: true });
};

/**
 * Get all accounts for a tenant
 */
const getAccounts = async (tenantId) => {
  return Account.find({ tenantId, isActive: true }).sort({ code: 1 });
};

// ============================================
// IDEMPOTENCY
// ============================================

/**
 * Generate idempotency key for a posting
 * @param {string} tenantId
 * @param {string} eventId
 * @param {object} payload - Stable payload for hashing
 * @param {number} version - Posting profile version
 */
const generateIdempotencyKey = (tenantId, eventId, payload, version = 1) => {
  const stablePayload = JSON.stringify(payload, Object.keys(payload).sort());
  const data = `${tenantId}:${eventId}:${version}:${stablePayload}`;
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Check if a transaction with this idempotency key already exists
 */
const findExistingTransaction = async (tenantId, idempotencyKey) => {
  return LedgerTransaction.findOne({ tenantId, idempotencyKey });
};

// ============================================
// POSTING ENGINE
// ============================================

/**
 * Process an event and create ledger entries
 * This is the core posting engine function
 *
 * @param {string} tenantId - Firestore tenant ID
 * @param {string} eventId - Firestore event ID
 * @param {string} lockerId - Unique ID of the posting process (for concurrency)
 */
const processEvent = async (tenantId, eventId, lockerId = 'posting-engine') => {
  // 1. Acquire lock on the event (PENDING -> PROCESSING)
  const event = await firestoreService.acquireEventLock(tenantId, eventId, lockerId);

  if (!event) {
    // Event is already processed or being processed
    const existingEvent = await firestoreService.getEvent(tenantId, eventId);
    if (existingEvent?.status === 'POSTED') {
      return {
        success: true,
        alreadyPosted: true,
        event: existingEvent,
      };
    }
    throw new Error('Event is locked or in invalid state');
  }

  try {
    // 2. Generate idempotency key
    const idempotencyKey = generateIdempotencyKey(
      tenantId,
      eventId,
      event.payload,
      1
    );

    // 3. Check for existing transaction (idempotency check)
    const existingTxn = await findExistingTransaction(tenantId, idempotencyKey);
    if (existingTxn) {
      // Already posted - update event status and return
      await firestoreService.markEventPosted(tenantId, eventId, {
        ledgerTransactionId: existingTxn._id.toString(),
        inventoryMovementIds: [],
      });

      return {
        success: true,
        alreadyPosted: true,
        transactionId: existingTxn._id,
      };
    }

    // 4. Compute GL lines based on event type
    const glLines = await computeGLLines(tenantId, event);

    if (!glLines || glLines.length === 0) {
      throw new Error(`No GL lines computed for event type: ${event.type}`);
    }

    // 5. Validate balancing
    const totalDebits = glLines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredits = glLines.reduce((sum, line) => sum + (line.credit || 0), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.001) {
      throw new Error(
        `Transaction does not balance: debits=${totalDebits}, credits=${totalCredits}`
      );
    }

    // 6. Create transaction and entries in MongoDB
    const session = await mongoose.startSession();
    let transaction;
    let entries;

    try {
      await session.withTransaction(async () => {
        // Create transaction header
        transaction = await LedgerTransaction.create(
          [
            {
              tenantId,
              siteId: event.siteId,
              eventId,
              occurredAt: event.occurredAt?.toDate?.() || new Date(event.occurredAt),
              postedAt: new Date(),
              status: 'POSTED',
              memo: `${event.type} event`,
              idempotencyKey,
            },
          ],
          { session }
        );
        transaction = transaction[0];

        // Create entry lines
        const entryDocs = glLines.map((line) => ({
          tenantId,
          transactionId: transaction._id,
          siteId: event.siteId,
          occurredAt: event.occurredAt?.toDate?.() || new Date(event.occurredAt),
          accountId: line.accountId,
          debit: line.debit || 0,
          credit: line.credit || 0,
          entityType: line.entityType,
          entityId: line.entityId,
        }));

        entries = await LedgerEntry.insertMany(entryDocs, { session });
      });
    } finally {
      session.endSession();
    }

    // 7. Process inventory movements (if applicable)
    const inventoryMovementIds = await processInventoryMovements(
      tenantId,
      event,
      transaction._id.toString(),
      lockerId
    );

    // 8. Update Firestore event as POSTED
    await firestoreService.markEventPosted(tenantId, eventId, {
      ledgerTransactionId: transaction._id.toString(),
      inventoryMovementIds,
    });

    return {
      success: true,
      transactionId: transaction._id,
      entriesCount: entries.length,
      inventoryMovementIds,
    };
  } catch (error) {
    // Mark event as FAILED
    await firestoreService.markEventFailed(tenantId, eventId, error.message);
    throw error;
  }
};

/**
 * Process inventory movements for an event
 * Updates site balances and records movements in Firestore
 */
const processInventoryMovements = async (tenantId, event, transactionId, createdBy) => {
  const { type, payload, siteId } = event;
  const movementIds = [];

  // Map event types to inventory operations
  switch (type) {
    case 'INVENTORY_ADJUSTMENT': {
      const { itemId, qtyDelta, costPerUnit } = payload;
      if (!itemId || !siteId) break;

      const movementType = qtyDelta > 0
        ? firestoreService.MovementType.ADJUSTMENT_IN
        : firestoreService.MovementType.ADJUSTMENT_OUT;

      // Update balance
      await firestoreService.updateSiteInventoryBalance(
        tenantId,
        siteId,
        itemId,
        qtyDelta,
        costPerUnit || 0,
        movementType
      );

      // Record movement
      const movement = await firestoreService.recordInventoryMovement(
        tenantId,
        {
          siteId,
          itemId,
          type: movementType,
          qty: qtyDelta,
          costPerUnit: costPerUnit || 0,
          totalCost: Math.abs(qtyDelta * (costPerUnit || 0)),
          reason: payload.reason || 'Inventory adjustment',
          eventId: event.id,
          transactionId,
        },
        createdBy
      );
      movementIds.push(movement.id);

      // Check reorder trigger for decreases
      if (qtyDelta < 0) {
        await checkAndTriggerReorder(tenantId, siteId, itemId, createdBy);
      }
      break;
    }

    case 'FEED_LIVESTOCK': {
      const { feedItemId, qty, costPerUnit, livestockGroupId, totalCost } = payload;
      if (!feedItemId || !siteId) break;

      const feedCost = totalCost || Math.abs(qty * (costPerUnit || 0));

      // Update feed inventory balance (decrease)
      await firestoreService.updateSiteInventoryBalance(
        tenantId,
        siteId,
        feedItemId,
        -Math.abs(qty),
        costPerUnit || 0,
        firestoreService.MovementType.CONSUMPTION
      );

      // Record movement
      const movement = await firestoreService.recordInventoryMovement(
        tenantId,
        {
          siteId,
          itemId: feedItemId,
          type: firestoreService.MovementType.CONSUMPTION,
          qty: -Math.abs(qty),
          costPerUnit: costPerUnit || 0,
          totalCost: feedCost,
          reason: `Fed to livestock group ${livestockGroupId || 'unknown'}`,
          eventId: event.id,
          transactionId,
        },
        createdBy
      );
      movementIds.push(movement.id);

      // If CAPITALIZE mode and group specified, update group cost basis
      const tenant = await firestoreService.getTenant(tenantId);
      if (tenant?.settings?.livestockCostingMode === 'CAPITALIZE' && livestockGroupId) {
        await firestoreService.updateGroupCostBasis(tenantId, livestockGroupId, feedCost);
      }

      // Check reorder trigger
      await checkAndTriggerReorder(tenantId, siteId, feedItemId, createdBy);
      break;
    }

    case 'SELL_LIVESTOCK': {
      // No inventory movements, but may need to update group cost basis
      const { livestockGroupId, costAmount } = payload;
      if (livestockGroupId && costAmount) {
        // Reduce group cost basis by the cost of goods sold
        await firestoreService.updateGroupCostBasis(tenantId, livestockGroupId, -Math.abs(costAmount));
      }
      break;
    }

    case 'PURCHASE_LIVESTOCK': {
      // Update group cost basis for purchased livestock
      const { livestockGroupId, totalCost: purchaseCost } = payload;
      if (livestockGroupId && purchaseCost) {
        await firestoreService.updateGroupCostBasis(tenantId, livestockGroupId, Math.abs(purchaseCost));
      }
      break;
    }

    case 'RECEIVE_PURCHASE_ORDER': {
      const { items, destinationSiteId } = payload;
      const targetSiteId = destinationSiteId || siteId;
      if (!items?.length || !targetSiteId) break;

      for (const item of items) {
        const { itemId, qty, costPerUnit } = item;
        if (!itemId) continue;

        // Update balance (increase)
        await firestoreService.updateSiteInventoryBalance(
          tenantId,
          targetSiteId,
          itemId,
          Math.abs(qty),
          costPerUnit || 0,
          firestoreService.MovementType.RECEIPT
        );

        // Record movement
        const movement = await firestoreService.recordInventoryMovement(
          tenantId,
          {
            siteId: targetSiteId,
            itemId,
            type: firestoreService.MovementType.RECEIPT,
            qty: Math.abs(qty),
            costPerUnit: costPerUnit || 0,
            totalCost: Math.abs(qty * (costPerUnit || 0)),
            reason: payload.poNumber ? `PO ${payload.poNumber}` : 'Purchase receipt',
            eventId: event.id,
            transactionId,
          },
          createdBy
        );
        movementIds.push(movement.id);
      }
      break;
    }

    case 'INVENTORY_TRANSFER': {
      const { itemId, qty, costPerUnit, fromSiteId, toSiteId } = payload;
      if (!itemId || !fromSiteId || !toSiteId) break;

      // Decrease at source
      await firestoreService.updateSiteInventoryBalance(
        tenantId,
        fromSiteId,
        itemId,
        -Math.abs(qty),
        costPerUnit || 0,
        firestoreService.MovementType.TRANSFER_OUT
      );

      // Record outbound movement
      const outMovement = await firestoreService.recordInventoryMovement(
        tenantId,
        {
          siteId: fromSiteId,
          itemId,
          type: firestoreService.MovementType.TRANSFER_OUT,
          qty: -Math.abs(qty),
          costPerUnit: costPerUnit || 0,
          totalCost: Math.abs(qty * (costPerUnit || 0)),
          reason: `Transfer to site`,
          relatedSiteId: toSiteId,
          eventId: event.id,
          transactionId,
        },
        createdBy
      );
      movementIds.push(outMovement.id);

      // Increase at destination
      await firestoreService.updateSiteInventoryBalance(
        tenantId,
        toSiteId,
        itemId,
        Math.abs(qty),
        costPerUnit || 0,
        firestoreService.MovementType.TRANSFER_IN
      );

      // Record inbound movement
      const inMovement = await firestoreService.recordInventoryMovement(
        tenantId,
        {
          siteId: toSiteId,
          itemId,
          type: firestoreService.MovementType.TRANSFER_IN,
          qty: Math.abs(qty),
          costPerUnit: costPerUnit || 0,
          totalCost: Math.abs(qty * (costPerUnit || 0)),
          reason: `Transfer from site`,
          relatedSiteId: fromSiteId,
          eventId: event.id,
          transactionId,
        },
        createdBy
      );
      movementIds.push(inMovement.id);

      // Check reorder trigger at source
      await checkAndTriggerReorder(tenantId, fromSiteId, itemId, createdBy);
      break;
    }

    default:
      // No inventory operations for this event type
      break;
  }

  return movementIds;
};

/**
 * Check if reorder is needed and create requisition if so
 */
const checkAndTriggerReorder = async (tenantId, siteId, itemId, createdBy) => {
  try {
    // Check tenant settings
    const tenant = await firestoreService.getTenant(tenantId);
    if (!tenant?.settings?.autoReorderEnabled) {
      return null;
    }

    const reorderCheck = await firestoreService.checkReorderNeeded(tenantId, siteId, itemId);

    if (reorderCheck?.needsReorder) {
      const requisition = await firestoreService.createPurchaseRequisition(
        tenantId,
        {
          siteId,
          itemId,
          qty: reorderCheck.suggestedQty,
          estimatedCost: reorderCheck.suggestedQty * (reorderCheck.item.defaultCostPerUnit || 0),
          vendor: reorderCheck.item.preferredVendor,
          reason: `Auto-reorder: balance (${reorderCheck.currentQty}) below reorder point (${reorderCheck.reorderPoint})`,
          autoGenerated: true,
          triggerBalance: reorderCheck.currentQty,
        },
        createdBy
      );

      console.log(`Auto-reorder requisition created: ${requisition.id} for item ${itemId}`);
      return requisition;
    }
  } catch (error) {
    console.error('Reorder check failed:', error);
    // Don't fail the main operation if reorder check fails
  }

  return null;
};

/**
 * Compute GL lines based on event type and payload
 * This is where the event-specific posting logic lives
 */
const computeGLLines = async (tenantId, event) => {
  const { type, payload } = event;

  switch (type) {
    case 'INVENTORY_ADJUSTMENT':
      return computeInventoryAdjustmentLines(tenantId, payload);

    case 'FEED_LIVESTOCK':
      return computeFeedLivestockLines(tenantId, payload, event.siteId);

    case 'RECEIVE_PURCHASE_ORDER':
      return computeReceivePOLines(tenantId, payload);

    case 'SALE':
      return computeSaleLines(tenantId, payload);

    case 'INVENTORY_TRANSFER':
      // Transfers between sites have no GL impact (same inventory account)
      // Return balanced zero entries for audit trail
      return computeTransferLines(tenantId, payload);

    case 'SELL_LIVESTOCK':
      return computeSellLivestockLines(tenantId, payload);

    case 'PURCHASE_LIVESTOCK':
      return computePurchaseLivestockLines(tenantId, payload);

    default:
      throw new Error(`Unknown event type: ${type}`);
  }
};

/**
 * Compute GL lines for INVENTORY_ADJUSTMENT event
 */
const computeInventoryAdjustmentLines = async (tenantId, payload) => {
  const { itemType, qtyDelta, totalCost } = payload;

  // Get the appropriate inventory and adjustment accounts
  const inventoryAccount = await getAccountByCode(
    tenantId,
    itemType === 'FEED' ? '1200' : '1300'
  );
  const adjustmentAccount = await getAccountByCode(tenantId, '6200');

  if (!inventoryAccount || !adjustmentAccount) {
    throw new Error('Required accounts not found for inventory adjustment');
  }

  const cost = Math.abs(totalCost || 0);

  if (qtyDelta > 0) {
    // Inventory increase (gain)
    return [
      { accountId: inventoryAccount._id, debit: cost, credit: 0 },
      { accountId: adjustmentAccount._id, debit: 0, credit: cost },
    ];
  } else {
    // Inventory decrease (loss)
    return [
      { accountId: adjustmentAccount._id, debit: cost, credit: 0 },
      { accountId: inventoryAccount._id, debit: 0, credit: cost },
    ];
  }
};

/**
 * Compute GL lines for FEED_LIVESTOCK event
 * Respects tenant's livestockCostingMode setting
 */
const computeFeedLivestockLines = async (tenantId, payload, _siteId) => {
  const { feedItemId, totalCost, livestockGroupId } = payload;

  // Get tenant settings from Firestore
  const tenant = await firestoreService.getTenant(tenantId);
  const costingMode = tenant?.settings?.livestockCostingMode || 'EXPENSE';

  const feedInventoryAccount = await getAccountByCode(tenantId, '1200');

  let debitAccount;
  if (costingMode === 'CAPITALIZE') {
    // Capitalize to livestock asset
    debitAccount = await getAccountByCode(tenantId, '1400');
  } else {
    // Expense mode
    debitAccount = await getAccountByCode(tenantId, '6000');
  }

  if (!feedInventoryAccount || !debitAccount) {
    throw new Error('Required accounts not found for feed livestock');
  }

  const cost = Math.abs(totalCost || 0);

  return [
    {
      accountId: debitAccount._id,
      debit: cost,
      credit: 0,
      entityType: 'ANIMAL_GROUP',
      entityId: livestockGroupId,
    },
    {
      accountId: feedInventoryAccount._id,
      debit: 0,
      credit: cost,
      entityType: 'INVENTORY_ITEM',
      entityId: feedItemId,
    },
  ];
};

/**
 * Compute GL lines for RECEIVE_PURCHASE_ORDER event
 */
const computeReceivePOLines = async (tenantId, payload) => {
  const { itemType, totalCost, paymentMethod } = payload;

  const inventoryAccount = await getAccountByCode(
    tenantId,
    itemType === 'FEED' ? '1200' : '1300'
  );

  let creditAccount;
  if (paymentMethod === 'CASH') {
    creditAccount = await getAccountByCode(tenantId, '1000');
  } else {
    creditAccount = await getAccountByCode(tenantId, '2000'); // A/P
  }

  if (!inventoryAccount || !creditAccount) {
    throw new Error('Required accounts not found for receive PO');
  }

  const cost = Math.abs(totalCost || 0);

  return [
    { accountId: inventoryAccount._id, debit: cost, credit: 0 },
    { accountId: creditAccount._id, debit: 0, credit: cost },
  ];
};

/**
 * Compute GL lines for SALE event
 */
const computeSaleLines = async (tenantId, payload) => {
  const { saleAmount, costAmount, paymentMethod } = payload;

  const salesAccount = await getAccountByCode(tenantId, '4000');
  const cogsAccount = await getAccountByCode(tenantId, '5000');
  const livestockAccount = await getAccountByCode(tenantId, '1400');

  let debitAccount;
  if (paymentMethod === 'CASH') {
    debitAccount = await getAccountByCode(tenantId, '1000');
  } else {
    debitAccount = await getAccountByCode(tenantId, '1100'); // A/R
  }

  if (!salesAccount || !debitAccount) {
    throw new Error('Required accounts not found for sale');
  }

  const lines = [
    // Record the sale
    { accountId: debitAccount._id, debit: saleAmount, credit: 0 },
    { accountId: salesAccount._id, debit: 0, credit: saleAmount },
  ];

  // If we have cost info, record COGS
  if (costAmount && cogsAccount && livestockAccount) {
    lines.push(
      { accountId: cogsAccount._id, debit: costAmount, credit: 0 },
      { accountId: livestockAccount._id, debit: 0, credit: costAmount }
    );
  }

  return lines;
};

/**
 * Compute GL lines for INVENTORY_TRANSFER event
 * Transfers between sites don't change GL (same inventory account)
 * Returns minimal balanced entries for audit trail
 */
const computeTransferLines = async (tenantId, payload) => {
  const { itemType, totalCost } = payload;

  // Get the appropriate inventory account
  const inventoryAccount = await getAccountByCode(
    tenantId,
    itemType === 'FEED' ? '1200' : '1300'
  );

  if (!inventoryAccount) {
    throw new Error('Required account not found for transfer');
  }

  const cost = Math.abs(totalCost || 0);

  // Balanced zero-impact entries (debit and credit same account)
  // This creates an audit trail without changing balances
  return [
    { accountId: inventoryAccount._id, debit: cost, credit: 0, memo: 'Transfer out' },
    { accountId: inventoryAccount._id, debit: 0, credit: cost, memo: 'Transfer in' },
  ];
};

/**
 * Compute GL lines for SELL_LIVESTOCK event
 * Records sale revenue and optionally COGS for livestock sales
 */
const computeSellLivestockLines = async (tenantId, payload) => {
  const { saleAmount, costAmount, paymentMethod, livestockGroupId } = payload;

  const salesAccount = await getAccountByCode(tenantId, '4000');
  const cogsAccount = await getAccountByCode(tenantId, '5000');
  const livestockAccount = await getAccountByCode(tenantId, '1400');

  let debitAccount;
  if (paymentMethod === 'CASH') {
    debitAccount = await getAccountByCode(tenantId, '1000');
  } else {
    debitAccount = await getAccountByCode(tenantId, '1100'); // A/R
  }

  if (!salesAccount || !debitAccount) {
    throw new Error('Required accounts not found for livestock sale');
  }

  const lines = [
    // Record the sale
    {
      accountId: debitAccount._id,
      debit: saleAmount,
      credit: 0,
      entityType: 'ANIMAL_GROUP',
      entityId: livestockGroupId,
    },
    {
      accountId: salesAccount._id,
      debit: 0,
      credit: saleAmount,
      entityType: 'ANIMAL_GROUP',
      entityId: livestockGroupId,
    },
  ];

  // Record COGS if we have cost info and livestock account
  if (costAmount && cogsAccount && livestockAccount) {
    lines.push(
      {
        accountId: cogsAccount._id,
        debit: costAmount,
        credit: 0,
        entityType: 'ANIMAL_GROUP',
        entityId: livestockGroupId,
      },
      {
        accountId: livestockAccount._id,
        debit: 0,
        credit: costAmount,
        entityType: 'ANIMAL_GROUP',
        entityId: livestockGroupId,
      }
    );
  }

  return lines;
};

/**
 * Compute GL lines for PURCHASE_LIVESTOCK event
 * Records purchase of livestock (capitalizes to livestock asset account)
 */
const computePurchaseLivestockLines = async (tenantId, payload) => {
  const { totalCost, paymentMethod, livestockGroupId } = payload;

  const livestockAccount = await getAccountByCode(tenantId, '1400');

  let creditAccount;
  if (paymentMethod === 'CASH') {
    creditAccount = await getAccountByCode(tenantId, '1000');
  } else {
    creditAccount = await getAccountByCode(tenantId, '2000'); // A/P
  }

  if (!livestockAccount || !creditAccount) {
    throw new Error('Required accounts not found for livestock purchase');
  }

  const cost = Math.abs(totalCost || 0);

  return [
    {
      accountId: livestockAccount._id,
      debit: cost,
      credit: 0,
      entityType: 'ANIMAL_GROUP',
      entityId: livestockGroupId,
    },
    {
      accountId: creditAccount._id,
      debit: 0,
      credit: cost,
      entityType: 'ANIMAL_GROUP',
      entityId: livestockGroupId,
    },
  ];
};

/**
 * Create a reversal transaction for an existing transaction
 */
const reverseTransaction = async (tenantId, transactionId, reason) => {
  const originalTxn = await LedgerTransaction.findById(transactionId);
  if (!originalTxn || originalTxn.tenantId !== tenantId) {
    throw new Error('Transaction not found');
  }

  if (originalTxn.status === 'REVERSED') {
    throw new Error('Transaction already reversed');
  }

  const originalEntries = await LedgerEntry.find({ transactionId });

  const session = await mongoose.startSession();
  let reversalTxn;

  try {
    await session.withTransaction(async () => {
      // Create reversal transaction
      reversalTxn = await LedgerTransaction.create(
        [
          {
            tenantId,
            siteId: originalTxn.siteId,
            eventId: `reversal-${originalTxn.eventId}`,
            occurredAt: new Date(),
            postedAt: new Date(),
            status: 'POSTED',
            memo: `Reversal: ${reason}`,
            idempotencyKey: `reversal-${transactionId}-${Date.now()}`,
            reversesTransactionId: originalTxn._id,
          },
        ],
        { session }
      );
      reversalTxn = reversalTxn[0];

      // Create reversed entries (swap debit/credit)
      const reversalEntries = originalEntries.map((entry) => ({
        tenantId,
        transactionId: reversalTxn._id,
        siteId: entry.siteId,
        occurredAt: new Date(),
        accountId: entry.accountId,
        debit: entry.credit, // Swap
        credit: entry.debit, // Swap
        entityType: entry.entityType,
        entityId: entry.entityId,
      }));

      await LedgerEntry.insertMany(reversalEntries, { session });

      // Mark original as reversed
      await LedgerTransaction.findByIdAndUpdate(
        transactionId,
        {
          status: 'REVERSED',
          reversedByTransactionId: reversalTxn._id,
        },
        { session }
      );
    });
  } finally {
    session.endSession();
  }

  return reversalTxn;
};

module.exports = {
  // CoA
  seedChartOfAccounts,
  getAccountByCode,
  getAccounts,
  DEFAULT_COA,

  // Idempotency
  generateIdempotencyKey,
  findExistingTransaction,

  // Posting
  processEvent,
  computeGLLines,
  reverseTransaction,

  // Inventory
  processInventoryMovements,
  checkAndTriggerReorder,
};
