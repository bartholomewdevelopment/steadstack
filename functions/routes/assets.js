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
 * Get asset counts by type (aggregates from animals, landTracts, and assets collections)
 */
router.get('/counts', async (req, res) => {
  try {
    const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
    if (!userData) {
      return res.status(403).json({ success: false, message: 'User not found' });
    }

    const { siteId } = req.query;
    const counts = {};

    // Get ANIMAL counts from animals collection (status: 'ALL' returns all regardless of status, high limit for accurate counts)
    // Note: Animal statuses are lowercase ('active', 'sold', etc.)
    const animals = await firestoreService.getAnimals(userData.tenantId, { siteId, status: 'ALL', skipOrder: true, limit: 10000 });
    const activeAnimals = animals.filter(a => a.status === 'active').length;
    const inactiveAnimals = animals.filter(a => a.status !== 'active').length;
    counts.ANIMAL = { total: animals.length, active: activeAnimals, inactive: inactiveAnimals };

    // Get LAND counts from landTracts collection (use high limit for accurate counts)
    const landTracts = await firestoreService.getLandTracts(userData.tenantId, { siteId, status: null, limit: 10000 });
    const activeLand = landTracts.filter(t => t.status === 'active').length;
    const inactiveLand = landTracts.filter(t => t.status !== 'active').length;
    counts.LAND = { total: landTracts.length, active: activeLand, inactive: inactiveLand };

    // Get counts for other asset types from assets collection (use high limit for accurate counts)
    const otherTypes = Object.values(AssetType).filter(t => t !== 'ANIMAL' && t !== 'LAND');
    for (const type of otherTypes) {
      const assets = await firestoreService.getAssets(userData.tenantId, { assetType: type, siteId, skipOrder: true, limit: 10000 });
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
 * Get recently updated assets (aggregates from animals, landTracts, and assets collections)
 */
router.get('/recent', async (req, res) => {
  try {
    const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
    if (!userData) {
      return res.status(403).json({ success: false, message: 'User not found' });
    }

    const { siteId, limit = 10 } = req.query;
    const parsedLimit = parseInt(limit);

    // Fetch from all three collections in parallel (status: 'ALL' for animals, status: null for land to get all)
    const [animals, landTracts, genericAssets] = await Promise.all([
      firestoreService.getAnimals(userData.tenantId, { siteId, status: 'ALL', skipOrder: true }),
      firestoreService.getLandTracts(userData.tenantId, { siteId, status: null }),
      firestoreService.getRecentAssets(userData.tenantId, { siteId, limit: parsedLimit }),
    ]);

    // Normalize animals to asset format
    const normalizedAnimals = animals.map(a => ({
      id: a.id,
      name: a.name || a.tagNumber || 'Unnamed Animal',
      identifier: a.tagNumber || a.visualTag,
      assetType: 'ANIMAL',
      status: a.status,
      siteId: a.siteId,
      siteName: a.siteName,
      updatedAt: a.updatedAt,
      createdAt: a.createdAt,
    }));

    // Normalize land tracts to asset format
    const normalizedLand = landTracts.map(t => ({
      id: t.id,
      name: t.name,
      identifier: t.parcelNumber,
      assetType: 'LAND',
      status: t.status === 'active' ? 'ACTIVE' : t.status?.toUpperCase(),
      siteId: t.siteId,
      siteName: t.siteName,
      updatedAt: t.updatedAt,
      createdAt: t.createdAt,
    }));

    // Combine all assets
    const allAssets = [...normalizedAnimals, ...normalizedLand, ...genericAssets];

    // Sort by updatedAt descending
    allAssets.sort((a, b) => {
      const aTime = a.updatedAt?.toDate?.() || (a.updatedAt?._seconds ? new Date(a.updatedAt._seconds * 1000) : new Date(a.updatedAt || 0));
      const bTime = b.updatedAt?.toDate?.() || (b.updatedAt?._seconds ? new Date(b.updatedAt._seconds * 1000) : new Date(b.updatedAt || 0));
      return bTime - aTime;
    });

    res.json({ success: true, assets: allAssets.slice(0, parsedLimit) });
  } catch (error) {
    console.error('Error fetching recent assets:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch recent assets' });
  }
});

/**
 * GET /api/assets/search
 * Search assets by name, identifier, or tags (aggregates from animals, landTracts, and assets)
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

    const parsedLimit = parseInt(limit);
    const searchLower = searchQuery.trim().toLowerCase();

    // Fetch from all collections in parallel (status: 'ALL' for animals, status: null for land to get all)
    const [animals, landTracts, genericAssets] = await Promise.all([
      firestoreService.getAnimals(userData.tenantId, { siteId, status: 'ALL', skipOrder: true }),
      firestoreService.getLandTracts(userData.tenantId, { siteId, status: null }),
      firestoreService.searchAssets(userData.tenantId, { query: searchQuery.trim(), siteId, limit: parsedLimit }),
    ]);

    // Filter and normalize animals
    const matchingAnimals = animals
      .filter(a =>
        a.name?.toLowerCase().includes(searchLower) ||
        a.tagNumber?.toLowerCase().includes(searchLower) ||
        a.visualTag?.toLowerCase().includes(searchLower) ||
        a.species?.toLowerCase().includes(searchLower) ||
        a.breed?.toLowerCase().includes(searchLower)
      )
      .map(a => ({
        id: a.id,
        name: a.name || a.tagNumber || 'Unnamed Animal',
        identifier: a.tagNumber || a.visualTag,
        assetType: 'ANIMAL',
        status: a.status,
        siteId: a.siteId,
        siteName: a.siteName,
        updatedAt: a.updatedAt,
      }));

    // Filter and normalize land tracts
    const matchingLand = landTracts
      .filter(t =>
        t.name?.toLowerCase().includes(searchLower) ||
        t.parcelNumber?.toLowerCase().includes(searchLower) ||
        t.type?.toLowerCase().includes(searchLower)
      )
      .map(t => ({
        id: t.id,
        name: t.name,
        identifier: t.parcelNumber,
        assetType: 'LAND',
        status: t.status === 'active' ? 'ACTIVE' : t.status?.toUpperCase(),
        siteId: t.siteId,
        siteName: t.siteName,
        updatedAt: t.updatedAt,
      }));

    // Combine all results
    const allAssets = [...matchingAnimals, ...matchingLand, ...genericAssets];

    res.json({ success: true, assets: allAssets.slice(0, parsedLimit) });
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
        createdBy: userData.user.id,
        updatedBy: userData.user.id,
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
        updatedBy: userData.user.id,
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
        updatedBy: userData.user.id,
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
