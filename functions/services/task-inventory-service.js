/**
 * Task Inventory Service
 * Handles inventory consumption when completing tasks
 */

const { db, admin } = require('../config/firebase-admin');
const { FieldValue } = admin.firestore;

/**
 * Consume inventory items when completing a task
 * @param {string} tenantId - The tenant ID
 * @param {string} siteId - The site ID
 * @param {Object} taskOccurrence - The task occurrence being completed
 * @param {Array} inventoryItems - Array of inventory items to consume
 *   Each item: { itemId, itemName, quantity, uom, allocationMode, unitCost? }
 * @param {number} animalCount - Number of animals (for PER_ANIMAL allocation)
 * @returns {Object} - { movements: [], totalCost: number }
 */
const consumeInventoryForTask = async (tenantId, siteId, taskOccurrence, inventoryItems, animalCount = 0) => {
  if (!inventoryItems || inventoryItems.length === 0) {
    return { movements: [], totalCost: 0 };
  }

  if (!siteId) {
    throw new Error('Site ID is required for inventory consumption');
  }

  const movements = [];
  let totalCost = 0;

  return db.runTransaction(async (transaction) => {
    for (const item of inventoryItems) {
      if (!item.itemId || !item.quantity || item.quantity <= 0) {
        continue;
      }

      // Calculate actual quantity based on allocation mode
      let actualQty = parseFloat(item.quantity);
      if (item.allocationMode === 'PER_ANIMAL' && animalCount > 0) {
        actualQty = actualQty * animalCount;
      }

      // Get current inventory balance
      const balanceRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('sites')
        .doc(siteId)
        .collection('inventory')
        .doc(item.itemId);

      const balanceDoc = await transaction.get(balanceRef);

      if (!balanceDoc.exists) {
        console.warn(`[Task Inventory] No inventory record found for item ${item.itemId} at site ${siteId}`);
        // Still create the movement but note that inventory wasn't found
        // This allows tracking even if inventory wasn't properly set up
      }

      const currentBalance = balanceDoc.exists ? balanceDoc.data() : null;
      const currentQty = currentBalance?.qtyOnHand || 0;
      const currentAvgCost = currentBalance?.avgCostPerUnit || 0;

      // Use the inventory's average cost if not provided
      const unitCost = item.unitCost || currentAvgCost;
      const lineTotalCost = actualQty * unitCost;

      // Create inventory movement record
      const movementRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('inventoryMovements')
        .doc();

      const movement = {
        itemId: item.itemId,
        itemName: item.itemName || null,
        siteId,
        sourceType: 'TASK',
        sourceId: taskOccurrence.id,
        taskOccurrenceId: taskOccurrence.id,
        templateId: taskOccurrence.templateId || null,
        movementType: 'CONSUMPTION',
        qty: -actualQty, // Negative for consumption
        unitCost,
        totalCost: -lineTotalCost, // Negative for consumption
        allocationMode: item.allocationMode || 'TOTAL',
        animalCount: animalCount || null,
        originalQuantity: item.quantity, // The quantity from the template
        uom: item.uom || 'units',
        occurredAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      };

      transaction.set(movementRef, movement);
      movements.push({ id: movementRef.id, ...movement, qty: actualQty, totalCost: lineTotalCost });

      // Update inventory balance (deduct)
      if (balanceDoc.exists) {
        const newQty = currentQty - actualQty;
        const currentTotalValue = currentQty * currentAvgCost;
        const newTotalValue = Math.max(0, currentTotalValue - lineTotalCost);

        // Keep the same average cost when consuming (don't recalculate)
        transaction.update(balanceRef, {
          qtyOnHand: newQty,
          totalValue: newTotalValue,
          lastMovementAt: FieldValue.serverTimestamp(),
          lastMovementId: movementRef.id,
        });
      } else {
        // Create a new balance record with negative quantity
        // This indicates inventory was consumed before being received
        transaction.set(balanceRef, {
          itemId: item.itemId,
          siteId,
          qtyOnHand: -actualQty,
          avgCostPerUnit: unitCost,
          totalValue: -lineTotalCost,
          lastMovementAt: FieldValue.serverTimestamp(),
          lastMovementId: movementRef.id,
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      totalCost += lineTotalCost;
    }

    return { movements, totalCost };
  });
};

/**
 * Get inventory consumption summary for a task
 * @param {string} tenantId
 * @param {string} taskOccurrenceId
 * @returns {Array} - Array of movements for this task
 */
const getTaskInventoryConsumption = async (tenantId, taskOccurrenceId) => {
  const snapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('inventoryMovements')
    .where('taskOccurrenceId', '==', taskOccurrenceId)
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
};

module.exports = {
  consumeInventoryForTask,
  getTaskInventoryConsumption,
};
