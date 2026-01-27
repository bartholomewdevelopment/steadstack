/**
 * P2P Posting Engine
 * Processes P2P events and creates double-entry ledger transactions
 * Also handles inventory movements
 */

const { db, admin } = require('../config/firebase-admin');
const { FieldValue } = admin.firestore;
const { P2PEventType } = require('../models/p2p-schemas');

// ============================================
// DEFAULT ACCOUNT MAPPING
// ============================================

// These would typically be configurable per tenant
const DEFAULT_ACCOUNTS = {
  ACCOUNTS_PAYABLE: 'accounts-payable',
  CASH: 'cash',
  FEED_INVENTORY: 'feed-inventory',
  SUPPLIES_INVENTORY: 'supplies-inventory',
  MEDICINE_INVENTORY: 'medicine-inventory',
  EQUIPMENT_PARTS_INVENTORY: 'equipment-parts-inventory',
  PURCHASE_PRICE_VARIANCE: 'purchase-price-variance',
  SHIPPING_EXPENSE: 'shipping-expense',
};

// Map inventory category to GL account
const getInventoryAccount = (category) => {
  const mapping = {
    FEED: DEFAULT_ACCOUNTS.FEED_INVENTORY,
    MEDICINE: DEFAULT_ACCOUNTS.MEDICINE_INVENTORY,
    SUPPLIES: DEFAULT_ACCOUNTS.SUPPLIES_INVENTORY,
    EQUIPMENT_PARTS: DEFAULT_ACCOUNTS.EQUIPMENT_PARTS_INVENTORY,
  };
  return mapping[category] || DEFAULT_ACCOUNTS.SUPPLIES_INVENTORY;
};

// ============================================
// POSTING RULES (F - Double Entry)
// ============================================

/**
 * RECEIVE_PURCHASE_ORDER (RECEIPT_POSTED)
 * When goods are received, we increase inventory and create AP liability
 *
 * Debit: Inventory (by category)
 * Credit: Accounts Payable
 *
 * Example: Receive $500 of feed
 * Dr. Feed Inventory    $500
 *   Cr. Accounts Payable  $500
 */
const buildReceiptPostingEntries = (event, accounts) => {
  const { lines, totals, vendorId } = event.payload;
  const entries = [];

  // Group lines by inventory account (category)
  const inventoryByAccount = {};

  for (const line of lines) {
    // Get the inventory account for this item's category
    // In production, you'd look up the item's category from Firestore
    const inventoryAccount = accounts.inventory || DEFAULT_ACCOUNTS.SUPPLIES_INVENTORY;

    if (!inventoryByAccount[inventoryAccount]) {
      inventoryByAccount[inventoryAccount] = 0;
    }
    inventoryByAccount[inventoryAccount] += line.totalCost;
  }

  // Create debit entries for each inventory account
  for (const [accountId, amount] of Object.entries(inventoryByAccount)) {
    entries.push({
      accountId,
      debit: amount,
      credit: 0,
      memo: `Receipt of goods - PO items`,
    });
  }

  // Create credit entry for Accounts Payable
  entries.push({
    accountId: accounts.accountsPayable || DEFAULT_ACCOUNTS.ACCOUNTS_PAYABLE,
    debit: 0,
    credit: totals.totalCost,
    memo: `Receipt of goods - Vendor liability`,
    vendorId,
  });

  return entries;
};

/**
 * BILL_VARIANCE_POSTED
 * When a vendor bill differs from the receipt total, post the variance
 *
 * If bill > receipts (we owe more):
 * Dr. Purchase Price Variance
 *   Cr. Accounts Payable
 *
 * If bill < receipts (we owe less):
 * Dr. Accounts Payable
 *   Cr. Purchase Price Variance
 */
const buildVariancePostingEntries = (event, accounts) => {
  const { varianceAmount, vendorId } = event.payload;
  const entries = [];

  if (varianceAmount > 0) {
    // Bill is higher than receipts - we owe more
    entries.push({
      accountId: accounts.purchasePriceVariance || DEFAULT_ACCOUNTS.PURCHASE_PRICE_VARIANCE,
      debit: varianceAmount,
      credit: 0,
      memo: 'Purchase price variance - bill higher than receipt',
    });
    entries.push({
      accountId: accounts.accountsPayable || DEFAULT_ACCOUNTS.ACCOUNTS_PAYABLE,
      debit: 0,
      credit: varianceAmount,
      memo: 'Purchase price variance - additional AP',
      vendorId,
    });
  } else if (varianceAmount < 0) {
    // Bill is lower than receipts - we owe less
    const absAmount = Math.abs(varianceAmount);
    entries.push({
      accountId: accounts.accountsPayable || DEFAULT_ACCOUNTS.ACCOUNTS_PAYABLE,
      debit: absAmount,
      credit: 0,
      memo: 'Purchase price variance - AP reduction',
      vendorId,
    });
    entries.push({
      accountId: accounts.purchasePriceVariance || DEFAULT_ACCOUNTS.PURCHASE_PRICE_VARIANCE,
      debit: 0,
      credit: absAmount,
      memo: 'Purchase price variance - bill lower than receipt',
    });
  }

  return entries;
};

/**
 * PAYMENT_SENT
 * When a payment is made, reduce AP and reduce Cash
 *
 * Dr. Accounts Payable
 *   Cr. Cash (or specific bank account)
 */
const buildPaymentPostingEntries = (event, accounts) => {
  const { amount, vendorId, bankAccountId, allocations } = event.payload;
  const entries = [];

  // Debit Accounts Payable (reduce liability)
  entries.push({
    accountId: accounts.accountsPayable || DEFAULT_ACCOUNTS.ACCOUNTS_PAYABLE,
    debit: amount,
    credit: 0,
    memo: `Payment to vendor`,
    vendorId,
    billIds: allocations.map(a => a.billId),
  });

  // Credit Cash/Bank (reduce asset)
  entries.push({
    accountId: bankAccountId || accounts.cash || DEFAULT_ACCOUNTS.CASH,
    debit: 0,
    credit: amount,
    memo: `Payment to vendor`,
    vendorId,
  });

  return entries;
};

// ============================================
// INVENTORY MOVEMENT CREATION
// ============================================

/**
 * Create inventory movements for a receipt
 * Increases inventory quantity and updates average cost
 *
 * IMPORTANT: Firestore transactions require all reads before writes.
 */
const createInventoryMovements = async (tenantId, event, transaction) => {
  // siteId is at event level, lines is in payload
  const siteId = event.siteId || event.payload.siteId;
  const { lines } = event.payload;

  if (!siteId) {
    throw new Error('siteId is required for inventory movements');
  }

  if (!lines || !Array.isArray(lines) || lines.length === 0) {
    throw new Error('No lines found in event payload for inventory movements');
  }

  console.log(`[P2P Posting] Processing ${lines.length} inventory movements for site ${siteId}`);

  // Step 1: validate and collect balance refs
  const balanceRefs = [];
  for (const line of lines) {
    if (!line.itemId) {
      console.error('[P2P Posting] Line missing itemId:', JSON.stringify(line));
      throw new Error('Line is missing itemId');
    }
    if (typeof line.qtyReceived !== 'number' || line.qtyReceived <= 0) {
      console.error('[P2P Posting] Line has invalid qtyReceived:', line.qtyReceived);
      throw new Error(`Line has invalid qtyReceived: ${line.qtyReceived}`);
    }

    const balanceRef = db.collection('tenants').doc(tenantId)
      .collection('sites').doc(siteId)
      .collection('inventory').doc(line.itemId);
    balanceRefs.push(balanceRef);
  }

  // Step 2: read all balances first
  const balanceDocs = await Promise.all(
    balanceRefs.map(ref => transaction.get(ref))
  );

  // Step 3: write movements and update balances
  const movements = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const balanceRef = balanceRefs[i];
    const balanceDoc = balanceDocs[i];

    console.log(`[P2P Posting] Updating inventory for item ${line.itemId}, qty: ${line.qtyReceived}`);
    const movementRef = db.collection('tenants').doc(tenantId)
      .collection('inventoryMovements').doc();

    const movement = {
      itemId: line.itemId,
      siteId,
      eventId: event.id,
      eventType: event.type,
      movementType: 'RECEIPT',
      qty: line.qtyReceived,
      unitCost: line.unitCost,
      totalCost: line.totalCost,
      lotNumber: line.lotNumber || null,
      expirationDate: line.expirationDate || null,
      storageLocation: line.storageLocation || null,
      poId: event.payload.poId,
      receiptId: event.sourceId,
      occurredAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    };

    transaction.set(movementRef, movement);
    movements.push({ id: movementRef.id, ...movement });

    if (balanceDoc.exists) {
      const currentBalance = balanceDoc.data();
      const newQty = (currentBalance.qtyOnHand || 0) + line.qtyReceived;
      const currentValue = (currentBalance.qtyOnHand || 0) * (currentBalance.avgCostPerUnit || 0);
      const newValue = currentValue + line.totalCost;
      const newAvgCost = newQty > 0 ? newValue / newQty : 0;

      transaction.update(balanceRef, {
        qtyOnHand: newQty,
        avgCostPerUnit: newAvgCost,
        totalValue: newValue,
        lastMovementAt: FieldValue.serverTimestamp(),
        lastMovementId: movementRef.id,
      });
    } else {
      transaction.set(balanceRef, {
        itemId: line.itemId,
        siteId,
        qtyOnHand: line.qtyReceived,
        avgCostPerUnit: line.unitCost,
        totalValue: line.totalCost,
        lastMovementAt: FieldValue.serverTimestamp(),
        lastMovementId: movementRef.id,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
  }

  return movements;
};

// ============================================
// MAIN POSTING ENGINE
// ============================================

/**
 * Process a single event and create ledger entries
 * This is the main entry point for the posting engine
 */
const processEvent = async (tenantId, eventId) => {
  const eventRef = db.collection('tenants').doc(tenantId).collection('events').doc(eventId);

  return db.runTransaction(async (transaction) => {
    // 1. Get and lock the event
    const eventDoc = await transaction.get(eventRef);
    if (!eventDoc.exists) {
      throw new Error('Event not found');
    }

    const event = { id: eventDoc.id, ...eventDoc.data() };

    // Check if already processed
    if (event.status !== 'PENDING') {
      if (event.status === 'POSTED') {
        // Already posted - return existing results (idempotent)
        return {
          success: true,
          alreadyPosted: true,
          postingResults: event.postingResults,
        };
      }
      throw new Error(`Cannot process event in status: ${event.status}`);
    }

    // 2. Mark as processing
    transaction.update(eventRef, {
      status: 'PROCESSING',
      processingStartedAt: FieldValue.serverTimestamp(),
    });

    // 3. Check idempotency (would typically check MongoDB here)
    // For MVP, we rely on Firestore transaction + status check

    // 4. Build posting entries based on event type
    let entries = [];
    let inventoryMovementIds = [];

    // Get tenant's account mapping (would be from tenant settings in production)
    const accounts = DEFAULT_ACCOUNTS;

    switch (event.type) {
      case P2PEventType.RECEIPT_POSTED:
        entries = buildReceiptPostingEntries(event, accounts);
        // Create inventory movements
        const movements = await createInventoryMovements(tenantId, event, transaction);
        inventoryMovementIds = movements.map(m => m.id);
        break;

      case P2PEventType.BILL_VARIANCE_POSTED:
        entries = buildVariancePostingEntries(event, accounts);
        break;

      case P2PEventType.PAYMENT_SENT:
        entries = buildPaymentPostingEntries(event, accounts);
        break;

      default:
        // Non-posting event types (REQUISITION_*, PO_*, BILL_CREATED, etc.)
        // Just mark as posted with no ledger entries
        transaction.update(eventRef, {
          status: 'POSTED',
          postingResults: {
            ledgerTransactionId: null,
            inventoryMovementIds: [],
            entriesCount: 0,
            message: 'Non-posting event logged',
          },
          postedAt: FieldValue.serverTimestamp(),
        });

        return {
          success: true,
          nonPostingEvent: true,
          eventType: event.type,
        };
    }

    // 5. Validate entries are balanced
    const totalDebits = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
    const totalCredits = entries.reduce((sum, e) => sum + (e.credit || 0), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error(`Unbalanced transaction: debits=${totalDebits}, credits=${totalCredits}`);
    }

    // 6. Create ledger transaction in Firestore (would be MongoDB in production)
    const ledgerTxRef = db.collection('tenants').doc(tenantId)
      .collection('ledgerTransactions').doc();

    const ledgerTransaction = {
      eventId: event.id,
      eventType: event.type,
      siteId: event.siteId,
      occurredAt: event.occurredAt || FieldValue.serverTimestamp(),
      idempotencyKey: event.idempotencyKey,
      totalAmount: totalDebits,
      entriesCount: entries.length,
      status: 'POSTED',
      createdAt: FieldValue.serverTimestamp(),
    };

    transaction.set(ledgerTxRef, ledgerTransaction);

    // 7. Create ledger entries
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const entryRef = db.collection('tenants').doc(tenantId)
        .collection('ledgerEntries').doc();

      transaction.set(entryRef, {
        transactionId: ledgerTxRef.id,
        eventId: event.id,
        lineNumber: i + 1,
        accountId: entry.accountId,
        debit: entry.debit || 0,
        credit: entry.credit || 0,
        memo: entry.memo || '',
        vendorId: entry.vendorId || null,
        billIds: entry.billIds || null,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    // 8. Update event as posted
    const postingResults = {
      ledgerTransactionId: ledgerTxRef.id,
      inventoryMovementIds,
      entriesCount: entries.length,
      totalDebits,
      totalCredits,
    };

    transaction.update(eventRef, {
      status: 'POSTED',
      postingResults,
      postedAt: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      eventId: event.id,
      eventType: event.type,
      postingResults,
    };
  });
};

/**
 * Process all pending events for a tenant
 * Used for batch processing or recovery
 */
const processPendingEvents = async (tenantId, limit = 100) => {
  const eventsSnapshot = await db.collection('tenants').doc(tenantId)
    .collection('events')
    .where('status', '==', 'PENDING')
    .orderBy('createdAt', 'asc')
    .limit(limit)
    .get();

  const results = [];

  for (const doc of eventsSnapshot.docs) {
    try {
      const result = await processEvent(tenantId, doc.id);
      results.push({ eventId: doc.id, ...result });
    } catch (error) {
      // Mark event as failed
      await db.collection('tenants').doc(tenantId)
        .collection('events').doc(doc.id)
        .update({
          status: 'FAILED',
          error: error.message,
          failedAt: FieldValue.serverTimestamp(),
        });

      results.push({
        eventId: doc.id,
        success: false,
        error: error.message,
      });
    }
  }

  return results;
};

/**
 * Reverse a posted event
 * Creates a new reversing event with opposite entries
 */
const reverseEvent = async (tenantId, eventId, userId, reason) => {
  const eventRef = db.collection('tenants').doc(tenantId).collection('events').doc(eventId);

  return db.runTransaction(async (transaction) => {
    const eventDoc = await transaction.get(eventRef);
    if (!eventDoc.exists) {
      throw new Error('Event not found');
    }

    const originalEvent = { id: eventDoc.id, ...eventDoc.data() };

    if (originalEvent.status !== 'POSTED') {
      throw new Error('Can only reverse POSTED events');
    }

    if (originalEvent.reversedByEventId) {
      throw new Error('Event has already been reversed');
    }

    // Get original ledger entries
    const entriesSnapshot = await db.collection('tenants').doc(tenantId)
      .collection('ledgerEntries')
      .where('eventId', '==', eventId)
      .get();

    // Create reversal event
    const reversalEventRef = db.collection('tenants').doc(tenantId).collection('events').doc();

    const reversalEvent = {
      type: `${originalEvent.type}_REVERSAL`,
      occurredAt: FieldValue.serverTimestamp(),
      sourceType: 'eventReversal',
      sourceId: eventId,
      siteId: originalEvent.siteId,
      payload: {
        originalEventId: eventId,
        originalEventType: originalEvent.type,
        reason,
      },
      status: 'PENDING',
      idempotencyKey: `reversal-${eventId}`,
      postingResults: null,
      error: null,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: userId,
    };

    transaction.set(reversalEventRef, reversalEvent);

    // Mark original event as reversed
    transaction.update(eventRef, {
      status: 'REVERSED',
      reversedByEventId: reversalEventRef.id,
      reversedAt: FieldValue.serverTimestamp(),
      reversedBy: userId,
      reversalReason: reason,
    });

    // Create reversal ledger transaction
    const reversalTxRef = db.collection('tenants').doc(tenantId)
      .collection('ledgerTransactions').doc();

    const totalAmount = entriesSnapshot.docs.reduce((sum, doc) => {
      return sum + (doc.data().debit || 0);
    }, 0);

    transaction.set(reversalTxRef, {
      eventId: reversalEventRef.id,
      eventType: `${originalEvent.type}_REVERSAL`,
      siteId: originalEvent.siteId,
      occurredAt: FieldValue.serverTimestamp(),
      idempotencyKey: `reversal-${eventId}`,
      totalAmount,
      entriesCount: entriesSnapshot.docs.length,
      status: 'POSTED',
      reversesTransactionId: originalEvent.postingResults?.ledgerTransactionId,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Create reversed entries (swap debits and credits)
    for (let i = 0; i < entriesSnapshot.docs.length; i++) {
      const originalEntry = entriesSnapshot.docs[i].data();
      const reversalEntryRef = db.collection('tenants').doc(tenantId)
        .collection('ledgerEntries').doc();

      transaction.set(reversalEntryRef, {
        transactionId: reversalTxRef.id,
        eventId: reversalEventRef.id,
        lineNumber: i + 1,
        accountId: originalEntry.accountId,
        debit: originalEntry.credit, // Swap
        credit: originalEntry.debit, // Swap
        memo: `Reversal: ${originalEntry.memo}`,
        vendorId: originalEntry.vendorId || null,
        reversesEntryId: entriesSnapshot.docs[i].id,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    // Reverse inventory movements if applicable
    if (originalEvent.postingResults?.inventoryMovementIds?.length) {
      for (const movementId of originalEvent.postingResults.inventoryMovementIds) {
        const movementRef = db.collection('tenants').doc(tenantId)
          .collection('inventoryMovements').doc(movementId);

        const movementDoc = await transaction.get(movementRef);
        if (movementDoc.exists) {
          const movement = movementDoc.data();

          // Create reversal movement
          const reversalMovementRef = db.collection('tenants').doc(tenantId)
            .collection('inventoryMovements').doc();

          transaction.set(reversalMovementRef, {
            ...movement,
            qty: -movement.qty, // Negative quantity
            totalCost: -movement.totalCost,
            movementType: 'REVERSAL',
            eventId: reversalEventRef.id,
            reversesMovementId: movementId,
            occurredAt: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
          });

          // Update inventory balance
          const balanceRef = db.collection('tenants').doc(tenantId)
            .collection('sites').doc(movement.siteId)
            .collection('inventory').doc(movement.itemId);

          const balanceDoc = await transaction.get(balanceRef);
          if (balanceDoc.exists) {
            const balance = balanceDoc.data();
            const newQty = (balance.qtyOnHand || 0) - movement.qty;
            const newValue = (balance.totalValue || 0) - movement.totalCost;

            transaction.update(balanceRef, {
              qtyOnHand: newQty,
              totalValue: newValue,
              avgCostPerUnit: newQty > 0 ? newValue / newQty : 0,
              lastMovementAt: FieldValue.serverTimestamp(),
              lastMovementId: reversalMovementRef.id,
            });
          }
        }
      }
    }

    // Mark reversal event as posted
    transaction.update(reversalEventRef, {
      status: 'POSTED',
      postingResults: {
        ledgerTransactionId: reversalTxRef.id,
        reversedEventId: eventId,
      },
      postedAt: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      reversalEventId: reversalEventRef.id,
      originalEventId: eventId,
    };
  });
};

module.exports = {
  processEvent,
  processPendingEvents,
  reverseEvent,
  DEFAULT_ACCOUNTS,
  getInventoryAccount,
};
