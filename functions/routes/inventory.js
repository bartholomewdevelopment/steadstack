const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { verifyToken } = require('../middleware/auth');
const { checkPlanLimit, incrementUsageAfterCreate } = require('../middleware/planLimits');
const firestoreService = require('../services/firestore');
const accountingService = require('../services/accounting');
const { v4: uuidv4 } = require('uuid');
const { Site } = require('../models');

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// ============================================
// INVENTORY ITEMS (Master Catalog)
// ============================================

/**
 * GET /api/inventory/items
 * List all inventory items for the tenant with aggregated site quantities
 */
router.get('/items', async (req, res) => {
  try {
    const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
    if (!userData) {
      return res.status(403).json({ success: false, message: 'User not found' });
    }

    const { category, activeOnly, includeSiteQty, siteId, page = 1, limit = 50 } = req.query;
    const { tenantId } = userData;

    const items = await firestoreService.getInventoryItems(tenantId, {
      category,
      activeOnly: activeOnly !== 'false',
    });

    // Always include aggregated quantities (unless explicitly disabled)
    if (includeSiteQty !== 'false') {
      // Get sites from MongoDB (req.user.tenantId is MongoDB ObjectId)
      const mongoTenantId = req.user?.tenantId?._id || req.user?.tenantId;
      const sites = mongoTenantId
        ? await Site.find({ tenantId: mongoTenantId, status: { $ne: 'archived' } }).lean()
        : [];

      for (const item of items) {
        let totalQtyOnHand = 0;
        let totalValue = 0;
        const siteBalances = [];

        if (siteId) {
          // If siteId provided, get balance for that specific site only
          const balance = await firestoreService.getSiteInventoryBalance(tenantId, siteId, item.id);
          totalQtyOnHand = balance.qtyOnHand || 0;
          totalValue = totalQtyOnHand * (balance.avgCostPerUnit || 0);
          if (balance.qtyOnHand > 0) {
            siteBalances.push({
              siteId,
              qtyOnHand: balance.qtyOnHand,
              avgCostPerUnit: balance.avgCostPerUnit,
            });
          }
        } else {
          // Aggregate across all sites (sites are from MongoDB, balances are in Firestore)
          for (const site of sites) {
            const mongoSiteId = site._id.toString();
            const balance = await firestoreService.getSiteInventoryBalance(
              tenantId,
              mongoSiteId,
              item.id
            );
            if (balance.qtyOnHand > 0) {
              totalQtyOnHand += balance.qtyOnHand;
              totalValue += balance.qtyOnHand * (balance.avgCostPerUnit || 0);
              siteBalances.push({
                siteId: mongoSiteId,
                siteName: site.name,
                qtyOnHand: balance.qtyOnHand,
                avgCostPerUnit: balance.avgCostPerUnit,
              });
            }
          }
        }

        item.qtyOnHand = totalQtyOnHand;
        item.totalValue = totalValue;
        item.siteBalances = siteBalances.length > 0 ? siteBalances : undefined;
      }
    }

    // Simple pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIdx = (pageNum - 1) * limitNum;
    const paginatedItems = items.slice(startIdx, startIdx + limitNum);
    const totalPages = Math.ceil(items.length / limitNum);

    res.json({
      success: true,
      data: {
        items: paginatedItems,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: items.length,
          pages: totalPages,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch inventory items' });
  }
});

/**
 * GET /api/inventory/totals
 * Get inventory totals (item count, total qty, total value)
 */
router.get('/totals', async (req, res) => {
  try {
    const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
    if (!userData) {
      return res.status(403).json({ success: false, message: 'User not found' });
    }

    const { tenantId } = userData;

    // Get all active inventory items
    const items = await firestoreService.getInventoryItems(tenantId, { activeOnly: true });
    const itemCount = items.length;

    // Get sites from MongoDB
    const mongoTenantId = req.user?.tenantId?._id || req.user?.tenantId;
    const sites = mongoTenantId
      ? await Site.find({ tenantId: mongoTenantId, status: { $ne: 'archived' } }).lean()
      : [];

    // Calculate totals across all sites
    let totalQty = 0;
    let totalValue = 0;

    for (const item of items) {
      for (const site of sites) {
        const mongoSiteId = site._id.toString();
        const balance = await firestoreService.getSiteInventoryBalance(tenantId, mongoSiteId, item.id);
        if (balance.qtyOnHand > 0) {
          totalQty += balance.qtyOnHand;
          totalValue += balance.qtyOnHand * (balance.avgCostPerUnit || 0);
        }
      }
    }

    res.json({
      success: true,
      data: {
        itemCount,
        totalQty,
        totalValue,
      },
    });
  } catch (error) {
    console.error('Error fetching inventory totals:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch inventory totals' });
  }
});

/**
 * GET /api/inventory/items/:id
 * Get a single inventory item
 */
router.get(
  '/items/:id',
  [param('id').notEmpty().withMessage('Item ID is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      const item = await firestoreService.getInventoryItem(userData.tenantId, req.params.id);

      if (!item) {
        return res.status(404).json({ success: false, message: 'Item not found' });
      }

      // Get site inventory balances for this item
      // Pass MongoDB tenantId for site lookups (req.user.tenantId is MongoDB ObjectId)
      const mongoTenantId = req.user?.tenantId?._id || req.user?.tenantId;
      const siteInventory = await firestoreService.getItemSiteBalances(
        userData.tenantId,
        req.params.id,
        mongoTenantId
      );

      res.json({
        success: true,
        data: { item, siteInventory },
      });
    } catch (error) {
      console.error('Error fetching inventory item:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch inventory item' });
    }
  }
);

/**
 * POST /api/inventory/items
 * Create a new inventory item
 */
router.post(
  '/items',
  [
    body('sku').optional().isString(),
    body('name').notEmpty().withMessage('Name is required'),
    body('category').optional().isIn(Object.values(firestoreService.InventoryCategory)),
    body('unit').optional().isString(),
    body('defaultCostPerUnit').optional().isNumeric(),
    body('reorderPoint').optional().isNumeric(),
    body('reorderQty').optional().isNumeric(),
  ],
  checkPlanLimit('inventoryItems'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      // Use tenant from middleware if available
      const tenantId = req.userData?.tenantId || (await firestoreService.findUserByAuthUid(req.firebaseUser.uid))?.tenantId;
      if (!tenantId) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      const item = await firestoreService.createInventoryItem(
        tenantId,
        req.body,
        req.firebaseUser.uid
      );

      // Increment usage counter
      await incrementUsageAfterCreate(tenantId, 'inventoryItems');

      res.status(201).json({
        success: true,
        data: { item },
      });
    } catch (error) {
      console.error('Error creating inventory item:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create inventory item',
      });
    }
  }
);

/**
 * PATCH /api/inventory/items/:id
 * Update an inventory item
 */
router.patch(
  '/items/:id',
  [param('id').notEmpty().withMessage('Item ID is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      const item = await firestoreService.updateInventoryItem(
        userData.tenantId,
        req.params.id,
        req.body
      );

      res.json({
        success: true,
        data: { item },
      });
    } catch (error) {
      console.error('Error updating inventory item:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update inventory item',
      });
    }
  }
);

// ============================================
// SITE INVENTORY (Balances)
// ============================================

/**
 * GET /api/inventory/sites/:siteId
 * Get all inventory balances for a site
 */
router.get(
  '/sites/:siteId',
  [param('siteId').notEmpty().withMessage('Site ID is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      const { includeZeroQty } = req.query;

      const inventory = await firestoreService.getSiteInventory(
        userData.tenantId,
        req.params.siteId,
        { includeZeroQty: includeZeroQty === 'true' }
      );

      res.json({
        success: true,
        data: { inventory },
      });
    } catch (error) {
      console.error('Error fetching site inventory:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch site inventory' });
    }
  }
);

/**
 * GET /api/inventory/sites/:siteId/items/:itemId
 * Get balance for a specific item at a site
 */
router.get(
  '/sites/:siteId/items/:itemId',
  [
    param('siteId').notEmpty().withMessage('Site ID is required'),
    param('itemId').notEmpty().withMessage('Item ID is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      const balance = await firestoreService.getSiteInventoryBalance(
        userData.tenantId,
        req.params.siteId,
        req.params.itemId
      );

      // Get item details
      const item = await firestoreService.getInventoryItem(
        userData.tenantId,
        req.params.itemId
      );

      res.json({
        success: true,
        data: { balance, item },
      });
    } catch (error) {
      console.error('Error fetching item balance:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch item balance' });
    }
  }
);

// ============================================
// INVENTORY MOVEMENTS (via Events)
// ============================================

/**
 * POST /api/inventory/adjust
 * Create an inventory adjustment event
 */
router.post(
  '/adjust',
  [
    body('siteId').notEmpty().withMessage('Site ID is required'),
    body('itemId').notEmpty().withMessage('Item ID is required'),
    body('qtyDelta').isNumeric().withMessage('qtyDelta must be a number'),
    body('reason').optional().isString(),
    body('processImmediately').optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      const { siteId, itemId, qtyDelta, costPerUnit, reason, processImmediately = true } = req.body;
      const { tenantId } = userData;

      // Get item for GL account info
      const item = await firestoreService.getInventoryItem(tenantId, itemId);
      if (!item) {
        return res.status(404).json({ success: false, message: 'Inventory item not found' });
      }

      // Get current balance for cost calculation
      const balance = await firestoreService.getSiteInventoryBalance(tenantId, siteId, itemId);
      const useCost = costPerUnit ?? balance.avgCostPerUnit ?? item.defaultCostPerUnit ?? 0;
      const totalCost = Math.abs(qtyDelta) * useCost;

      // Create event
      const idempotencyKey = accountingService.generateIdempotencyKey(
        tenantId,
        `adjustment-${itemId}-${Date.now()}`,
        { siteId, itemId, qtyDelta }
      );

      const event = await firestoreService.createEvent(
        tenantId,
        {
          siteId,
          type: 'INVENTORY_ADJUSTMENT',
          occurredAt: new Date(),
          sourceType: 'API',
          payload: {
            itemId,
            qtyDelta: parseFloat(qtyDelta),
            costPerUnit: useCost,
            totalCost,
            itemType: item.category === 'FEED' ? 'FEED' : 'SUPPLIES',
            reason: reason || 'Manual adjustment',
          },
          idempotencyKey,
        },
        req.firebaseUser.uid
      );

      let processingResult = null;
      if (processImmediately) {
        try {
          const lockerId = `api-${uuidv4()}`;
          processingResult = await accountingService.processEvent(tenantId, event.id, lockerId);
        } catch (postingError) {
          console.error('Adjustment posting failed:', postingError);
          processingResult = { success: false, error: postingError.message };
        }
      }

      res.status(201).json({
        success: true,
        data: {
          event,
          processing: processingResult,
        },
      });
    } catch (error) {
      console.error('Error creating adjustment:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create adjustment',
      });
    }
  }
);

/**
 * POST /api/inventory/transfer
 * Create an inventory transfer event
 */
router.post(
  '/transfer',
  [
    body('fromSiteId').notEmpty().withMessage('From site ID is required'),
    body('toSiteId').notEmpty().withMessage('To site ID is required'),
    body('itemId').notEmpty().withMessage('Item ID is required'),
    body('qty').isNumeric().custom((v) => v > 0).withMessage('qty must be a positive number'),
    body('processImmediately').optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      const { fromSiteId, toSiteId, itemId, qty, processImmediately = true } = req.body;
      const { tenantId } = userData;

      if (fromSiteId === toSiteId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot transfer to the same site',
        });
      }

      // Get item info
      const item = await firestoreService.getInventoryItem(tenantId, itemId);
      if (!item) {
        return res.status(404).json({ success: false, message: 'Inventory item not found' });
      }

      // Check source balance
      const sourceBalance = await firestoreService.getSiteInventoryBalance(
        tenantId,
        fromSiteId,
        itemId
      );

      if (sourceBalance.qtyOnHand < qty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient quantity at source site. Available: ${sourceBalance.qtyOnHand}`,
        });
      }

      const costPerUnit = sourceBalance.avgCostPerUnit || item.defaultCostPerUnit || 0;
      const totalCost = qty * costPerUnit;

      // Create event
      const idempotencyKey = accountingService.generateIdempotencyKey(
        tenantId,
        `transfer-${itemId}-${Date.now()}`,
        { fromSiteId, toSiteId, itemId, qty }
      );

      const event = await firestoreService.createEvent(
        tenantId,
        {
          siteId: fromSiteId, // Primary site for the event
          type: 'INVENTORY_TRANSFER',
          occurredAt: new Date(),
          sourceType: 'API',
          payload: {
            itemId,
            qty: parseFloat(qty),
            costPerUnit,
            totalCost,
            fromSiteId,
            toSiteId,
            itemType: item.category === 'FEED' ? 'FEED' : 'SUPPLIES',
          },
          idempotencyKey,
        },
        req.firebaseUser.uid
      );

      let processingResult = null;
      if (processImmediately) {
        try {
          const lockerId = `api-${uuidv4()}`;
          processingResult = await accountingService.processEvent(tenantId, event.id, lockerId);
        } catch (postingError) {
          console.error('Transfer posting failed:', postingError);
          processingResult = { success: false, error: postingError.message };
        }
      }

      res.status(201).json({
        success: true,
        data: {
          event,
          processing: processingResult,
        },
      });
    } catch (error) {
      console.error('Error creating transfer:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create transfer',
      });
    }
  }
);

/**
 * POST /api/inventory/receive
 * Create a receive/purchase event
 */
router.post(
  '/receive',
  [
    body('siteId').notEmpty().withMessage('Site ID is required'),
    body('items').isArray({ min: 1 }).withMessage('Items array is required'),
    body('items.*.itemId').notEmpty().withMessage('Each item must have itemId'),
    body('items.*.qty').isNumeric().custom((v) => v > 0).withMessage('Each item must have positive qty'),
    body('paymentMethod').optional().isIn(['CASH', 'CREDIT']),
    body('processImmediately').optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      const {
        siteId,
        items,
        poNumber,
        vendor,
        paymentMethod = 'CREDIT',
        processImmediately = true,
      } = req.body;
      const { tenantId } = userData;

      // Validate items and calculate totals
      let totalCost = 0;
      const processedItems = [];

      for (const lineItem of items) {
        const item = await firestoreService.getInventoryItem(tenantId, lineItem.itemId);
        if (!item) {
          return res.status(404).json({
            success: false,
            message: `Inventory item not found: ${lineItem.itemId}`,
          });
        }

        const costPerUnit = lineItem.costPerUnit ?? item.defaultCostPerUnit ?? 0;
        const lineCost = lineItem.qty * costPerUnit;
        totalCost += lineCost;

        processedItems.push({
          itemId: lineItem.itemId,
          qty: parseFloat(lineItem.qty),
          costPerUnit,
          totalCost: lineCost,
        });
      }

      // Determine item type from first item
      const firstItem = await firestoreService.getInventoryItem(tenantId, items[0].itemId);
      const itemType = firstItem?.category === 'FEED' ? 'FEED' : 'SUPPLIES';

      // Create event
      const idempotencyKey = accountingService.generateIdempotencyKey(
        tenantId,
        `receive-${poNumber || Date.now()}`,
        { siteId, items: processedItems }
      );

      const event = await firestoreService.createEvent(
        tenantId,
        {
          siteId,
          type: 'RECEIVE_PURCHASE_ORDER',
          occurredAt: new Date(),
          sourceType: 'API',
          payload: {
            items: processedItems,
            destinationSiteId: siteId,
            poNumber,
            vendor,
            totalCost,
            itemType,
            paymentMethod,
          },
          idempotencyKey,
        },
        req.firebaseUser.uid
      );

      let processingResult = null;
      if (processImmediately) {
        try {
          const lockerId = `api-${uuidv4()}`;
          processingResult = await accountingService.processEvent(tenantId, event.id, lockerId);
        } catch (postingError) {
          console.error('Receive posting failed:', postingError);
          processingResult = { success: false, error: postingError.message };
        }
      }

      res.status(201).json({
        success: true,
        data: {
          event,
          processing: processingResult,
        },
      });
    } catch (error) {
      console.error('Error creating receive:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create receive',
      });
    }
  }
);

// ============================================
// INVENTORY MOVEMENTS (History)
// ============================================

/**
 * GET /api/inventory/movements
 * Get inventory movement history
 */
router.get('/movements', async (req, res) => {
  try {
    const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
    if (!userData) {
      return res.status(403).json({ success: false, message: 'User not found' });
    }

    const { siteId, itemId, type, limit = 50, startAfter } = req.query;

    const movements = await firestoreService.getInventoryMovements(userData.tenantId, {
      siteId,
      itemId,
      type,
      limit: parseInt(limit),
      startAfter,
    });

    res.json({
      success: true,
      data: { movements },
    });
  } catch (error) {
    console.error('Error fetching movements:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch movements' });
  }
});

// ============================================
// PURCHASE REQUISITIONS
// ============================================

/**
 * GET /api/inventory/requisitions
 * Get purchase requisitions
 */
router.get('/requisitions', async (req, res) => {
  try {
    const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
    if (!userData) {
      return res.status(403).json({ success: false, message: 'User not found' });
    }

    const { status, siteId, limit = 50 } = req.query;

    const requisitions = await firestoreService.getPurchaseRequisitions(userData.tenantId, {
      status,
      siteId,
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      data: { requisitions },
    });
  } catch (error) {
    console.error('Error fetching requisitions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch requisitions' });
  }
});

/**
 * POST /api/inventory/requisitions/:id/approve
 * Approve a purchase requisition
 */
router.post(
  '/requisitions/:id/approve',
  [param('id').notEmpty().withMessage('Requisition ID is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      // Check user has manager+ role
      if (!['owner', 'admin', 'manager'].some((r) => userData.user.roles?.includes(r))) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to approve requisitions',
        });
      }

      const requisition = await firestoreService.updateRequisitionStatus(
        userData.tenantId,
        req.params.id,
        firestoreService.RequisitionStatus.APPROVED,
        req.firebaseUser.uid
      );

      res.json({
        success: true,
        data: { requisition },
      });
    } catch (error) {
      console.error('Error approving requisition:', error);
      res.status(500).json({ success: false, message: 'Failed to approve requisition' });
    }
  }
);

/**
 * POST /api/inventory/requisitions/:id/reject
 * Reject a purchase requisition
 */
router.post(
  '/requisitions/:id/reject',
  [
    param('id').notEmpty().withMessage('Requisition ID is required'),
    body('reason').notEmpty().withMessage('Rejection reason is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      // Check user has manager+ role
      if (!['owner', 'admin', 'manager'].some((r) => userData.user.roles?.includes(r))) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to reject requisitions',
        });
      }

      const requisition = await firestoreService.updateRequisitionStatus(
        userData.tenantId,
        req.params.id,
        firestoreService.RequisitionStatus.REJECTED,
        req.firebaseUser.uid,
        req.body.reason
      );

      res.json({
        success: true,
        data: { requisition },
      });
    } catch (error) {
      console.error('Error rejecting requisition:', error);
      res.status(500).json({ success: false, message: 'Failed to reject requisition' });
    }
  }
);

// ============================================
// METADATA
// ============================================

/**
 * GET /api/inventory/categories
 * Get available inventory categories
 */
router.get('/categories', (req, res) => {
  res.json({
    success: true,
    data: {
      categories: Object.entries(firestoreService.InventoryCategory).map(([key, value]) => ({
        value,
        label: key.charAt(0) + key.slice(1).toLowerCase().replace(/_/g, ' '),
      })),
    },
  });
});

/**
 * GET /api/inventory/movement-types
 * Get available movement types
 */
router.get('/movement-types', (req, res) => {
  res.json({
    success: true,
    data: {
      movementTypes: Object.entries(firestoreService.MovementType).map(([key, value]) => ({
        value,
        label: key.charAt(0) + key.slice(1).toLowerCase().replace(/_/g, ' '),
      })),
    },
  });
});

/**
 * GET /api/inventory/units
 * Get available inventory units of measure
 */
router.get('/units', (req, res) => {
  const units = [
    // Weight
    { value: 'lbs', label: 'Pounds (lbs)', type: 'weight' },
    { value: 'kg', label: 'Kilograms (kg)', type: 'weight' },
    { value: 'oz', label: 'Ounces (oz)', type: 'weight' },
    { value: 'tons', label: 'Tons', type: 'weight' },
    // Volume
    { value: 'gallons', label: 'Gallons', type: 'volume' },
    { value: 'liters', label: 'Liters', type: 'volume' },
    { value: 'quarts', label: 'Quarts', type: 'volume' },
    { value: 'ml', label: 'Milliliters (ml)', type: 'volume' },
    // Count
    { value: 'units', label: 'Units', type: 'count' },
    { value: 'each', label: 'Each', type: 'count' },
    { value: 'dozen', label: 'Dozen', type: 'count' },
    { value: 'cases', label: 'Cases', type: 'count' },
    { value: 'bags', label: 'Bags', type: 'count' },
    { value: 'bales', label: 'Bales', type: 'count' },
    { value: 'boxes', label: 'Boxes', type: 'count' },
    // Length/Area
    { value: 'feet', label: 'Feet', type: 'length' },
    { value: 'meters', label: 'Meters', type: 'length' },
    { value: 'acres', label: 'Acres', type: 'area' },
    // Other
    { value: 'doses', label: 'Doses', type: 'medical' },
    { value: 'cc', label: 'CC (cubic centimeters)', type: 'medical' },
  ];

  res.json({
    success: true,
    data: { units },
  });
});

module.exports = router;
