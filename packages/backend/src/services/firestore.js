const { db, admin } = require('../config/firebase-admin');
const { FieldValue } = admin.firestore;

/**
 * Firestore Service
 * Handles all Firestore operations for tenants, users, sites, and events
 */

// ============================================
// TENANT OPERATIONS
// ============================================

/**
 * Create a new tenant in Firestore
 */
const createTenant = async (tenantData) => {
  const { name, timezone, settings = {} } = tenantData;

  if (!timezone) {
    throw new Error('Timezone is required for tenant creation');
  }

  const tenantRef = db.collection('tenants').doc();
  const tenant = {
    name,
    timezone,
    settings: {
      livestockCostingMode: settings.livestockCostingMode || 'EXPENSE',
      autoReorderEnabled: settings.autoReorderEnabled ?? false,
      autoReorderApprovalRequired: settings.autoReorderApprovalRequired ?? true,
      ...settings,
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await tenantRef.set(tenant);

  return {
    id: tenantRef.id,
    ...tenant,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

/**
 * Get tenant by ID
 */
const getTenant = async (tenantId) => {
  const tenantDoc = await db.collection('tenants').doc(tenantId).get();

  if (!tenantDoc.exists) {
    return null;
  }

  return {
    id: tenantDoc.id,
    ...tenantDoc.data(),
  };
};

/**
 * Update tenant settings
 */
const updateTenant = async (tenantId, updates) => {
  const tenantRef = db.collection('tenants').doc(tenantId);

  await tenantRef.update({
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return getTenant(tenantId);
};

// ============================================
// USER OPERATIONS
// ============================================

/**
 * Create or update a user within a tenant
 */
const upsertUser = async (tenantId, userData) => {
  const { authUid, email, displayName, photoURL, roles = ['owner'] } = userData;

  const userRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('users')
    .doc(authUid);

  const existingUser = await userRef.get();

  if (existingUser.exists) {
    // Update existing user
    await userRef.update({
      email,
      displayName,
      photoURL,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    // Create new user
    await userRef.set({
      authUid,
      email,
      displayName,
      photoURL,
      roles,
      sitePermissions: [], // Empty = access to all sites
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  const userDoc = await userRef.get();
  return {
    id: userDoc.id,
    ...userDoc.data(),
  };
};

/**
 * Get user by authUid within a tenant
 */
const getUser = async (tenantId, authUid) => {
  const userDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('users')
    .doc(authUid)
    .get();

  if (!userDoc.exists) {
    return null;
  }

  return {
    id: userDoc.id,
    ...userDoc.data(),
  };
};

/**
 * Find user across all tenants by authUid
 */
const findUserByAuthUid = async (authUid) => {
  // Query all tenants' users subcollections for this authUid
  const tenantsSnapshot = await db.collection('tenants').get();

  for (const tenantDoc of tenantsSnapshot.docs) {
    const userDoc = await db
      .collection('tenants')
      .doc(tenantDoc.id)
      .collection('users')
      .doc(authUid)
      .get();

    if (userDoc.exists) {
      return {
        tenantId: tenantDoc.id,
        tenant: { id: tenantDoc.id, ...tenantDoc.data() },
        user: { id: userDoc.id, ...userDoc.data() },
      };
    }
  }

  return null;
};

// ============================================
// SITE OPERATIONS
// ============================================

/**
 * Create a site within a tenant
 */
const createSite = async (tenantId, siteData, createdBy) => {
  const { name, address, type, acreage, code } = siteData;

  const siteRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('sites')
    .doc();

  const site = {
    name,
    code: code?.toUpperCase() || null,
    type: type || 'farm',
    address: address || null,
    acreage: acreage || null,
    active: true,
    createdAt: FieldValue.serverTimestamp(),
    createdBy,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await siteRef.set(site);

  return {
    id: siteRef.id,
    ...site,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

/**
 * Get all sites for a tenant
 */
const getSites = async (tenantId) => {
  const sitesSnapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('sites')
    .where('active', '==', true)
    .orderBy('name')
    .get();

  return sitesSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

/**
 * Get a single site
 */
const getSite = async (tenantId, siteId) => {
  const siteDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('sites')
    .doc(siteId)
    .get();

  if (!siteDoc.exists) {
    return null;
  }

  return {
    id: siteDoc.id,
    ...siteDoc.data(),
  };
};

/**
 * Update a site
 */
const updateSite = async (tenantId, siteId, updates) => {
  const siteRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('sites')
    .doc(siteId);

  await siteRef.update({
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return getSite(tenantId, siteId);
};

// ============================================
// EVENT OPERATIONS
// ============================================

/**
 * Event statuses
 */
const EventStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  POSTED: 'POSTED',
  FAILED: 'FAILED',
  REVERSED: 'REVERSED',
};

/**
 * Create an event (initially PENDING)
 */
const createEvent = async (tenantId, eventData, createdBy) => {
  const {
    siteId,
    type,
    occurredAt,
    sourceType,
    sourceId,
    payload,
    idempotencyKey,
  } = eventData;

  const eventRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('events')
    .doc();

  const event = {
    siteId,
    type,
    occurredAt: occurredAt || FieldValue.serverTimestamp(),
    sourceType: sourceType || 'API',
    sourceId: sourceId || null,
    payload,
    status: EventStatus.PENDING,
    idempotencyKey,
    postedAt: null,
    postingResults: null,
    error: null,
    lockedAt: null,
    lockedBy: null,
    createdAt: FieldValue.serverTimestamp(),
    createdBy,
  };

  await eventRef.set(event);

  return {
    id: eventRef.id,
    tenantId,
    ...event,
    createdAt: new Date(),
  };
};

/**
 * Get an event by ID
 */
const getEvent = async (tenantId, eventId) => {
  const eventDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('events')
    .doc(eventId)
    .get();

  if (!eventDoc.exists) {
    return null;
  }

  return {
    id: eventDoc.id,
    tenantId,
    ...eventDoc.data(),
  };
};

/**
 * Acquire lock on event for processing (PENDING -> PROCESSING)
 * Returns the event if lock acquired, null if already locked/processed
 */
const acquireEventLock = async (tenantId, eventId, lockerId) => {
  const eventRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('events')
    .doc(eventId);

  return db.runTransaction(async (transaction) => {
    const eventDoc = await transaction.get(eventRef);

    if (!eventDoc.exists) {
      throw new Error('Event not found');
    }

    const eventData = eventDoc.data();

    // Only allow locking PENDING events
    if (eventData.status !== EventStatus.PENDING) {
      return null; // Already processed or processing
    }

    // Check for stale lock (older than 5 minutes)
    const staleLockTime = Date.now() - 5 * 60 * 1000;
    if (
      eventData.lockedAt &&
      eventData.lockedAt.toMillis() > staleLockTime
    ) {
      return null; // Currently locked by another process
    }

    // Acquire lock
    transaction.update(eventRef, {
      status: EventStatus.PROCESSING,
      lockedAt: FieldValue.serverTimestamp(),
      lockedBy: lockerId,
    });

    return {
      id: eventDoc.id,
      tenantId,
      ...eventData,
      status: EventStatus.PROCESSING,
    };
  });
};

/**
 * Mark event as POSTED with results
 */
const markEventPosted = async (tenantId, eventId, postingResults) => {
  const eventRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('events')
    .doc(eventId);

  await eventRef.update({
    status: EventStatus.POSTED,
    postedAt: FieldValue.serverTimestamp(),
    postingResults,
    lockedAt: null,
    lockedBy: null,
    error: null,
  });

  return getEvent(tenantId, eventId);
};

/**
 * Mark event as FAILED with error
 */
const markEventFailed = async (tenantId, eventId, error) => {
  const eventRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('events')
    .doc(eventId);

  await eventRef.update({
    status: EventStatus.FAILED,
    error: typeof error === 'string' ? error : error.message,
    lockedAt: null,
    lockedBy: null,
  });

  return getEvent(tenantId, eventId);
};

/**
 * Release lock without changing status (rollback to PENDING)
 */
const releaseEventLock = async (tenantId, eventId) => {
  const eventRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('events')
    .doc(eventId);

  await eventRef.update({
    status: EventStatus.PENDING,
    lockedAt: null,
    lockedBy: null,
  });
};

// ============================================
// INVENTORY ITEM OPERATIONS (Master Catalog)
// ============================================

/**
 * Inventory item categories
 */
const InventoryCategory = {
  FEED: 'FEED',
  SEED: 'SEED',
  FERTILIZER: 'FERTILIZER',
  CHEMICAL: 'CHEMICAL',
  FUEL: 'FUEL',
  SUPPLIES: 'SUPPLIES',
  EQUIPMENT_PARTS: 'EQUIPMENT_PARTS',
  OTHER: 'OTHER',
};

/**
 * Create an inventory item in the master catalog
 */
const createInventoryItem = async (tenantId, itemData, createdBy) => {
  const {
    sku: providedSku,
    name,
    description,
    category,
    unit,
    defaultCostPerUnit,
    reorderPoint,
    reorderQty,
    preferredVendor,
    glAccountCode,
    binId,
  } = itemData;

  // Auto-generate SKU if not provided
  const sku = providedSku
    ? providedSku.toUpperCase()
    : `ITEM-${Date.now().toString(36).toUpperCase()}`;

  // Check for duplicate SKU
  const existingItem = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('inventoryItems')
    .where('sku', '==', sku)
    .limit(1)
    .get();

  if (!existingItem.empty) {
    throw new Error(`Inventory item with SKU "${sku}" already exists`);
  }

  const itemRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('inventoryItems')
    .doc();

  const item = {
    sku,
    name,
    description: description || null,
    category: category || InventoryCategory.OTHER,
    unit: unit || 'EA',
    defaultCostPerUnit: defaultCostPerUnit || 0,
    reorderPoint: reorderPoint ?? null,
    reorderQty: reorderQty ?? null,
    preferredVendor: preferredVendor || null,
    glAccountCode: glAccountCode || null,
    binId: binId || null,
    active: true,
    createdAt: FieldValue.serverTimestamp(),
    createdBy,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await itemRef.set(item);

  return {
    id: itemRef.id,
    ...item,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

/**
 * Get all inventory items for a tenant
 */
const getInventoryItems = async (tenantId, options = {}) => {
  const { category, activeOnly = true } = options;

  let query = db
    .collection('tenants')
    .doc(tenantId)
    .collection('inventoryItems');

  if (activeOnly) {
    query = query.where('active', '==', true);
  }

  if (category) {
    query = query.where('category', '==', category);
  }

  const snapshot = await query.orderBy('name').get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

/**
 * Get a single inventory item
 */
const getInventoryItem = async (tenantId, itemId) => {
  const itemDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('inventoryItems')
    .doc(itemId)
    .get();

  if (!itemDoc.exists) {
    return null;
  }

  return {
    id: itemDoc.id,
    ...itemDoc.data(),
  };
};

/**
 * Get inventory item by SKU
 */
const getInventoryItemBySku = async (tenantId, sku) => {
  const snapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('inventoryItems')
    .where('sku', '==', sku.toUpperCase())
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  };
};

/**
 * Update an inventory item
 */
const updateInventoryItem = async (tenantId, itemId, updates) => {
  const itemRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('inventoryItems')
    .doc(itemId);

  // If updating SKU, check for duplicates
  if (updates.sku) {
    const existing = await getInventoryItemBySku(tenantId, updates.sku);
    if (existing && existing.id !== itemId) {
      throw new Error(`Inventory item with SKU "${updates.sku}" already exists`);
    }
    updates.sku = updates.sku.toUpperCase();
  }

  await itemRef.update({
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return getInventoryItem(tenantId, itemId);
};

// ============================================
// SITE INVENTORY OPERATIONS (Balances per Site)
// ============================================

/**
 * Get inventory balance for an item at a site
 */
const getSiteInventoryBalance = async (tenantId, siteId, itemId) => {
  const balanceDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('sites')
    .doc(siteId)
    .collection('inventory')
    .doc(itemId)
    .get();

  if (!balanceDoc.exists) {
    return {
      itemId,
      siteId,
      qtyOnHand: 0,
      avgCostPerUnit: 0,
      lastMovementAt: null,
    };
  }

  return {
    id: balanceDoc.id,
    ...balanceDoc.data(),
  };
};

/**
 * Get all inventory balances for a site
 */
const getSiteInventory = async (tenantId, siteId, options = {}) => {
  const { includeZeroQty = false } = options;

  const snapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('sites')
    .doc(siteId)
    .collection('inventory')
    .get();

  const balances = [];
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (includeZeroQty || data.qtyOnHand > 0) {
      // Fetch item details
      const item = await getInventoryItem(tenantId, doc.id);
      balances.push({
        itemId: doc.id,
        item,
        ...data,
      });
    }
  }

  return balances;
};

/**
 * Update site inventory balance (used by posting engine)
 * Uses Firestore transaction for atomic updates
 */
const updateSiteInventoryBalance = async (
  tenantId,
  siteId,
  itemId,
  qtyChange,
  costPerUnit,
  movementType
) => {
  const balanceRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('sites')
    .doc(siteId)
    .collection('inventory')
    .doc(itemId);

  return db.runTransaction(async (transaction) => {
    const balanceDoc = await transaction.get(balanceRef);

    let currentQty = 0;
    let currentAvgCost = 0;

    if (balanceDoc.exists) {
      const data = balanceDoc.data();
      currentQty = data.qtyOnHand || 0;
      currentAvgCost = data.avgCostPerUnit || 0;
    }

    const newQty = currentQty + qtyChange;

    // Calculate new average cost (weighted average for receipts)
    let newAvgCost = currentAvgCost;
    if (qtyChange > 0 && costPerUnit > 0) {
      // Weighted average for incoming inventory
      const totalCurrentValue = currentQty * currentAvgCost;
      const incomingValue = qtyChange * costPerUnit;
      newAvgCost = newQty > 0 ? (totalCurrentValue + incomingValue) / newQty : costPerUnit;
    }

    const balanceData = {
      itemId,
      siteId,
      qtyOnHand: newQty,
      avgCostPerUnit: Math.round(newAvgCost * 100) / 100, // Round to 2 decimals
      lastMovementAt: FieldValue.serverTimestamp(),
      lastMovementType: movementType,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (balanceDoc.exists) {
      transaction.update(balanceRef, balanceData);
    } else {
      transaction.set(balanceRef, {
        ...balanceData,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    return {
      previousQty: currentQty,
      newQty,
      previousAvgCost: currentAvgCost,
      newAvgCost: balanceData.avgCostPerUnit,
    };
  });
};

// ============================================
// INVENTORY MOVEMENT OPERATIONS
// ============================================

/**
 * Movement types
 */
const MovementType = {
  RECEIPT: 'RECEIPT',
  ISSUE: 'ISSUE',
  TRANSFER_IN: 'TRANSFER_IN',
  TRANSFER_OUT: 'TRANSFER_OUT',
  ADJUSTMENT_IN: 'ADJUSTMENT_IN',
  ADJUSTMENT_OUT: 'ADJUSTMENT_OUT',
  CONSUMPTION: 'CONSUMPTION',
};

/**
 * Record an inventory movement (audit trail)
 */
const recordInventoryMovement = async (tenantId, movementData, createdBy) => {
  const {
    siteId,
    itemId,
    type,
    qty,
    costPerUnit,
    totalCost,
    reason,
    eventId,
    transactionId,
    relatedSiteId,
  } = movementData;

  const movementRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('inventoryMovements')
    .doc();

  const movement = {
    siteId,
    itemId,
    type,
    qty,
    costPerUnit: costPerUnit || 0,
    totalCost: totalCost || qty * (costPerUnit || 0),
    reason: reason || null,
    eventId: eventId || null,
    transactionId: transactionId || null,
    relatedSiteId: relatedSiteId || null,
    occurredAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    createdBy,
  };

  await movementRef.set(movement);

  return {
    id: movementRef.id,
    ...movement,
    occurredAt: new Date(),
    createdAt: new Date(),
  };
};

/**
 * Get inventory movements for a tenant
 */
const getInventoryMovements = async (tenantId, options = {}) => {
  const { siteId, itemId, type, limit = 50, startAfter } = options;

  let query = db
    .collection('tenants')
    .doc(tenantId)
    .collection('inventoryMovements')
    .orderBy('occurredAt', 'desc');

  if (siteId) {
    query = query.where('siteId', '==', siteId);
  }

  if (itemId) {
    query = query.where('itemId', '==', itemId);
  }

  if (type) {
    query = query.where('type', '==', type);
  }

  if (startAfter) {
    const startDoc = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('inventoryMovements')
      .doc(startAfter)
      .get();
    if (startDoc.exists) {
      query = query.startAfter(startDoc);
    }
  }

  query = query.limit(limit);

  const snapshot = await query.get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

// ============================================
// PURCHASE REQUISITION OPERATIONS (Auto-Reorder)
// ============================================

/**
 * Requisition statuses
 */
const RequisitionStatus = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  ORDERED: 'ORDERED',
  CANCELLED: 'CANCELLED',
};

/**
 * Create a purchase requisition (for reorder triggers)
 */
const createPurchaseRequisition = async (tenantId, reqData, createdBy) => {
  const {
    siteId,
    itemId,
    qty,
    estimatedCost,
    vendor,
    reason,
    autoGenerated,
    triggerBalance,
  } = reqData;

  // Get tenant settings to determine if approval is required
  const tenant = await getTenant(tenantId);
  const needsApproval = tenant?.settings?.autoReorderApprovalRequired ?? true;

  const reqRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('purchaseRequisitions')
    .doc();

  const requisition = {
    siteId,
    itemId,
    qty,
    estimatedCost: estimatedCost || 0,
    vendor: vendor || null,
    reason: reason || 'Auto-reorder triggered',
    status: needsApproval ? RequisitionStatus.PENDING_APPROVAL : RequisitionStatus.APPROVED,
    autoGenerated: autoGenerated ?? false,
    triggerBalance: triggerBalance ?? null,
    approvedBy: needsApproval ? null : 'AUTO',
    approvedAt: needsApproval ? null : FieldValue.serverTimestamp(),
    orderedAt: null,
    createdAt: FieldValue.serverTimestamp(),
    createdBy,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await reqRef.set(requisition);

  return {
    id: reqRef.id,
    ...requisition,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

/**
 * Get purchase requisitions
 */
const getPurchaseRequisitions = async (tenantId, options = {}) => {
  const { status, siteId, limit = 50 } = options;

  let query = db
    .collection('tenants')
    .doc(tenantId)
    .collection('purchaseRequisitions')
    .orderBy('createdAt', 'desc');

  if (status) {
    query = query.where('status', '==', status);
  }

  if (siteId) {
    query = query.where('siteId', '==', siteId);
  }

  query = query.limit(limit);

  const snapshot = await query.get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

/**
 * Update requisition status
 */
const updateRequisitionStatus = async (tenantId, reqId, status, updatedBy, notes) => {
  const reqRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('purchaseRequisitions')
    .doc(reqId);

  const updates = {
    status,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (status === RequisitionStatus.APPROVED) {
    updates.approvedBy = updatedBy;
    updates.approvedAt = FieldValue.serverTimestamp();
  } else if (status === RequisitionStatus.REJECTED) {
    updates.rejectedBy = updatedBy;
    updates.rejectedAt = FieldValue.serverTimestamp();
    updates.rejectionReason = notes || null;
  } else if (status === RequisitionStatus.ORDERED) {
    updates.orderedAt = FieldValue.serverTimestamp();
  }

  await reqRef.update(updates);

  const updated = await reqRef.get();
  return {
    id: updated.id,
    ...updated.data(),
  };
};

/**
 * Check if reorder is needed for an item at a site
 */
const checkReorderNeeded = async (tenantId, siteId, itemId) => {
  const item = await getInventoryItem(tenantId, itemId);
  if (!item || item.reorderPoint === null) {
    return null; // No reorder point set
  }

  const balance = await getSiteInventoryBalance(tenantId, siteId, itemId);

  if (balance.qtyOnHand <= item.reorderPoint) {
    // Check if there's already a pending requisition
    const existingReqs = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('purchaseRequisitions')
      .where('itemId', '==', itemId)
      .where('siteId', '==', siteId)
      .where('status', 'in', [
        RequisitionStatus.DRAFT,
        RequisitionStatus.PENDING_APPROVAL,
        RequisitionStatus.APPROVED,
      ])
      .limit(1)
      .get();

    if (existingReqs.empty) {
      return {
        needsReorder: true,
        currentQty: balance.qtyOnHand,
        reorderPoint: item.reorderPoint,
        suggestedQty: item.reorderQty || item.reorderPoint * 2,
        item,
      };
    }
  }

  return { needsReorder: false };
};

// ============================================
// LIVESTOCK/ANIMAL OPERATIONS
// ============================================

/**
 * Animal species types (lowercase to match frontend)
 */
const AnimalSpecies = {
  // Large livestock
  CATTLE: 'cattle',
  HORSE: 'horse',
  DONKEY: 'donkey',
  MULE: 'mule',
  // Small livestock
  SHEEP: 'sheep',
  GOAT: 'goat',
  PIG: 'pig',
  LLAMA: 'llama',
  ALPACA: 'alpaca',
  // Poultry - specific types
  CHICKEN: 'chicken',
  TURKEY: 'turkey',
  DUCK: 'duck',
  GOOSE: 'goose',
  GUINEA_FOWL: 'guinea_fowl',
  QUAIL: 'quail',
  // Small animals
  RABBIT: 'rabbit',
  // Apiary
  BEE: 'bee',
  // Other
  OTHER: 'other',
};

/**
 * Animal statuses (lowercase to match frontend)
 */
const AnimalStatus = {
  ACTIVE: 'active',
  SOLD: 'sold',
  DECEASED: 'deceased',
  TRANSFERRED: 'transferred',
  CULLED: 'culled',
};

/**
 * Animal group types (lowercase to match frontend)
 */
const AnimalGroupType = {
  HERD: 'herd',
  FLOCK: 'flock',
  PEN: 'pen',
  PASTURE: 'pasture',
  BARN: 'barn',
  COOP: 'coop',
  OTHER: 'OTHER',
};

/**
 * Create an animal group
 */
const createAnimalGroup = async (tenantId, groupData, createdBy) => {
  const {
    siteId,
    name,
    type,
    species,
    description,
    location,
    capacity,
  } = groupData;

  // Check for duplicate name
  const existingGroup = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('animalGroups')
    .where('name', '==', name)
    .where('status', '==', 'ACTIVE')
    .limit(1)
    .get();

  if (!existingGroup.empty) {
    throw new Error(`Animal group with name "${name}" already exists`);
  }

  const groupRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('animalGroups')
    .doc();

  const group = {
    siteId,
    name,
    type: type || AnimalGroupType.HERD,
    species: species || null,
    description: description || null,
    location: location || null,
    capacity: capacity ?? null,
    status: 'ACTIVE',
    animalCount: 0,
    totalCostBasis: 0, // Accumulated cost for CAPITALIZE mode
    createdAt: FieldValue.serverTimestamp(),
    createdBy,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await groupRef.set(group);

  return {
    id: groupRef.id,
    ...group,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

/**
 * Get all animal groups for a tenant
 */
const getAnimalGroups = async (tenantId, options = {}) => {
  const { siteId, species, status = 'ACTIVE' } = options;

  let query = db
    .collection('tenants')
    .doc(tenantId)
    .collection('animalGroups');

  if (status) {
    query = query.where('status', '==', status);
  }

  if (siteId) {
    query = query.where('siteId', '==', siteId);
  }

  if (species) {
    query = query.where('species', '==', species);
  }

  const snapshot = await query.orderBy('name').get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

/**
 * Get a single animal group
 */
const getAnimalGroup = async (tenantId, groupId) => {
  const groupDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('animalGroups')
    .doc(groupId)
    .get();

  if (!groupDoc.exists) {
    return null;
  }

  return {
    id: groupDoc.id,
    ...groupDoc.data(),
  };
};

/**
 * Update an animal group
 */
const updateAnimalGroup = async (tenantId, groupId, updates) => {
  const groupRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('animalGroups')
    .doc(groupId);

  // If updating name, check for duplicates
  if (updates.name) {
    const existing = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('animalGroups')
      .where('name', '==', updates.name)
      .where('status', '==', 'ACTIVE')
      .limit(1)
      .get();

    if (!existing.empty && existing.docs[0].id !== groupId) {
      throw new Error(`Animal group with name "${updates.name}" already exists`);
    }
  }

  await groupRef.update({
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return getAnimalGroup(tenantId, groupId);
};

/**
 * Update group cost basis (used by posting engine for CAPITALIZE mode)
 */
const updateGroupCostBasis = async (tenantId, groupId, costDelta) => {
  const groupRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('animalGroups')
    .doc(groupId);

  return db.runTransaction(async (transaction) => {
    const groupDoc = await transaction.get(groupRef);

    if (!groupDoc.exists) {
      throw new Error('Animal group not found');
    }

    const currentCost = groupDoc.data().totalCostBasis || 0;
    const newCost = currentCost + costDelta;

    transaction.update(groupRef, {
      totalCostBasis: Math.max(0, newCost), // Don't go negative
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      previousCost: currentCost,
      newCost: Math.max(0, newCost),
    };
  });
};

/**
 * Create an individual animal
 */
const createAnimal = async (tenantId, animalData, createdBy) => {
  const {
    siteId,
    groupId,
    tagNumber,
    name,
    species,
    breed,
    gender,
    dateOfBirth,
    acquisitionDate,
    color,
    markings,
    weight,
    sireId,
    damId,
    acquisition,
    registrationNumber,
    electronicId,
    notes,
  } = animalData;

  // Check for duplicate tag number
  const existingAnimal = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('animals')
    .where('tagNumber', '==', tagNumber)
    .where('status', '==', AnimalStatus.ACTIVE)
    .limit(1)
    .get();

  if (!existingAnimal.empty) {
    throw new Error(`An active animal with tag number "${tagNumber}" already exists`);
  }

  const animalRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('animals')
    .doc();

  const animal = {
    siteId,
    groupId: groupId || null,
    tagNumber,
    name: name || null,
    species: species || AnimalSpecies.CATTLE,
    breed: breed || null,
    gender: gender || 'unknown',
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
    acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : new Date(),
    color: color || null,
    markings: markings || null,
    weight: weight || null,
    sireId: sireId || null,
    damId: damId || null,
    acquisition: acquisition || null,
    registrationNumber: registrationNumber || null,
    electronicId: electronicId || null,
    notes: notes || null,
    status: AnimalStatus.ACTIVE,
    statusDate: null,
    statusReason: null,
    costBasis: acquisition?.cost || 0, // Individual cost for CAPITALIZE mode
    createdAt: FieldValue.serverTimestamp(),
    createdBy,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await animalRef.set(animal);

  // Update group animal count if assigned to a group
  if (groupId) {
    await updateGroupAnimalCount(tenantId, groupId, 1);
  }

  return {
    id: animalRef.id,
    ...animal,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

/**
 * Get animals for a tenant with filters
 */
const getAnimals = async (tenantId, options = {}) => {
  const { siteId, groupId, species, status, search, limit = 50, startAfter, skipOrder } = options;

  let query = db
    .collection('tenants')
    .doc(tenantId)
    .collection('animals');

  // status: 'ALL' returns all animals regardless of status
  // status: null/undefined defaults to ACTIVE only
  // status: 'ACTIVE', 'SOLD', etc. filters by that specific status
  if (status === 'ALL') {
    // No status filter - return all
  } else if (status) {
    query = query.where('status', '==', status);
  } else {
    query = query.where('status', '==', AnimalStatus.ACTIVE);
  }

  if (siteId) {
    query = query.where('siteId', '==', siteId);
  }

  if (groupId) {
    query = query.where('groupId', '==', groupId);
  }

  if (species) {
    query = query.where('species', '==', species);
  }

  // Skip ordering to avoid composite index requirement for counts/aggregation queries
  if (!skipOrder) {
    query = query.orderBy('tagNumber');
  }

  if (startAfter) {
    const startDoc = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('animals')
      .doc(startAfter)
      .get();
    if (startDoc.exists) {
      query = query.startAfter(startDoc);
    }
  }

  query = query.limit(limit);

  const snapshot = await query.get();

  let animals = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Client-side search filter if needed (Firestore doesn't support text search)
  if (search) {
    const searchLower = search.toLowerCase();
    animals = animals.filter(
      (a) =>
        a.tagNumber?.toLowerCase().includes(searchLower) ||
        a.name?.toLowerCase().includes(searchLower) ||
        a.breed?.toLowerCase().includes(searchLower)
    );
  }

  // Calculate age for each animal
  animals = animals.map((animal) => ({
    ...animal,
    age: calculateAge(animal.dateOfBirth),
  }));

  return animals;
};

/**
 * Calculate age from date of birth
 */
const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;

  const dob = dateOfBirth instanceof Date ? dateOfBirth : dateOfBirth.toDate?.() || new Date(dateOfBirth);
  const now = new Date();

  let years = now.getFullYear() - dob.getFullYear();
  let months = now.getMonth() - dob.getMonth();

  if (months < 0) {
    years--;
    months += 12;
  }

  // Adjust for day of month
  if (now.getDate() < dob.getDate()) {
    months--;
    if (months < 0) {
      years--;
      months += 12;
    }
  }

  return { years, months };
};

/**
 * Get a single animal
 */
const getAnimal = async (tenantId, animalId) => {
  const animalDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('animals')
    .doc(animalId)
    .get();

  if (!animalDoc.exists) {
    return null;
  }

  const data = animalDoc.data();
  return {
    id: animalDoc.id,
    ...data,
    age: calculateAge(data.dateOfBirth),
  };
};

/**
 * Update an animal
 */
const updateAnimal = async (tenantId, animalId, updates) => {
  const animalRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('animals')
    .doc(animalId);

  const currentAnimal = await getAnimal(tenantId, animalId);
  if (!currentAnimal) {
    throw new Error('Animal not found');
  }

  // If updating tag number, check for duplicates
  if (updates.tagNumber && updates.tagNumber !== currentAnimal.tagNumber) {
    const existing = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('animals')
      .where('tagNumber', '==', updates.tagNumber)
      .where('status', '==', AnimalStatus.ACTIVE)
      .limit(1)
      .get();

    if (!existing.empty) {
      throw new Error(`An active animal with tag number "${updates.tagNumber}" already exists`);
    }
  }

  // Handle group change
  const oldGroupId = currentAnimal.groupId;
  const newGroupId = updates.groupId;

  if (newGroupId !== undefined && newGroupId !== oldGroupId) {
    // Decrement old group count
    if (oldGroupId) {
      await updateGroupAnimalCount(tenantId, oldGroupId, -1);
    }
    // Increment new group count
    if (newGroupId) {
      await updateGroupAnimalCount(tenantId, newGroupId, 1);
    }
  }

  await animalRef.update({
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return getAnimal(tenantId, animalId);
};

/**
 * Update animal status (sold, deceased, etc.)
 */
const updateAnimalStatus = async (tenantId, animalId, status, reason, updatedBy) => {
  const animal = await getAnimal(tenantId, animalId);
  if (!animal) {
    throw new Error('Animal not found');
  }

  const animalRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('animals')
    .doc(animalId);

  await animalRef.update({
    status,
    statusDate: FieldValue.serverTimestamp(),
    statusReason: reason || null,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy,
  });

  // If status is no longer active, decrement group count
  if (status !== AnimalStatus.ACTIVE && animal.groupId) {
    await updateGroupAnimalCount(tenantId, animal.groupId, -1);
  }

  return getAnimal(tenantId, animalId);
};

/**
 * Update group animal count helper
 */
const updateGroupAnimalCount = async (tenantId, groupId, delta) => {
  const groupRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('animalGroups')
    .doc(groupId);

  return db.runTransaction(async (transaction) => {
    const groupDoc = await transaction.get(groupRef);
    if (!groupDoc.exists) return;

    const currentCount = groupDoc.data().animalCount || 0;
    transaction.update(groupRef, {
      animalCount: Math.max(0, currentCount + delta),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
};

/**
 * Get animal statistics for a tenant
 */
const getAnimalStats = async (tenantId, options = {}) => {
  const { siteId } = options;

  let query = db
    .collection('tenants')
    .doc(tenantId)
    .collection('animals')
    .where('status', '==', AnimalStatus.ACTIVE);

  if (siteId) {
    query = query.where('siteId', '==', siteId);
  }

  const snapshot = await query.get();

  const stats = {
    totalActive: 0,
    bySpecies: {},
    byGender: {},
    bySite: {},
  };

  snapshot.docs.forEach((doc) => {
    const animal = doc.data();
    stats.totalActive++;

    // By species
    const species = animal.species || 'OTHER';
    stats.bySpecies[species] = (stats.bySpecies[species] || 0) + 1;

    // By gender
    const gender = animal.gender || 'unknown';
    stats.byGender[gender] = (stats.byGender[gender] || 0) + 1;

    // By site
    if (animal.siteId) {
      stats.bySite[animal.siteId] = (stats.bySite[animal.siteId] || 0) + 1;
    }
  });

  return stats;
};

/**
 * Bulk move animals to a different group/site
 */
const bulkMoveAnimals = async (tenantId, animalIds, targetGroupId, targetSiteId, updatedBy) => {
  const batch = db.batch();
  const groupChanges = {}; // Track group count changes

  for (const animalId of animalIds) {
    const animal = await getAnimal(tenantId, animalId);
    if (!animal || animal.status !== AnimalStatus.ACTIVE) continue;

    const animalRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('animals')
      .doc(animalId);

    const updates = {
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy,
    };

    // Handle group change
    if (targetGroupId !== undefined) {
      const oldGroupId = animal.groupId;
      if (oldGroupId !== targetGroupId) {
        if (oldGroupId) {
          groupChanges[oldGroupId] = (groupChanges[oldGroupId] || 0) - 1;
        }
        if (targetGroupId) {
          groupChanges[targetGroupId] = (groupChanges[targetGroupId] || 0) + 1;
        }
        updates.groupId = targetGroupId || null;
      }
    }

    // Handle site change
    if (targetSiteId) {
      updates.siteId = targetSiteId;
    }

    batch.update(animalRef, updates);
  }

  await batch.commit();

  // Update group counts
  for (const [groupId, delta] of Object.entries(groupChanges)) {
    if (delta !== 0) {
      await updateGroupAnimalCount(tenantId, groupId, delta);
    }
  }

  return { movedCount: animalIds.length };
};

// ============================================
// TASK TEMPLATE OPERATIONS
// ============================================

/**
 * Task priority levels
 */
const TaskPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
};

/**
 * Task categories
 */
const TaskCategory = {
  FEEDING: 'FEEDING',
  WATERING: 'WATERING',
  HEALTH_CHECK: 'HEALTH_CHECK',
  MEDICATION: 'MEDICATION',
  BREEDING: 'BREEDING',
  MAINTENANCE: 'MAINTENANCE',
  CLEANING: 'CLEANING',
  HARVESTING: 'HARVESTING',
  PLANTING: 'PLANTING',
  WEEDING: 'WEEDING',
  IRRIGATION: 'IRRIGATION',
  PEST_CONTROL: 'PEST_CONTROL',
  EQUIPMENT: 'EQUIPMENT',
  ADMINISTRATIVE: 'ADMINISTRATIVE',
  OTHER: 'OTHER',
};

/**
 * Recurrence patterns for task templates
 */
const RecurrencePattern = {
  ONCE: 'ONCE',
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  BIWEEKLY: 'BIWEEKLY',
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  YEARLY: 'YEARLY',
  CUSTOM: 'CUSTOM',
};

/**
 * Create a task template
 */
const createTaskTemplate = async (tenantId, templateData, createdBy) => {
  const {
    name,
    description,
    category,
    priority,
    estimatedDurationMinutes,
    landTractId,
    instructions,
    requiredSkills,
    requiredEquipment,
    inventoryItemsNeeded,
    inventoryItems, // New field from frontend
    siteIds,
    animalGroupIds,
    herdGroupIds, // New field from frontend (maps to animalGroupIds)
    selectedAnimalIds, // Individual animal IDs selected
    defaultAssigneeId,
    recurrence,
    linkedEventType,
    tools, // New field: tools needed for task
    active,
  } = templateData;

  // Check for duplicate name
  const existingTemplate = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('taskTemplates')
    .where('name', '==', name)
    .limit(1)
    .get();

  if (!existingTemplate.empty) {
    throw new Error(`Task template with name "${name}" already exists`);
  }

  const templateRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('taskTemplates')
    .doc();

  const template = {
    name,
    description: description || null,
    category: category || TaskCategory.OTHER,
    priority: priority || TaskPriority.MEDIUM,
    estimatedDurationMinutes: estimatedDurationMinutes || 30,
    landTractId: landTractId || null, // Optional: where the task will be performed
    instructions: instructions || null,
    requiredSkills: requiredSkills || [],
    requiredEquipment: requiredEquipment || [],
    // Support both old and new field names for inventory
    inventoryItems: inventoryItems || inventoryItemsNeeded || [], // Array of {itemId, itemName, quantity, uom, allocationMode}
    siteIds: siteIds || [], // Empty = all sites
    // Support both old and new field names for animal groups
    herdGroupIds: herdGroupIds || animalGroupIds || [], // For livestock-related tasks
    selectedAnimalIds: selectedAnimalIds || [], // Individual animal IDs
    defaultAssigneeId: defaultAssigneeId || null,
    recurrence: recurrence || {
      pattern: RecurrencePattern.ONCE,
      interval: 1,
      daysOfWeek: [], // For WEEKLY: [0-6] where 0=Sunday
      dayOfMonth: null, // For MONTHLY
      monthOfYear: null, // For YEARLY
      endDate: null,
      maxOccurrences: null,
    },
    linkedEventType: linkedEventType || null, // e.g., 'FEED_LIVESTOCK' to auto-create event
    tools: tools || [], // Tools needed for this task
    active: active ?? true,
    createdAt: FieldValue.serverTimestamp(),
    createdBy,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await templateRef.set(template);

  return {
    id: templateRef.id,
    ...template,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

/**
 * Get all task templates for a tenant
 */
const getTaskTemplates = async (tenantId, options = {}) => {
  const { category, activeOnly = true, siteId } = options;

  let query = db
    .collection('tenants')
    .doc(tenantId)
    .collection('taskTemplates');

  if (activeOnly) {
    query = query.where('active', '==', true);
  }

  if (category) {
    query = query.where('category', '==', category);
  }

  const snapshot = await query.orderBy('name').get();

  let templates = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Filter by site if specified (client-side since siteIds is an array)
  if (siteId) {
    templates = templates.filter(
      (t) => t.siteIds.length === 0 || t.siteIds.includes(siteId)
    );
  }

  return templates;
};

/**
 * Get a single task template
 */
const getTaskTemplate = async (tenantId, templateId) => {
  const templateDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('taskTemplates')
    .doc(templateId)
    .get();

  if (!templateDoc.exists) {
    return null;
  }

  return {
    id: templateDoc.id,
    ...templateDoc.data(),
  };
};

/**
 * Update a task template
 */
const updateTaskTemplate = async (tenantId, templateId, updates) => {
  const templateRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('taskTemplates')
    .doc(templateId);

  // If updating name, check for duplicates
  if (updates.name) {
    const existing = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('taskTemplates')
      .where('name', '==', updates.name)
      .limit(1)
      .get();

    if (!existing.empty && existing.docs[0].id !== templateId) {
      throw new Error(`Task template with name "${updates.name}" already exists`);
    }
  }

  await templateRef.update({
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return getTaskTemplate(tenantId, templateId);
};

/**
 * Delete (deactivate) a task template
 */
const deleteTaskTemplate = async (tenantId, templateId) => {
  const templateRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('taskTemplates')
    .doc(templateId);

  await templateRef.update({
    active: false,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { deleted: true };
};

// ============================================
// RUNLIST OPERATIONS
// ============================================

/**
 * Runlist statuses
 */
const RunlistStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  ARCHIVED: 'ARCHIVED',
};

/**
 * Create a runlist (scheduled task list)
 */
const createRunlist = async (tenantId, runlistData, createdBy) => {
  const {
    name,
    description,
    siteId,
    startDate,
    endDate,
    templateIds,
    defaultAssigneeId,
    scheduleTime,
    timezone,
    notes,
  } = runlistData;

  // Check for duplicate name
  const existingRunlist = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('runlists')
    .where('name', '==', name)
    .where('status', 'in', [RunlistStatus.DRAFT, RunlistStatus.ACTIVE, RunlistStatus.PAUSED])
    .limit(1)
    .get();

  if (!existingRunlist.empty) {
    throw new Error(`Runlist with name "${name}" already exists`);
  }

  // Get tenant timezone if not specified
  const tenant = await getTenant(tenantId);
  const runlistTimezone = timezone || tenant?.timezone || 'America/New_York';

  const runlistRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('runlists')
    .doc();

  const runlist = {
    name,
    description: description || null,
    siteId: siteId || null, // null = all sites
    status: RunlistStatus.DRAFT,
    startDate: startDate ? new Date(startDate) : new Date(),
    endDate: endDate ? new Date(endDate) : null,
    templateIds: templateIds || [],
    defaultAssigneeId: defaultAssigneeId || null,
    scheduleTime: scheduleTime || '08:00', // Default 8 AM
    timezone: runlistTimezone,
    notes: notes || null,
    lastGeneratedAt: null,
    nextGenerationAt: null,
    totalOccurrencesGenerated: 0,
    createdAt: FieldValue.serverTimestamp(),
    createdBy,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await runlistRef.set(runlist);

  return {
    id: runlistRef.id,
    ...runlist,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

/**
 * Get all runlists for a tenant
 */
const getRunlists = async (tenantId, options = {}) => {
  const { status, siteId, limit = 50 } = options;

  let query = db
    .collection('tenants')
    .doc(tenantId)
    .collection('runlists');

  if (status) {
    query = query.where('status', '==', status);
  } else {
    // Exclude archived by default
    query = query.where('status', 'in', [
      RunlistStatus.DRAFT,
      RunlistStatus.ACTIVE,
      RunlistStatus.PAUSED,
      RunlistStatus.COMPLETED,
    ]);
  }

  if (siteId) {
    query = query.where('siteId', '==', siteId);
  }

  const snapshot = await query.orderBy('createdAt', 'desc').limit(limit).get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

/**
 * Get a single runlist
 */
const getRunlist = async (tenantId, runlistId) => {
  const runlistDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('runlists')
    .doc(runlistId)
    .get();

  if (!runlistDoc.exists) {
    return null;
  }

  return {
    id: runlistDoc.id,
    ...runlistDoc.data(),
  };
};

/**
 * Update a runlist
 */
const updateRunlist = async (tenantId, runlistId, updates) => {
  const runlistRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('runlists')
    .doc(runlistId);

  // If updating name, check for duplicates
  if (updates.name) {
    const existing = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('runlists')
      .where('name', '==', updates.name)
      .where('status', 'in', [RunlistStatus.DRAFT, RunlistStatus.ACTIVE, RunlistStatus.PAUSED])
      .limit(1)
      .get();

    if (!existing.empty && existing.docs[0].id !== runlistId) {
      throw new Error(`Runlist with name "${updates.name}" already exists`);
    }
  }

  await runlistRef.update({
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return getRunlist(tenantId, runlistId);
};

/**
 * Activate a runlist
 */
const activateRunlist = async (tenantId, runlistId) => {
  return updateRunlist(tenantId, runlistId, {
    status: RunlistStatus.ACTIVE,
    nextGenerationAt: FieldValue.serverTimestamp(),
  });
};

/**
 * Pause a runlist
 */
const pauseRunlist = async (tenantId, runlistId) => {
  return updateRunlist(tenantId, runlistId, {
    status: RunlistStatus.PAUSED,
  });
};

/**
 * Archive a runlist
 */
const archiveRunlist = async (tenantId, runlistId) => {
  return updateRunlist(tenantId, runlistId, {
    status: RunlistStatus.ARCHIVED,
  });
};

/**
 * Add templates to a runlist
 */
const addTemplatesToRunlist = async (tenantId, runlistId, templateIds) => {
  const runlist = await getRunlist(tenantId, runlistId);
  if (!runlist) {
    throw new Error('Runlist not found');
  }

  const existingIds = runlist.templateIds || [];
  const newIds = [...new Set([...existingIds, ...templateIds])];

  return updateRunlist(tenantId, runlistId, {
    templateIds: newIds,
  });
};

/**
 * Remove templates from a runlist
 */
const removeTemplatesFromRunlist = async (tenantId, runlistId, templateIds) => {
  const runlist = await getRunlist(tenantId, runlistId);
  if (!runlist) {
    throw new Error('Runlist not found');
  }

  const existingIds = runlist.templateIds || [];
  const newIds = existingIds.filter((id) => !templateIds.includes(id));

  return updateRunlist(tenantId, runlistId, {
    templateIds: newIds,
  });
};

// ============================================
// TASK OCCURRENCE OPERATIONS
// ============================================

/**
 * Task occurrence statuses
 */
const TaskOccurrenceStatus = {
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  SKIPPED: 'SKIPPED',
  CANCELLED: 'CANCELLED',
  OVERDUE: 'OVERDUE',
};

/**
 * Create a task occurrence (generated from template)
 */
const createTaskOccurrence = async (tenantId, occurrenceData, createdBy) => {
  const {
    templateId,
    runlistId,
    siteId,
    scheduledDate,
    scheduledTime,
    dueDate,
    assignedToUserId,
    priority,
    notes,
    // Support both old and new field names
    animalGroupId,
    herdGroupIds,
    animalIds,
    selectedAnimalIds,
    inventoryItems,
    tools,
    linkedEventId,
    // Event fields (for major tasks)
    isEvent,
    eventType,
    totalCost,
    totalRevenue,
    inventoryUsed,
    inventoryReceived,
    labor,
    vendor,
    // Override name/description for ad-hoc tasks
    name: customName,
    description: customDescription,
    // Sort order for manual reordering
    sortOrder,
  } = occurrenceData;

  // Get template for defaults
  let template = null;
  if (templateId) {
    template = await getTaskTemplate(tenantId, templateId);
  }

  const occurrenceRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('taskOccurrences')
    .doc();

  const occurrence = {
    templateId: templateId || null,
    runlistId: runlistId || null,
    siteId: siteId || template?.siteIds?.[0] || null,
    name: customName || template?.name || 'Ad-hoc Task',
    description: customDescription || template?.description || null,
    category: template?.category || TaskCategory.OTHER,
    instructions: template?.instructions || null,
    status: TaskOccurrenceStatus.SCHEDULED,
    priority: priority || template?.priority || TaskPriority.MEDIUM,
    scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
    scheduledTime: scheduledTime || '08:00',
    dueDate: dueDate ? new Date(dueDate) : null,
    assignedToUserId: assignedToUserId || template?.defaultAssigneeId || null,
    estimatedDurationMinutes: template?.estimatedDurationMinutes || 30,
    actualDurationMinutes: null,
    notes: notes || null,
    // Support both old and new field names for backward compatibility
    herdGroupIds: herdGroupIds || (animalGroupId ? [animalGroupId] : template?.herdGroupIds || template?.animalGroupIds || []),
    selectedAnimalIds: selectedAnimalIds || animalIds || template?.selectedAnimalIds || [],
    inventoryItems: inventoryItems || template?.inventoryItems || template?.inventoryItemsNeeded || [],
    tools: tools || template?.tools || [],
    inventoryConsumed: [], // Filled in upon completion
    linkedEventId: linkedEventId || null,
    linkedEventType: template?.linkedEventType || null,
    // Event fields (for major tasks/events)
    isEvent: isEvent || false,
    eventType: eventType || null, // feeding, treatment, purchase, sale, maintenance, labor, breeding, birth, death, harvest, custom
    totalCost: totalCost || 0,
    totalRevenue: totalRevenue || 0,
    inventoryUsed: inventoryUsed || [], // [{itemId, itemName, quantity, unit, unitCost, totalCost}]
    inventoryReceived: inventoryReceived || [], // For purchases
    labor: labor || null, // {hours, rate, workerId, workerName, totalCost}
    vendor: vendor || null, // {name, invoiceNumber}
    posted: false,
    postedAt: null,
    ledgerTransactionId: null,
    // Sort order for manual reordering (null = use default ordering)
    sortOrder: sortOrder ?? null,
    // Standard fields
    startedAt: null,
    completedAt: null,
    completedBy: null,
    completionNotes: null,
    skippedReason: null,
    createdAt: FieldValue.serverTimestamp(),
    createdBy,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await occurrenceRef.set(occurrence);

  return {
    id: occurrenceRef.id,
    ...occurrence,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

/**
 * Get task occurrences with filters
 */
const getTaskOccurrences = async (tenantId, options = {}) => {
  const {
    status,
    siteId,
    assignedToUserId,
    runlistId,
    templateId,
    startDate,
    endDate,
    limit = 50,
    includeOverdue = true,
  } = options;

  let query = db
    .collection('tenants')
    .doc(tenantId)
    .collection('taskOccurrences');

  if (status) {
    query = query.where('status', '==', status);
  }

  if (siteId) {
    query = query.where('siteId', '==', siteId);
  }

  if (assignedToUserId) {
    query = query.where('assignedToUserId', '==', assignedToUserId);
  }

  if (runlistId) {
    query = query.where('runlistId', '==', runlistId);
  }

  if (templateId) {
    query = query.where('templateId', '==', templateId);
  }

  query = query.orderBy('scheduledDate', 'asc');

  if (startDate) {
    query = query.where('scheduledDate', '>=', new Date(startDate));
  }

  if (endDate) {
    query = query.where('scheduledDate', '<=', new Date(endDate));
  }

  query = query.limit(limit);

  const snapshot = await query.get();

  let occurrences = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Mark overdue tasks
  if (includeOverdue) {
    const now = new Date();
    occurrences = occurrences.map((occ) => {
      if (
        occ.status === TaskOccurrenceStatus.SCHEDULED &&
        occ.dueDate &&
        new Date(occ.dueDate.toDate ? occ.dueDate.toDate() : occ.dueDate) < now
      ) {
        return { ...occ, isOverdue: true };
      }
      return { ...occ, isOverdue: false };
    });
  }

  // Sort by sortOrder within each date (null sortOrders go last)
  occurrences.sort((a, b) => {
    const dateA = a.scheduledDate?.toDate ? a.scheduledDate.toDate() : new Date(a.scheduledDate);
    const dateB = b.scheduledDate?.toDate ? b.scheduledDate.toDate() : new Date(b.scheduledDate);
    const dateCompare = dateA - dateB;
    if (dateCompare !== 0) return dateCompare;
    const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
    return orderA - orderB;
  });

  return occurrences;
};

/**
 * Get a single task occurrence
 */
const getTaskOccurrence = async (tenantId, occurrenceId) => {
  const occDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('taskOccurrences')
    .doc(occurrenceId)
    .get();

  if (!occDoc.exists) {
    return null;
  }

  return {
    id: occDoc.id,
    ...occDoc.data(),
  };
};

/**
 * Update a task occurrence
 */
const updateTaskOccurrence = async (tenantId, occurrenceId, updates) => {
  const occRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('taskOccurrences')
    .doc(occurrenceId);

  await occRef.update({
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return getTaskOccurrence(tenantId, occurrenceId);
};

/**
 * Start a task (SCHEDULED -> IN_PROGRESS)
 */
const startTaskOccurrence = async (tenantId, occurrenceId, userId) => {
  const occurrence = await getTaskOccurrence(tenantId, occurrenceId);
  if (!occurrence) {
    throw new Error('Task occurrence not found');
  }

  if (occurrence.status !== TaskOccurrenceStatus.SCHEDULED) {
    throw new Error(`Cannot start task with status ${occurrence.status}`);
  }

  return updateTaskOccurrence(tenantId, occurrenceId, {
    status: TaskOccurrenceStatus.IN_PROGRESS,
    startedAt: FieldValue.serverTimestamp(),
    assignedToUserId: userId, // Take ownership
  });
};

/**
 * Complete a task (IN_PROGRESS -> COMPLETED)
 */
const completeTaskOccurrence = async (tenantId, occurrenceId, completionData, userId) => {
  const {
    notes,
    actualDurationMinutes,
    inventoryConsumed,
    // Event completion fields
    isEvent,
    eventType,
    totalCost,
    totalRevenue,
    inventoryUsed,
    inventoryReceived,
    labor,
    vendor,
  } = completionData;

  const occurrence = await getTaskOccurrence(tenantId, occurrenceId);
  if (!occurrence) {
    throw new Error('Task occurrence not found');
  }

  if (
    occurrence.status !== TaskOccurrenceStatus.IN_PROGRESS &&
    occurrence.status !== TaskOccurrenceStatus.SCHEDULED
  ) {
    throw new Error(`Cannot complete task with status ${occurrence.status}`);
  }

  // Calculate duration if started
  let duration = actualDurationMinutes;
  if (!duration && occurrence.startedAt) {
    const startTime = occurrence.startedAt.toDate
      ? occurrence.startedAt.toDate()
      : new Date(occurrence.startedAt);
    duration = Math.round((Date.now() - startTime.getTime()) / 60000);
  }

  // Build update object
  const updateData = {
    status: TaskOccurrenceStatus.COMPLETED,
    completedAt: FieldValue.serverTimestamp(),
    completedBy: userId,
    completionNotes: notes || null,
    actualDurationMinutes: duration || occurrence.estimatedDurationMinutes,
    inventoryConsumed: inventoryConsumed || [],
  };

  // Add event data if provided (can be added at creation or completion time)
  if (isEvent !== undefined) updateData.isEvent = isEvent;
  if (eventType !== undefined) updateData.eventType = eventType;
  if (totalCost !== undefined) updateData.totalCost = totalCost;
  if (totalRevenue !== undefined) updateData.totalRevenue = totalRevenue;
  if (inventoryUsed !== undefined) updateData.inventoryUsed = inventoryUsed;
  if (inventoryReceived !== undefined) updateData.inventoryReceived = inventoryReceived;
  if (labor !== undefined) updateData.labor = labor;
  if (vendor !== undefined) updateData.vendor = vendor;

  return updateTaskOccurrence(tenantId, occurrenceId, updateData);
};

/**
 * Skip a task
 */
const skipTaskOccurrence = async (tenantId, occurrenceId, reason, userId) => {
  const occurrence = await getTaskOccurrence(tenantId, occurrenceId);
  if (!occurrence) {
    throw new Error('Task occurrence not found');
  }

  if (
    occurrence.status !== TaskOccurrenceStatus.SCHEDULED &&
    occurrence.status !== TaskOccurrenceStatus.IN_PROGRESS
  ) {
    throw new Error(`Cannot skip task with status ${occurrence.status}`);
  }

  return updateTaskOccurrence(tenantId, occurrenceId, {
    status: TaskOccurrenceStatus.SKIPPED,
    skippedReason: reason || 'No reason provided',
    completedAt: FieldValue.serverTimestamp(),
    completedBy: userId,
  });
};

/**
 * Cancel a task
 */
const cancelTaskOccurrence = async (tenantId, occurrenceId, reason, userId) => {
  return updateTaskOccurrence(tenantId, occurrenceId, {
    status: TaskOccurrenceStatus.CANCELLED,
    skippedReason: reason || 'Cancelled',
    completedAt: FieldValue.serverTimestamp(),
    completedBy: userId,
  });
};

/**
 * Reassign a task
 */
const reassignTaskOccurrence = async (tenantId, occurrenceId, newAssigneeId) => {
  return updateTaskOccurrence(tenantId, occurrenceId, {
    assignedToUserId: newAssigneeId,
  });
};

/**
 * Reorder task occurrences (supports cross-group moves)
 * @param {string} tenantId
 * @param {string} scheduledDate - ISO date string (YYYY-MM-DD)
 * @param {Array<{id: string, sortOrder: number, runlistId: string|null}>} orderedTasks
 */
const reorderTaskOccurrences = async (tenantId, scheduledDate, orderedTasks) => {
  const batch = db.batch();

  for (const { id, sortOrder, runlistId } of orderedTasks) {
    const occRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('taskOccurrences')
      .doc(id);

    const updates = {
      sortOrder,
      updatedAt: FieldValue.serverTimestamp(),
    };

    // If runlistId is provided, update it (supports moving between groups)
    if (runlistId !== undefined) {
      updates.runlistId = runlistId;
    }

    batch.update(occRef, updates);
  }

  await batch.commit();

  return { success: true, updated: orderedTasks.length };
};

/**
 * Get task statistics for a tenant
 */
const getTaskStats = async (tenantId, options = {}) => {
  const { siteId, startDate, endDate, assignedToUserId } = options;

  let query = db
    .collection('tenants')
    .doc(tenantId)
    .collection('taskOccurrences');

  if (siteId) {
    query = query.where('siteId', '==', siteId);
  }

  if (assignedToUserId) {
    query = query.where('assignedToUserId', '==', assignedToUserId);
  }

  if (startDate) {
    query = query.where('scheduledDate', '>=', new Date(startDate));
  }

  if (endDate) {
    query = query.where('scheduledDate', '<=', new Date(endDate));
  }

  const snapshot = await query.get();

  const stats = {
    total: 0,
    byStatus: {},
    byCategory: {},
    byPriority: {},
    averageCompletionTime: 0,
    overdueCount: 0,
    completedOnTime: 0,
  };

  let totalCompletionTime = 0;
  let completedCount = 0;
  const now = new Date();

  snapshot.docs.forEach((doc) => {
    const task = doc.data();
    stats.total++;

    // By status
    stats.byStatus[task.status] = (stats.byStatus[task.status] || 0) + 1;

    // By category
    stats.byCategory[task.category] = (stats.byCategory[task.category] || 0) + 1;

    // By priority
    stats.byPriority[task.priority] = (stats.byPriority[task.priority] || 0) + 1;

    // Overdue check
    if (task.status === TaskOccurrenceStatus.SCHEDULED && task.dueDate) {
      const dueDate = task.dueDate.toDate ? task.dueDate.toDate() : new Date(task.dueDate);
      if (dueDate < now) {
        stats.overdueCount++;
      }
    }

    // Completion time calculation
    if (task.status === TaskOccurrenceStatus.COMPLETED && task.actualDurationMinutes) {
      totalCompletionTime += task.actualDurationMinutes;
      completedCount++;

      // Check if completed on time
      if (task.dueDate && task.completedAt) {
        const dueDate = task.dueDate.toDate ? task.dueDate.toDate() : new Date(task.dueDate);
        const completedAt = task.completedAt.toDate
          ? task.completedAt.toDate()
          : new Date(task.completedAt);
        if (completedAt <= dueDate) {
          stats.completedOnTime++;
        }
      }
    }
  });

  stats.averageCompletionTime =
    completedCount > 0 ? Math.round(totalCompletionTime / completedCount) : 0;

  return stats;
};

/**
 * Generate task occurrences for a single date from active runlists
 * This is the core generation logic for one day
 */
const generateTaskOccurrencesForSingleDate = async (tenantId, targetDate, runlist, createdBy) => {
  const generatedOccurrences = [];

  // Check if target date is within runlist range
  const startDate = runlist.startDate?.toDate
    ? runlist.startDate.toDate()
    : new Date(runlist.startDate);
  const endDate = runlist.endDate
    ? (runlist.endDate.toDate ? runlist.endDate.toDate() : new Date(runlist.endDate))
    : null;
  const target = new Date(targetDate);

  if (target < startDate || (endDate && target > endDate)) {
    return generatedOccurrences; // Outside runlist date range
  }

  // Get templates for this runlist
  const templateIds = runlist.templateIds || [];
  for (const templateId of templateIds) {
    const template = await getTaskTemplate(tenantId, templateId);
    if (!template || !template.active) continue;

    // Check if this template should generate for this date based on recurrence
    const shouldGenerate = checkRecurrenceMatch(template.recurrence, target, startDate);

    if (shouldGenerate) {
      // Normalize target date to start of day for comparison
      const startOfDay = new Date(target);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(target);
      endOfDay.setHours(23, 59, 59, 999);

      // Check if occurrence already exists for this date/template/runlist
      const existingOccurrence = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('taskOccurrences')
        .where('templateId', '==', templateId)
        .where('runlistId', '==', runlist.id)
        .where('scheduledDate', '>=', startOfDay)
        .where('scheduledDate', '<=', endOfDay)
        .limit(1)
        .get();

      if (existingOccurrence.empty) {
        // Normalize scheduled date to start of day
        const normalizedScheduledDate = new Date(target);
        normalizedScheduledDate.setHours(0, 0, 0, 0);

        // Calculate due date (end of day by default)
        const dueDate = new Date(target);
        dueDate.setHours(23, 59, 59, 999);

        const occurrence = await createTaskOccurrence(
          tenantId,
          {
            templateId,
            runlistId: runlist.id,
            siteId: runlist.siteId || template.siteIds?.[0] || null,
            scheduledDate: normalizedScheduledDate,
            scheduledTime: runlist.scheduleTime || '08:00',
            dueDate,
            assignedToUserId: runlist.defaultAssigneeId || template.defaultAssigneeId || null,
            priority: template.priority,
            // Support both old and new field names for backward compatibility
            herdGroupIds: template.herdGroupIds || template.animalGroupIds || [],
            selectedAnimalIds: template.selectedAnimalIds || [],
            inventoryItems: template.inventoryItems || template.inventoryItemsNeeded || [],
            tools: template.tools || [],
          },
          createdBy
        );

        generatedOccurrences.push(occurrence);
      }
    }
  }

  return generatedOccurrences;
};

/**
 * Generate task occurrences for a date range from active runlists
 * This catches up on ALL missed days, not just the target date
 * If tasks weren't generated for 4 days, it will create tasks for all 4 days
 */
const generateTaskOccurrencesForDate = async (tenantId, targetDate, createdBy) => {
  // Get all active runlists
  const activeRunlists = await getRunlists(tenantId, { status: RunlistStatus.ACTIVE });
  const generatedOccurrences = [];
  const target = new Date(targetDate);
  target.setHours(23, 59, 59, 999); // End of target day

  for (const runlist of activeRunlists) {
    // Determine the start date for generation
    // Use the later of: runlist start date, or day after last generation
    const runlistStartDate = runlist.startDate?.toDate
      ? runlist.startDate.toDate()
      : new Date(runlist.startDate);

    let generateFromDate;
    if (runlist.lastGeneratedAt) {
      // Start from the day AFTER last generation
      const lastGen = runlist.lastGeneratedAt.toDate
        ? runlist.lastGeneratedAt.toDate()
        : new Date(runlist.lastGeneratedAt);
      generateFromDate = new Date(lastGen);
      generateFromDate.setDate(generateFromDate.getDate() + 1);
      generateFromDate.setHours(0, 0, 0, 0);

      // But not before the runlist start date
      if (generateFromDate < runlistStartDate) {
        generateFromDate = new Date(runlistStartDate);
      }
    } else {
      // Never generated before, start from runlist start date
      generateFromDate = new Date(runlistStartDate);
    }
    generateFromDate.setHours(0, 0, 0, 0);

    // Don't generate for dates before the runlist start
    if (generateFromDate < runlistStartDate) {
      generateFromDate = new Date(runlistStartDate);
      generateFromDate.setHours(0, 0, 0, 0);
    }

    // Check if there's a date range to generate
    const targetStart = new Date(targetDate);
    targetStart.setHours(0, 0, 0, 0);

    if (generateFromDate > targetStart) {
      // Already generated up to or past target date
      continue;
    }

    // Generate for each day from generateFromDate to targetDate (inclusive)
    const currentDate = new Date(generateFromDate);
    let runlistOccurrencesCount = 0;

    while (currentDate <= targetStart) {
      const occurrences = await generateTaskOccurrencesForSingleDate(
        tenantId,
        currentDate,
        runlist,
        createdBy
      );
      generatedOccurrences.push(...occurrences);
      runlistOccurrencesCount += occurrences.length;

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Update runlist generation tracking
    if (runlistOccurrencesCount > 0 || generateFromDate <= targetStart) {
      await updateRunlist(tenantId, runlist.id, {
        lastGeneratedAt: FieldValue.serverTimestamp(),
        totalOccurrencesGenerated: FieldValue.increment(runlistOccurrencesCount),
      });
    }
  }

  return generatedOccurrences;
};

/**
 * Check if a recurrence pattern matches a target date
 */
const checkRecurrenceMatch = (recurrence, targetDate, startDate) => {
  if (!recurrence) return true; // No recurrence = generate once

  const pattern = recurrence.pattern || RecurrencePattern.ONCE;
  const interval = recurrence.interval || 1;
  const target = new Date(targetDate);
  const start = new Date(startDate);

  // Reset time components for date comparison
  target.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);

  switch (pattern) {
    case RecurrencePattern.ONCE:
      // Only match the start date
      return target.getTime() === start.getTime();

    case RecurrencePattern.DAILY: {
      const daysDiff = Math.floor((target - start) / (1000 * 60 * 60 * 24));
      return daysDiff >= 0 && daysDiff % interval === 0;
    }

    case RecurrencePattern.WEEKLY: {
      const dayOfWeek = target.getDay();
      const daysOfWeek = recurrence.daysOfWeek || [start.getDay()];

      // Check if target day is in daysOfWeek
      if (!daysOfWeek.includes(dayOfWeek)) return false;

      // Check interval (weeks since start)
      const weeksDiff = Math.floor((target - start) / (1000 * 60 * 60 * 24 * 7));
      return weeksDiff >= 0 && weeksDiff % interval === 0;
    }

    case RecurrencePattern.BIWEEKLY: {
      const dayOfWeek = target.getDay();
      const daysOfWeek = recurrence.daysOfWeek || [start.getDay()];

      if (!daysOfWeek.includes(dayOfWeek)) return false;

      const weeksDiff = Math.floor((target - start) / (1000 * 60 * 60 * 24 * 7));
      return weeksDiff >= 0 && weeksDiff % 2 === 0;
    }

    case RecurrencePattern.MONTHLY: {
      const dayOfMonth = recurrence.dayOfMonth || start.getDate();
      if (target.getDate() !== dayOfMonth) return false;

      // Handle months where dayOfMonth doesn't exist (e.g., Feb 30)
      const targetMonth = target.getMonth();
      const startMonth = start.getMonth();
      const monthsDiff =
        (target.getFullYear() - start.getFullYear()) * 12 + (targetMonth - startMonth);
      return monthsDiff >= 0 && monthsDiff % interval === 0;
    }

    case RecurrencePattern.QUARTERLY: {
      const dayOfMonth = recurrence.dayOfMonth || start.getDate();
      if (target.getDate() !== dayOfMonth) return false;

      const targetMonth = target.getMonth();
      const startMonth = start.getMonth();
      const monthsDiff =
        (target.getFullYear() - start.getFullYear()) * 12 + (targetMonth - startMonth);
      return monthsDiff >= 0 && monthsDiff % 3 === 0;
    }

    case RecurrencePattern.YEARLY: {
      const monthOfYear = recurrence.monthOfYear ?? start.getMonth();
      const dayOfMonth = recurrence.dayOfMonth || start.getDate();

      if (target.getMonth() !== monthOfYear || target.getDate() !== dayOfMonth) {
        return false;
      }

      const yearsDiff = target.getFullYear() - start.getFullYear();
      return yearsDiff >= 0 && yearsDiff % interval === 0;
    }

    case RecurrencePattern.CUSTOM:
      // Custom patterns handled by specific logic in the runlist
      return false;

    default:
      return false;
  }
};

/**
 * Get upcoming tasks for a user (dashboard view)
 */
const getUpcomingTasks = async (tenantId, userId, options = {}) => {
  const { daysAhead = 7, limit = 20 } = options;

  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + daysAhead);
  endDate.setHours(23, 59, 59, 999);

  const tasks = await getTaskOccurrences(tenantId, {
    assignedToUserId: userId,
    status: TaskOccurrenceStatus.SCHEDULED,
    startDate,
    endDate,
    limit,
  });

  return tasks;
};

/**
 * Get today's tasks for a site
 */
const getTodaysTasks = async (tenantId, options = {}) => {
  const { siteId, assignedToUserId } = options;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return getTaskOccurrences(tenantId, {
    siteId,
    assignedToUserId,
    startDate: today,
    endDate: tomorrow,
    limit: 100,
  });
};

// ============================================
// ASSET REGISTRY OPERATIONS
// ============================================

/**
 * Get assets for a tenant with optional filters
 */
const getAssets = async (tenantId, options = {}) => {
  const { assetType, siteId, status, skipOrder = false } = options;

  let query = db.collection('tenants').doc(tenantId).collection('assets');

  if (assetType) {
    query = query.where('assetType', '==', assetType);
  }

  if (siteId) {
    query = query.where('siteId', '==', siteId);
  }

  if (status) {
    query = query.where('status', '==', status);
  }

  // Only add orderBy if not skipping (requires composite indexes)
  if (!skipOrder) {
    query = query.orderBy('updatedAt', 'desc');
  }

  const snapshot = await query.get();

  let results = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Sort client-side if we skipped orderBy
  if (skipOrder) {
    results.sort((a, b) => {
      const aTime = a.updatedAt?.toDate?.() || a.updatedAt || 0;
      const bTime = b.updatedAt?.toDate?.() || b.updatedAt || 0;
      return bTime - aTime;
    });
  }

  return results;
};

/**
 * Get a single asset
 */
const getAsset = async (tenantId, assetId) => {
  const assetDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('assets')
    .doc(assetId)
    .get();

  if (!assetDoc.exists) {
    return null;
  }

  return {
    id: assetDoc.id,
    ...assetDoc.data(),
  };
};

/**
 * Create a new asset
 */
const createAsset = async (tenantId, assetData) => {
  const assetRef = db.collection('tenants').doc(tenantId).collection('assets').doc();

  const asset = {
    ...assetData,
    tenantId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await assetRef.set(asset);

  return {
    id: assetRef.id,
    ...asset,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

/**
 * Update an asset
 */
const updateAsset = async (tenantId, assetId, updates) => {
  const assetRef = db.collection('tenants').doc(tenantId).collection('assets').doc(assetId);

  // Remove undefined values
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, v]) => v !== undefined)
  );

  await assetRef.update({
    ...cleanUpdates,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return getAsset(tenantId, assetId);
};

/**
 * Get recently updated assets
 */
const getRecentAssets = async (tenantId, options = {}) => {
  const { siteId, limit = 10 } = options;

  let query = db.collection('tenants').doc(tenantId).collection('assets');

  // When filtering by siteId, we need a composite index. Use client-side sorting instead.
  if (siteId) {
    query = query.where('siteId', '==', siteId);
    const snapshot = await query.get();

    let results = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Sort client-side and limit
    results.sort((a, b) => {
      const aTime = a.updatedAt?.toDate?.() || a.updatedAt || 0;
      const bTime = b.updatedAt?.toDate?.() || b.updatedAt || 0;
      return bTime - aTime;
    });

    return results.slice(0, parseInt(limit));
  }

  // Without siteId filter, we can use orderBy directly
  const snapshot = await query
    .orderBy('updatedAt', 'desc')
    .limit(parseInt(limit))
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
};

/**
 * Search assets by name, identifier, or tags
 */
const searchAssets = async (tenantId, options = {}) => {
  const { query: searchQuery, siteId, limit = 20 } = options;

  if (!searchQuery || searchQuery.length < 2) {
    return [];
  }

  const searchLower = searchQuery.toLowerCase();

  // Get all assets and filter client-side (Firestore doesn't support full-text search)
  let query = db.collection('tenants').doc(tenantId).collection('assets');

  if (siteId) {
    query = query.where('siteId', '==', siteId);
  }

  const snapshot = await query.get();

  const results = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(asset =>
      asset.name?.toLowerCase().includes(searchLower) ||
      asset.identifier?.toLowerCase().includes(searchLower) ||
      (asset.tags || []).some(tag => tag.toLowerCase().includes(searchLower))
    )
    .slice(0, parseInt(limit));

  return results;
};

// ============================================
// VEHICLE OPERATIONS
// ============================================

/**
 * Get vehicles for a tenant with optional filters
 */
const getVehicles = async (tenantId, options = {}) => {
  const { siteId, status, vehicleType } = options;

  let query = db.collection('tenants').doc(tenantId).collection('vehicles');

  // Firestore requires composite indexes for where + orderBy
  // Use client-side sorting to avoid index requirements
  if (siteId) {
    query = query.where('siteId', '==', siteId);
  }

  if (vehicleType) {
    query = query.where('vehicleType', '==', vehicleType);
  }

  const snapshot = await query.get();

  let vehicles = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Sort by createdAt client-side
  vehicles.sort((a, b) => {
    const aTime = a.createdAt?.toDate?.() || a.createdAt || 0;
    const bTime = b.createdAt?.toDate?.() || b.createdAt || 0;
    return bTime - aTime;
  });

  // Filter by status if provided
  if (status) {
    vehicles = vehicles.filter(v => v.status === status);
  }

  return vehicles;
};

/**
 * Get a single vehicle
 */
const getVehicle = async (tenantId, vehicleId) => {
  const vehicleDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('vehicles')
    .doc(vehicleId)
    .get();

  if (!vehicleDoc.exists) {
    return null;
  }

  return {
    id: vehicleDoc.id,
    ...vehicleDoc.data(),
  };
};

/**
 * Create a vehicle with its asset record atomically
 */
const createVehicleWithAsset = async (tenantId, { asset: assetData, vehicle: vehicleData }) => {
  const batch = db.batch();

  // Generate ID for both (same ID)
  const assetRef = db.collection('tenants').doc(tenantId).collection('assets').doc();
  const vehicleRef = db.collection('tenants').doc(tenantId).collection('vehicles').doc(assetRef.id);

  // Create asset
  const asset = {
    ...assetData,
    tenantId,
    assetType: 'VEHICLE',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  batch.set(assetRef, asset);

  // Create vehicle
  const vehicle = {
    ...vehicleData,
    tenantId,
    assetId: assetRef.id,
    status: assetData.status || 'ACTIVE',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  batch.set(vehicleRef, vehicle);

  await batch.commit();

  return {
    assetId: assetRef.id,
    vehicleId: assetRef.id,
    asset: { id: assetRef.id, ...asset },
    vehicle: { id: assetRef.id, ...vehicle },
  };
};

/**
 * Update a vehicle record
 */
const updateVehicle = async (tenantId, vehicleId, updates) => {
  const vehicleRef = db.collection('tenants').doc(tenantId).collection('vehicles').doc(vehicleId);

  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, v]) => v !== undefined)
  );

  await vehicleRef.update({
    ...cleanUpdates,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return getVehicle(tenantId, vehicleId);
};

/**
 * Update a vehicle and its asset record atomically
 */
const updateVehicleWithAsset = async (tenantId, vehicleId, { asset: assetUpdates, vehicle: vehicleUpdates }) => {
  const batch = db.batch();

  // Get vehicle to find asset ID
  const existingVehicle = await getVehicle(tenantId, vehicleId);
  if (!existingVehicle) {
    throw new Error('Vehicle not found');
  }

  const assetId = existingVehicle.assetId || vehicleId;

  // Update asset
  if (assetUpdates && Object.keys(assetUpdates).length > 0) {
    const assetRef = db.collection('tenants').doc(tenantId).collection('assets').doc(assetId);
    const cleanAssetUpdates = Object.fromEntries(
      Object.entries(assetUpdates).filter(([_, v]) => v !== undefined)
    );
    batch.update(assetRef, {
      ...cleanAssetUpdates,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  // Update vehicle
  if (vehicleUpdates && Object.keys(vehicleUpdates).length > 0) {
    const vehicleRef = db.collection('tenants').doc(tenantId).collection('vehicles').doc(vehicleId);
    const cleanVehicleUpdates = Object.fromEntries(
      Object.entries(vehicleUpdates).filter(([_, v]) => v !== undefined)
    );
    batch.update(vehicleRef, {
      ...cleanVehicleUpdates,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();

  return {
    asset: await getAsset(tenantId, assetId),
    vehicle: await getVehicle(tenantId, vehicleId),
  };
};

// ============================================
// LAND TRACTS OPERATIONS
// ============================================

/**
 * Land tract types
 */
const LandType = {
  PARCEL: 'PARCEL',
  FIELD: 'FIELD',
  PASTURE: 'PASTURE',
  INFRASTRUCTURE: 'INFRASTRUCTURE',
  OTHER: 'OTHER',
};

/**
 * Get land tracts for a tenant with optional filters
 */
const getLandTracts = async (tenantId, options = {}) => {
  const { siteId, type, status = 'active' } = options;

  let query = db.collection('tenants').doc(tenantId).collection('landTracts');

  if (siteId) {
    query = query.where('siteId', '==', siteId);
  }

  if (type) {
    query = query.where('type', '==', type);
  }

  if (status) {
    query = query.where('status', '==', status);
  }

  const snapshot = await query.get();

  let results = snapshot.docs.map(doc => {
    const data = doc.data();
    // Parse geometryJson back to geometry object
    if (data.geometryJson) {
      data.geometry = JSON.parse(data.geometryJson);
      delete data.geometryJson;
    }
    return {
      id: doc.id,
      ...data,
    };
  });

  // Sort by name client-side
  results.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  return results;
};

/**
 * Get a single land tract
 */
const getLandTract = async (tenantId, tractId) => {
  const tractDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('landTracts')
    .doc(tractId)
    .get();

  if (!tractDoc.exists) {
    return null;
  }

  const data = tractDoc.data();

  // Parse geometryJson back to geometry object
  if (data.geometryJson) {
    data.geometry = JSON.parse(data.geometryJson);
    delete data.geometryJson;
  }

  return {
    id: tractDoc.id,
    ...data,
  };
};

/**
 * Create a new land tract
 */
const createLandTract = async (tenantId, tractData) => {
  const tractRef = db.collection('tenants').doc(tenantId).collection('landTracts').doc();

  // Remove undefined values to prevent Firestore errors
  const cleanTractData = Object.fromEntries(
    Object.entries(tractData).filter(([_, v]) => v !== undefined)
  );

  // Firestore doesn't support deeply nested arrays, so store geometry as JSON string
  let geometryForResponse = null;
  if (cleanTractData.geometry) {
    geometryForResponse = cleanTractData.geometry;
    cleanTractData.geometryJson = JSON.stringify(cleanTractData.geometry);
    delete cleanTractData.geometry;
  }

  const tract = {
    ...cleanTractData,
    tenantId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await tractRef.set(tract);

  return {
    id: tractRef.id,
    ...tract,
    geometry: geometryForResponse, // Return parsed geometry
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

/**
 * Update a land tract
 */
const updateLandTract = async (tenantId, tractId, updates) => {
  const tractRef = db.collection('tenants').doc(tenantId).collection('landTracts').doc(tractId);

  // Remove undefined values
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, v]) => v !== undefined)
  );

  // Convert geometry to JSON string if provided
  if (cleanUpdates.geometry) {
    cleanUpdates.geometryJson = JSON.stringify(cleanUpdates.geometry);
    delete cleanUpdates.geometry;
  }

  await tractRef.update({
    ...cleanUpdates,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return getLandTract(tenantId, tractId);
};

/**
 * Get land tract statistics
 */
const getLandTractStats = async (tenantId, options = {}) => {
  const { siteId } = options;

  let query = db.collection('tenants').doc(tenantId).collection('landTracts');

  if (siteId) {
    query = query.where('siteId', '==', siteId);
  }

  const snapshot = await query.get();

  const stats = {
    total: 0,
    active: 0,
    archived: 0,
    totalAcres: 0,
    byType: {},
  };

  // Initialize byType
  Object.values(LandType).forEach(type => {
    stats.byType[type] = { count: 0, acres: 0 };
  });

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    stats.total++;

    if (data.status === 'active') {
      stats.active++;
      stats.totalAcres += data.areaAcres || 0;

      if (data.type && stats.byType[data.type]) {
        stats.byType[data.type].count++;
        stats.byType[data.type].acres += data.areaAcres || 0;
      }
    } else {
      stats.archived++;
    }
  });

  // Round acres
  stats.totalAcres = Math.round(stats.totalAcres * 100) / 100;
  Object.values(stats.byType).forEach(t => {
    t.acres = Math.round(t.acres * 100) / 100;
  });

  return stats;
};

// ============================================================================
// STRUCTURES
// ============================================================================

/**
 * Structure types
 */
const StructureType = {
  BARN: 'BARN',
  SHOP: 'SHOP',
  SHED: 'SHED',
  GARAGE: 'GARAGE',
  GREENHOUSE: 'GREENHOUSE',
  COOP: 'COOP',
  HOUSE: 'HOUSE',
  CONTAINER: 'CONTAINER',
  OTHER: 'OTHER',
};

/**
 * Get structures for a tenant
 * @param {string} tenantId
 * @param {object} options - { landTractId, isActive }
 */
const getStructures = async (tenantId, options = {}) => {
  const { landTractId, isActive = true } = options;

  let query = db.collection('tenants').doc(tenantId).collection('structures');

  if (landTractId) {
    query = query.where('landTractId', '==', landTractId);
  }

  if (isActive !== undefined && isActive !== null) {
    query = query.where('isActive', '==', isActive);
  }

  const snapshot = await query.get();

  let results = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Sort by name client-side
  results.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  return results;
};

/**
 * Get a single structure
 */
const getStructure = async (tenantId, structureId) => {
  const structureDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('structures')
    .doc(structureId)
    .get();

  if (!structureDoc.exists) {
    return null;
  }

  return {
    id: structureDoc.id,
    ...structureDoc.data(),
  };
};

/**
 * Create a new structure
 */
const createStructure = async (tenantId, structureData) => {
  const structureRef = db.collection('tenants').doc(tenantId).collection('structures').doc();

  // Remove undefined values to prevent Firestore errors
  const cleanData = Object.fromEntries(
    Object.entries(structureData).filter(([_, v]) => v !== undefined)
  );

  const structure = {
    ...cleanData,
    tenantId,
    isActive: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await structureRef.set(structure);

  return {
    id: structureRef.id,
    ...structure,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

/**
 * Update a structure
 */
const updateStructure = async (tenantId, structureId, updates) => {
  const structureRef = db.collection('tenants').doc(tenantId).collection('structures').doc(structureId);

  // Remove undefined values
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, v]) => v !== undefined)
  );

  await structureRef.update({
    ...cleanUpdates,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return getStructure(tenantId, structureId);
};

/**
 * Soft delete a structure and cascade to its areas and bins
 */
const deleteStructure = async (tenantId, structureId) => {
  const batch = db.batch();

  // Soft delete the structure
  const structureRef = db.collection('tenants').doc(tenantId).collection('structures').doc(structureId);
  batch.update(structureRef, {
    isActive: false,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Find and soft delete all areas for this structure
  const areasSnapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('areas')
    .where('structureId', '==', structureId)
    .where('isActive', '==', true)
    .get();

  areasSnapshot.docs.forEach(doc => {
    batch.update(doc.ref, {
      isActive: false,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  // Find and soft delete all bins for this structure
  const binsSnapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('bins')
    .where('structureId', '==', structureId)
    .where('isActive', '==', true)
    .get();

  binsSnapshot.docs.forEach(doc => {
    batch.update(doc.ref, {
      isActive: false,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();

  return { deleted: true, areasAffected: areasSnapshot.size, binsAffected: binsSnapshot.size };
};

// ============================================================================
// AREAS
// ============================================================================

/**
 * Get areas for a structure
 * @param {string} tenantId
 * @param {object} options - { structureId, isActive }
 */
const getAreas = async (tenantId, options = {}) => {
  const { structureId, isActive = true } = options;

  let query = db.collection('tenants').doc(tenantId).collection('areas');

  if (structureId) {
    query = query.where('structureId', '==', structureId);
  }

  if (isActive !== undefined && isActive !== null) {
    query = query.where('isActive', '==', isActive);
  }

  const snapshot = await query.get();

  let results = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Sort by sortOrder, then name
  results.sort((a, b) => {
    const orderDiff = (a.sortOrder || 0) - (b.sortOrder || 0);
    if (orderDiff !== 0) return orderDiff;
    return (a.name || '').localeCompare(b.name || '');
  });

  return results;
};

/**
 * Get a single area
 */
const getArea = async (tenantId, areaId) => {
  const areaDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('areas')
    .doc(areaId)
    .get();

  if (!areaDoc.exists) {
    return null;
  }

  return {
    id: areaDoc.id,
    ...areaDoc.data(),
  };
};

/**
 * Create a new area
 */
const createArea = async (tenantId, areaData) => {
  const areaRef = db.collection('tenants').doc(tenantId).collection('areas').doc();

  // Remove undefined values to prevent Firestore errors
  const cleanData = Object.fromEntries(
    Object.entries(areaData).filter(([_, v]) => v !== undefined)
  );

  const area = {
    ...cleanData,
    tenantId,
    sortOrder: cleanData.sortOrder || 0,
    isActive: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await areaRef.set(area);

  return {
    id: areaRef.id,
    ...area,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

/**
 * Update an area
 */
const updateArea = async (tenantId, areaId, updates) => {
  const areaRef = db.collection('tenants').doc(tenantId).collection('areas').doc(areaId);

  // Remove undefined values
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, v]) => v !== undefined)
  );

  await areaRef.update({
    ...cleanUpdates,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return getArea(tenantId, areaId);
};

/**
 * Soft delete an area and cascade to bins
 */
const deleteArea = async (tenantId, areaId) => {
  const batch = db.batch();

  // Soft delete the area
  const areaRef = db.collection('tenants').doc(tenantId).collection('areas').doc(areaId);
  batch.update(areaRef, {
    isActive: false,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Find and soft delete all bins for this area
  const binsSnapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('bins')
    .where('areaId', '==', areaId)
    .where('isActive', '==', true)
    .get();

  binsSnapshot.docs.forEach(doc => {
    batch.update(doc.ref, {
      isActive: false,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();

  return { deleted: true, binsAffected: binsSnapshot.size };
};

// ============================================================================
// BINS (Storage Locations)
// ============================================================================

/**
 * Bin types - represent different storage location types
 */
const BinType = {
  SHELF: 'SHELF',
  DRAWER: 'DRAWER',
  TOTE: 'TOTE',
  PALLET: 'PALLET',
  RACK: 'RACK',
  HOOK: 'HOOK',
  FLOOR: 'FLOOR',
  CABINET: 'CABINET',
  TOOLBOX: 'TOOLBOX',
  MOBILE: 'MOBILE',
  OTHER: 'OTHER',
};

/**
 * Validate and normalize bin code
 * - Uppercase, trim, replace spaces with hyphens
 * - Allow alphanumeric with hyphens
 */
const normalizeBinCode = (code) => {
  if (!code) return null;
  return code
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9-]/g, '')
    .substring(0, 30);
};

/**
 * Check if a bin code is unique within the tenant
 */
const isBinCodeUnique = async (tenantId, code, excludeBinId = null) => {
  const normalizedCode = normalizeBinCode(code);
  if (!normalizedCode) return false;

  let query = db
    .collection('tenants')
    .doc(tenantId)
    .collection('bins')
    .where('code', '==', normalizedCode)
    .where('isActive', '==', true);

  const snapshot = await query.get();

  if (snapshot.empty) return true;

  // If we're updating, check if the only match is the current bin
  if (excludeBinId) {
    return snapshot.docs.every(doc => doc.id === excludeBinId);
  }

  return false;
};

/**
 * Get bins for a tenant with filtering options
 * @param {string} tenantId
 * @param {object} options - { structureId, areaId, isActive, includeDeleted }
 */
const getBins = async (tenantId, options = {}) => {
  const { structureId, areaId, isActive = true, includeDeleted = false } = options;

  let query = db.collection('tenants').doc(tenantId).collection('bins');

  if (structureId) {
    query = query.where('structureId', '==', structureId);
  }

  if (areaId !== undefined) {
    // Allow filtering for structure-level bins (areaId = null)
    query = query.where('areaId', '==', areaId);
  }

  if (!includeDeleted && isActive !== undefined && isActive !== null) {
    query = query.where('isActive', '==', isActive);
  }

  const snapshot = await query.get();

  let results = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Sort by code, then name
  results.sort((a, b) => {
    const codeCmp = (a.code || '').localeCompare(b.code || '');
    if (codeCmp !== 0) return codeCmp;
    return (a.name || '').localeCompare(b.name || '');
  });

  return results;
};

/**
 * Get a single bin
 */
const getBin = async (tenantId, binId) => {
  const binDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('bins')
    .doc(binId)
    .get();

  if (!binDoc.exists) {
    return null;
  }

  return {
    id: binDoc.id,
    ...binDoc.data(),
  };
};

/**
 * Create a new bin
 * @param {string} tenantId
 * @param {object} binData - { structureId, areaId?, landTractId, name, code, type?, notes?, capacity? }
 */
const createBin = async (tenantId, binData) => {
  const { structureId, areaId, landTractId, name, code, type, notes, capacity } = binData;

  // Validate required fields
  if (!structureId) {
    throw new Error('Structure ID is required');
  }
  if (!name || !name.trim()) {
    throw new Error('Bin name is required');
  }
  if (!code) {
    throw new Error('Bin code is required');
  }

  // Normalize and validate code
  const normalizedCode = normalizeBinCode(code);
  if (!normalizedCode || normalizedCode.length < 2) {
    throw new Error('Bin code must be at least 2 characters (alphanumeric and hyphens only)');
  }

  // Check code uniqueness
  const isUnique = await isBinCodeUnique(tenantId, normalizedCode);
  if (!isUnique) {
    throw new Error(`Bin code "${normalizedCode}" already exists`);
  }

  // Verify structure exists
  const structure = await getStructure(tenantId, structureId);
  if (!structure) {
    throw new Error('Structure not found');
  }

  // If areaId provided, verify it belongs to the structure
  if (areaId) {
    const area = await getArea(tenantId, areaId);
    if (!area) {
      throw new Error('Area not found');
    }
    if (area.structureId !== structureId) {
      throw new Error('Area does not belong to the specified structure');
    }
  }

  // Use structure's landTractId if not provided
  const finalLandTractId = landTractId || structure.landTractId;

  const binRef = db.collection('tenants').doc(tenantId).collection('bins').doc();

  const bin = {
    tenantId,
    structureId,
    areaId: areaId || null,
    landTractId: finalLandTractId,
    name: name.trim(),
    code: normalizedCode,
    type: type || null,
    notes: notes || null,
    capacity: capacity || null,
    isActive: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await binRef.set(bin);

  return {
    id: binRef.id,
    ...bin,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

/**
 * Update a bin
 */
const updateBin = async (tenantId, binId, updates) => {
  const { code, areaId, structureId, ...otherUpdates } = updates;

  // If code is being updated, validate and check uniqueness
  let normalizedCode;
  if (code !== undefined) {
    normalizedCode = normalizeBinCode(code);
    if (!normalizedCode || normalizedCode.length < 2) {
      throw new Error('Bin code must be at least 2 characters (alphanumeric and hyphens only)');
    }
    const isUnique = await isBinCodeUnique(tenantId, normalizedCode, binId);
    if (!isUnique) {
      throw new Error(`Bin code "${normalizedCode}" already exists`);
    }
  }

  // If areaId is being updated, verify it belongs to the bin's structure
  if (areaId !== undefined && areaId !== null) {
    const bin = await getBin(tenantId, binId);
    if (!bin) {
      throw new Error('Bin not found');
    }
    const targetStructureId = structureId || bin.structureId;
    const area = await getArea(tenantId, areaId);
    if (!area) {
      throw new Error('Area not found');
    }
    if (area.structureId !== targetStructureId) {
      throw new Error('Area does not belong to the specified structure');
    }
  }

  const binRef = db.collection('tenants').doc(tenantId).collection('bins').doc(binId);

  // Build clean updates
  const cleanUpdates = {};
  if (normalizedCode) cleanUpdates.code = normalizedCode;
  if (areaId !== undefined) cleanUpdates.areaId = areaId;
  if (structureId !== undefined) cleanUpdates.structureId = structureId;

  // Add other updates, filtering undefined values
  Object.entries(otherUpdates).forEach(([key, value]) => {
    if (value !== undefined) {
      cleanUpdates[key] = value;
    }
  });

  await binRef.update({
    ...cleanUpdates,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return getBin(tenantId, binId);
};

/**
 * Soft delete a bin
 */
const deleteBin = async (tenantId, binId) => {
  const binRef = db.collection('tenants').doc(tenantId).collection('bins').doc(binId);

  await binRef.update({
    isActive: false,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { deleted: true };
};

/**
 * Get bins count by structure
 */
const getBinsCountByStructure = async (tenantId, structureId) => {
  const snapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('bins')
    .where('structureId', '==', structureId)
    .where('isActive', '==', true)
    .get();

  return snapshot.size;
};

module.exports = {
  // Tenant
  createTenant,
  getTenant,
  updateTenant,

  // User
  upsertUser,
  getUser,
  findUserByAuthUid,

  // Site
  createSite,
  getSites,
  getSite,
  updateSite,

  // Event
  EventStatus,
  createEvent,
  getEvent,
  acquireEventLock,
  markEventPosted,
  markEventFailed,
  releaseEventLock,

  // Inventory Items (Master Catalog)
  InventoryCategory,
  createInventoryItem,
  getInventoryItems,
  getInventoryItem,
  getInventoryItemBySku,
  updateInventoryItem,

  // Site Inventory (Balances)
  getSiteInventoryBalance,
  getSiteInventory,
  updateSiteInventoryBalance,

  // Inventory Movements
  MovementType,
  recordInventoryMovement,
  getInventoryMovements,

  // Purchase Requisitions
  RequisitionStatus,
  createPurchaseRequisition,
  getPurchaseRequisitions,
  updateRequisitionStatus,
  checkReorderNeeded,

  // Livestock - Enums
  AnimalSpecies,
  AnimalStatus,
  AnimalGroupType,

  // Livestock - Animal Groups
  createAnimalGroup,
  getAnimalGroups,
  getAnimalGroup,
  updateAnimalGroup,
  updateGroupCostBasis,
  updateGroupAnimalCount,

  // Livestock - Animals
  createAnimal,
  getAnimals,
  getAnimal,
  updateAnimal,
  updateAnimalStatus,
  getAnimalStats,
  bulkMoveAnimals,

  // Tasks - Enums
  TaskPriority,
  TaskCategory,
  RecurrencePattern,

  // Task Templates
  createTaskTemplate,
  getTaskTemplates,
  getTaskTemplate,
  updateTaskTemplate,
  deleteTaskTemplate,

  // Runlists
  RunlistStatus,
  createRunlist,
  getRunlists,
  getRunlist,
  updateRunlist,
  activateRunlist,
  pauseRunlist,
  archiveRunlist,
  addTemplatesToRunlist,
  removeTemplatesFromRunlist,

  // Task Occurrences
  TaskOccurrenceStatus,
  createTaskOccurrence,
  getTaskOccurrences,
  getTaskOccurrence,
  updateTaskOccurrence,
  startTaskOccurrence,
  completeTaskOccurrence,
  skipTaskOccurrence,
  cancelTaskOccurrence,
  reassignTaskOccurrence,
  reorderTaskOccurrences,
  getTaskStats,

  // Task Generation
  generateTaskOccurrencesForDate,
  checkRecurrenceMatch,
  getUpcomingTasks,
  getTodaysTasks,

  // Assets
  getAssets,
  getAsset,
  createAsset,
  updateAsset,
  getRecentAssets,
  searchAssets,

  // Vehicles
  getVehicles,
  getVehicle,
  createVehicleWithAsset,
  updateVehicle,
  updateVehicleWithAsset,

  // Land Tracts
  LandType,
  getLandTracts,
  getLandTract,
  createLandTract,
  updateLandTract,
  getLandTractStats,

  // Structures
  StructureType,
  getStructures,
  getStructure,
  createStructure,
  updateStructure,
  deleteStructure,

  // Areas
  getAreas,
  getArea,
  createArea,
  updateArea,
  deleteArea,

  // Bins
  BinType,
  getBins,
  getBin,
  createBin,
  updateBin,
  deleteBin,
  getBinsCountByStructure,
  isBinCodeUnique,
};
