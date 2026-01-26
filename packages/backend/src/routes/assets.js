const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { verifyToken } = require('../middleware/auth');
const firestoreService = require('../services/firestore');

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Asset types enum
const AssetType = {
  ANIMAL: 'ANIMAL',
  LAND: 'LAND',
  BUILDING: 'BUILDING',
  VEHICLE: 'VEHICLE',
  EQUIPMENT: 'EQUIPMENT',
  INFRASTRUCTURE: 'INFRASTRUCTURE',
  TOOL: 'TOOL',
  OTHER: 'OTHER',
};

// Asset statuses
const AssetStatus = {
  ACTIVE: 'ACTIVE',
  SOLD: 'SOLD',
  RETIRED: 'RETIRED',
  LOST: 'LOST',
  ARCHIVED: 'ARCHIVED',
  DECEASED: 'DECEASED',
};

/**
 * GET /api/assets/counts
 * Get asset counts by type
 */
router.get('/counts', async (req, res) => {
  try {
    const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
    if (!userData) {
      return res.status(403).json({ success: false, message: 'User not found' });
    }

    const { siteId } = req.query;
    const counts = {};

    // Get counts for each asset type (skipOrder for better performance without composite indexes)
    for (const type of Object.values(AssetType)) {
      const assets = await firestoreService.getAssets(userData.tenantId, { assetType: type, siteId, skipOrder: true });
      const active = assets.filter(a => a.status === 'ACTIVE').length;
      const inactive = assets.filter(a => a.status !== 'ACTIVE').length;
      counts[type] = { total: assets.length, active, inactive };
    }

    res.json({ success: true, counts });
  } catch (error) {
    console.error('Error fetching asset counts:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch asset counts' });
  }
});

/**
 * GET /api/assets/recent
 * Get recently updated assets
 */
router.get('/recent', async (req, res) => {
  try {
    const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
    if (!userData) {
      return res.status(403).json({ success: false, message: 'User not found' });
    }

    const { siteId, limit = 10 } = req.query;
    const assets = await firestoreService.getRecentAssets(userData.tenantId, { siteId, limit: parseInt(limit) });

    res.json({ success: true, assets });
  } catch (error) {
    console.error('Error fetching recent assets:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch recent assets' });
  }
});

/**
 * GET /api/assets/search
 * Search assets by name, identifier, or tags
 */
router.get('/search', async (req, res) => {
  try {
    const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
    if (!userData) {
      return res.status(403).json({ success: false, message: 'User not found' });
    }

    const { query: searchQuery, siteId, limit = 20 } = req.query;

    if (!searchQuery || searchQuery.trim().length < 2) {
      return res.json({ success: true, assets: [] });
    }

    const assets = await firestoreService.searchAssets(userData.tenantId, {
      query: searchQuery.trim(),
      siteId,
      limit: parseInt(limit),
    });

    res.json({ success: true, assets });
  } catch (error) {
    console.error('Error searching assets:', error);
    res.status(500).json({ success: false, message: 'Failed to search assets' });
  }
});

/**
 * GET /api/assets
 * List assets with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
    if (!userData) {
      return res.status(403).json({ success: false, message: 'User not found' });
    }

    const { assetType, siteId, status, page = 1, limit = 50 } = req.query;

    const assets = await firestoreService.getAssets(userData.tenantId, {
      assetType,
      siteId,
      status,
    });

    // Simple pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const paginatedAssets = assets.slice(startIndex, startIndex + parseInt(limit));

    res.json({
      success: true,
      data: {
        assets: paginatedAssets,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: assets.length,
          pages: Math.ceil(assets.length / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch assets' });
  }
});

/**
 * GET /api/assets/:id
 * Get a single asset
 */
router.get(
  '/:id',
  [param('id').notEmpty().withMessage('Asset ID is required')],
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

      const asset = await firestoreService.getAsset(userData.tenantId, req.params.id);

      if (!asset) {
        return res.status(404).json({ success: false, message: 'Asset not found' });
      }

      res.json({ success: true, data: { asset } });
    } catch (error) {
      console.error('Error fetching asset:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch asset' });
    }
  }
);

/**
 * POST /api/assets
 * Create a new asset
 */
router.post(
  '/',
  [
    body('siteId').notEmpty().withMessage('Site ID is required'),
    body('assetType').isIn(Object.values(AssetType)).withMessage('Invalid asset type'),
    body('name').notEmpty().withMessage('Name is required'),
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

      const assetData = {
        ...req.body,
        tenantId: userData.tenantId,
        status: req.body.status || 'ACTIVE',
        createdBy: userData.id,
        updatedBy: userData.id,
      };

      const asset = await firestoreService.createAsset(userData.tenantId, assetData);

      res.status(201).json({ success: true, data: { asset } });
    } catch (error) {
      console.error('Error creating asset:', error);
      res.status(500).json({ success: false, message: 'Failed to create asset' });
    }
  }
);

/**
 * PATCH /api/assets/:id
 * Update an asset
 */
router.patch(
  '/:id',
  [param('id').notEmpty().withMessage('Asset ID is required')],
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

      const updateData = {
        ...req.body,
        updatedBy: userData.id,
      };

      const asset = await firestoreService.updateAsset(userData.tenantId, req.params.id, updateData);

      res.json({ success: true, data: { asset } });
    } catch (error) {
      console.error('Error updating asset:', error);
      res.status(500).json({ success: false, message: 'Failed to update asset' });
    }
  }
);

/**
 * POST /api/assets/:id/status
 * Update asset status (dispose/archive)
 */
router.post(
  '/:id/status',
  [
    param('id').notEmpty().withMessage('Asset ID is required'),
    body('status').isIn(Object.values(AssetStatus)).withMessage('Invalid status'),
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

      const { status, disposedAt, disposalMethod, disposalNotes } = req.body;

      const updateData = {
        status,
        updatedBy: userData.id,
      };

      if (status !== 'ACTIVE') {
        updateData.disposedAt = disposedAt || new Date().toISOString();
        if (disposalMethod) updateData.disposalMethod = disposalMethod;
        if (disposalNotes) updateData.disposalNotes = disposalNotes;
      }

      const asset = await firestoreService.updateAsset(userData.tenantId, req.params.id, updateData);

      res.json({ success: true, data: { asset } });
    } catch (error) {
      console.error('Error updating asset status:', error);
      res.status(500).json({ success: false, message: 'Failed to update asset status' });
    }
  }
);

module.exports = router;
