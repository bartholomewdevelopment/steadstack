const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { verifyToken } = require('../middleware/auth');
const { checkPlanLimit, incrementUsageAfterCreate } = require('../middleware/planLimits');
const firestoreService = require('../services/firestore');
const accountingService = require('../services/accounting');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// ============================================
// ANIMAL GROUPS
// ============================================

/**
 * GET /api/animals/groups
 * List animal groups for the tenant
 */
router.get('/groups', async (req, res) => {
  try {
    const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
    if (!userData) {
      return res.status(403).json({ success: false, message: 'User not found' });
    }

    const { siteId, species, status } = req.query;

    const groups = await firestoreService.getAnimalGroups(userData.tenantId, {
      siteId,
      species,
      status,
    });

    res.json({
      success: true,
      data: { groups },
    });
  } catch (error) {
    console.error('Error fetching animal groups:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch animal groups' });
  }
});

/**
 * GET /api/animals/groups/:id
 * Get a single animal group
 */
router.get(
  '/groups/:id',
  [param('id').notEmpty().withMessage('Group ID is required')],
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

      const group = await firestoreService.getAnimalGroup(userData.tenantId, req.params.id);

      if (!group) {
        return res.status(404).json({ success: false, message: 'Group not found' });
      }

      res.json({
        success: true,
        data: { group },
      });
    } catch (error) {
      console.error('Error fetching animal group:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch animal group' });
    }
  }
);

/**
 * POST /api/animals/groups
 * Create an animal group
 */
router.post(
  '/groups',
  [
    body('siteId').notEmpty().withMessage('Site ID is required'),
    body('name').notEmpty().withMessage('Name is required'),
    body('type').optional().isIn(Object.values(firestoreService.AnimalGroupType)),
    body('species').optional().isIn(Object.values(firestoreService.AnimalSpecies)),
  ],
  checkPlanLimit('animals'),
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

      const group = await firestoreService.createAnimalGroup(
        tenantId,
        req.body,
        req.firebaseUser.uid
      );

      // Increment usage counter
      await incrementUsageAfterCreate(tenantId, 'animals');

      res.status(201).json({
        success: true,
        data: { group },
      });
    } catch (error) {
      console.error('Error creating animal group:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create animal group',
      });
    }
  }
);

/**
 * PATCH /api/animals/groups/:id
 * Update an animal group
 */
router.patch(
  '/groups/:id',
  [param('id').notEmpty().withMessage('Group ID is required')],
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

      const group = await firestoreService.updateAnimalGroup(
        userData.tenantId,
        req.params.id,
        req.body
      );

      res.json({
        success: true,
        data: { group },
      });
    } catch (error) {
      console.error('Error updating animal group:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update animal group',
      });
    }
  }
);

// ============================================
// ANIMALS (Individual)
// ============================================

/**
 * GET /api/animals
 * List animals with filters
 */
router.get('/', async (req, res) => {
  try {
    const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
    if (!userData) {
      return res.status(403).json({ success: false, message: 'User not found' });
    }

    const { siteId, groupId, species, status, search, limit = 50, startAfter } = req.query;

    const animals = await firestoreService.getAnimals(userData.tenantId, {
      siteId,
      groupId,
      species,
      status,
      search,
      limit: parseInt(limit),
      startAfter,
    });

    res.json({
      success: true,
      data: { animals },
    });
  } catch (error) {
    console.error('Error fetching animals:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch animals' });
  }
});

/**
 * GET /api/animals/stats
 * Get animal statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
    if (!userData) {
      return res.status(403).json({ success: false, message: 'User not found' });
    }

    const { siteId } = req.query;

    const stats = await firestoreService.getAnimalStats(userData.tenantId, { siteId });

    res.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    console.error('Error fetching animal stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch animal stats' });
  }
});

/**
 * GET /api/animals/:id
 * Get a single animal
 */
router.get(
  '/:id',
  [param('id').notEmpty().withMessage('Animal ID is required')],
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

      const animal = await firestoreService.getAnimal(userData.tenantId, req.params.id);

      if (!animal) {
        return res.status(404).json({ success: false, message: 'Animal not found' });
      }

      res.json({
        success: true,
        data: { animal },
      });
    } catch (error) {
      console.error('Error fetching animal:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch animal' });
    }
  }
);

/**
 * POST /api/animals
 * Create an animal
 */
router.post(
  '/',
  [
    body('siteId').notEmpty().withMessage('Site ID is required'),
    body('tagNumber').notEmpty().withMessage('Tag number is required'),
    body('species').optional().isIn(Object.values(firestoreService.AnimalSpecies)),
    body('gender').optional().isIn(['male', 'female', 'castrated', 'unknown']),
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

      const animal = await firestoreService.createAnimal(
        userData.tenantId,
        req.body,
        req.firebaseUser.uid
      );

      // If animal was purchased, create a PURCHASE_LIVESTOCK event
      if (req.body.acquisition?.method === 'purchased' && req.body.acquisition?.cost) {
        const idempotencyKey = accountingService.generateIdempotencyKey(
          userData.tenantId,
          `purchase-animal-${animal.id}`,
          { animalId: animal.id, cost: req.body.acquisition.cost }
        );

        const event = await firestoreService.createEvent(
          userData.tenantId,
          {
            siteId: req.body.siteId,
            type: 'PURCHASE_LIVESTOCK',
            occurredAt: new Date(),
            sourceType: 'API',
            payload: {
              animalIds: [animal.id],
              livestockGroupId: req.body.groupId,
              totalCost: req.body.acquisition.cost,
              paymentMethod: req.body.paymentMethod || 'CREDIT',
            },
            idempotencyKey,
          },
          req.firebaseUser.uid
        );

        // Process immediately
        try {
          const lockerId = `api-${uuidv4()}`;
          await accountingService.processEvent(userData.tenantId, event.id, lockerId);
        } catch (postingError) {
          console.error('Livestock purchase posting failed:', postingError);
        }
      }

      res.status(201).json({
        success: true,
        data: { animal },
      });
    } catch (error) {
      console.error('Error creating animal:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create animal',
      });
    }
  }
);

/**
 * PATCH /api/animals/:id
 * Update an animal
 */
router.patch(
  '/:id',
  [param('id').notEmpty().withMessage('Animal ID is required')],
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

      const animal = await firestoreService.updateAnimal(
        userData.tenantId,
        req.params.id,
        req.body
      );

      res.json({
        success: true,
        data: { animal },
      });
    } catch (error) {
      console.error('Error updating animal:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update animal',
      });
    }
  }
);

/**
 * POST /api/animals/:id/status
 * Update animal status (sold, deceased, etc.)
 */
router.post(
  '/:id/status',
  [
    param('id').notEmpty().withMessage('Animal ID is required'),
    body('status').isIn(Object.values(firestoreService.AnimalStatus)).withMessage('Invalid status'),
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

      const { status, reason } = req.body;

      const animal = await firestoreService.updateAnimalStatus(
        userData.tenantId,
        req.params.id,
        status,
        reason,
        req.firebaseUser.uid
      );

      res.json({
        success: true,
        data: { animal },
      });
    } catch (error) {
      console.error('Error updating animal status:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update animal status',
      });
    }
  }
);

/**
 * POST /api/animals/bulk/move
 * Bulk move animals to different group/site
 */
router.post(
  '/bulk/move',
  [
    body('animalIds').isArray({ min: 1 }).withMessage('Animal IDs array is required'),
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

      const { animalIds, groupId, siteId } = req.body;

      const result = await firestoreService.bulkMoveAnimals(
        userData.tenantId,
        animalIds,
        groupId,
        siteId,
        req.firebaseUser.uid
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error bulk moving animals:', error);
      res.status(500).json({ success: false, message: 'Failed to move animals' });
    }
  }
);

// ============================================
// LIVESTOCK EVENTS (Feed, Sell, etc.)
// ============================================

/**
 * POST /api/animals/feed
 * Create a feed livestock event
 */
router.post(
  '/feed',
  [
    body('siteId').notEmpty().withMessage('Site ID is required'),
    body('feedItemId').notEmpty().withMessage('Feed item ID is required'),
    body('qty').isNumeric().custom((v) => v > 0).withMessage('Quantity must be positive'),
    body('livestockGroupId').optional().isString(),
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
        feedItemId,
        qty,
        livestockGroupId,
        notes,
        processImmediately = true,
      } = req.body;
      const { tenantId } = userData;

      // Get feed item for cost
      const feedItem = await firestoreService.getInventoryItem(tenantId, feedItemId);
      if (!feedItem) {
        return res.status(404).json({ success: false, message: 'Feed item not found' });
      }

      // Get current balance for cost
      const balance = await firestoreService.getSiteInventoryBalance(tenantId, siteId, feedItemId);
      const costPerUnit = balance.avgCostPerUnit || feedItem.defaultCostPerUnit || 0;
      const totalCost = qty * costPerUnit;

      // Create event
      const idempotencyKey = accountingService.generateIdempotencyKey(
        tenantId,
        `feed-${feedItemId}-${Date.now()}`,
        { siteId, feedItemId, qty, livestockGroupId }
      );

      const event = await firestoreService.createEvent(
        tenantId,
        {
          siteId,
          type: 'FEED_LIVESTOCK',
          occurredAt: new Date(),
          sourceType: 'API',
          payload: {
            feedItemId,
            qty: parseFloat(qty),
            costPerUnit,
            totalCost,
            livestockGroupId: livestockGroupId || null,
            notes: notes || null,
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
          console.error('Feed livestock posting failed:', postingError);
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
      console.error('Error creating feed event:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create feed event',
      });
    }
  }
);

/**
 * POST /api/animals/sell
 * Create a sell livestock event
 */
router.post(
  '/sell',
  [
    body('siteId').notEmpty().withMessage('Site ID is required'),
    body('animalIds').isArray({ min: 1 }).withMessage('Animal IDs array is required'),
    body('saleAmount').isNumeric().custom((v) => v > 0).withMessage('Sale amount must be positive'),
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
        animalIds,
        livestockGroupId,
        saleAmount,
        costAmount,
        buyer,
        notes,
        paymentMethod = 'CREDIT',
        processImmediately = true,
      } = req.body;
      const { tenantId } = userData;

      // Create event
      const idempotencyKey = accountingService.generateIdempotencyKey(
        tenantId,
        `sell-livestock-${Date.now()}`,
        { siteId, animalIds, saleAmount }
      );

      const event = await firestoreService.createEvent(
        tenantId,
        {
          siteId,
          type: 'SELL_LIVESTOCK',
          occurredAt: new Date(),
          sourceType: 'API',
          payload: {
            animalIds,
            livestockGroupId: livestockGroupId || null,
            saleAmount: parseFloat(saleAmount),
            costAmount: costAmount ? parseFloat(costAmount) : null,
            buyer: buyer || null,
            notes: notes || null,
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

          // Update animal statuses to SOLD
          for (const animalId of animalIds) {
            try {
              await firestoreService.updateAnimalStatus(
                tenantId,
                animalId,
                firestoreService.AnimalStatus.SOLD,
                `Sold to ${buyer || 'buyer'}`,
                req.firebaseUser.uid
              );
            } catch (statusError) {
              console.error(`Failed to update status for animal ${animalId}:`, statusError);
            }
          }
        } catch (postingError) {
          console.error('Sell livestock posting failed:', postingError);
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
      console.error('Error creating sell event:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create sell event',
      });
    }
  }
);

// ============================================
// METADATA
// ============================================

/**
 * GET /api/animals/species
 * Get available animal species
 */
router.get('/meta/species', (req, res) => {
  res.json({
    success: true,
    data: {
      species: Object.entries(firestoreService.AnimalSpecies).map(([key, value]) => ({
        value,
        label: key.charAt(0) + key.slice(1).toLowerCase(),
      })),
    },
  });
});

/**
 * GET /api/animals/group-types
 * Get available animal group types
 */
router.get('/meta/group-types', (req, res) => {
  res.json({
    success: true,
    data: {
      groupTypes: Object.entries(firestoreService.AnimalGroupType).map(([key, value]) => ({
        value,
        label: key.charAt(0) + key.slice(1).toLowerCase(),
      })),
    },
  });
});

/**
 * GET /api/animals/statuses
 * Get available animal statuses
 */
router.get('/meta/statuses', (req, res) => {
  res.json({
    success: true,
    data: {
      statuses: Object.entries(firestoreService.AnimalStatus).map(([key, value]) => ({
        value,
        label: key.charAt(0) + key.slice(1).toLowerCase(),
      })),
    },
  });
});

module.exports = router;
