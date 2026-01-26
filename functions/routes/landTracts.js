const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { verifyToken, requireRole } = require('../middleware/auth');
const firestoreService = require('../services/firestore');

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Land tract types
const LandType = {
  PARCEL: 'PARCEL',
  FIELD: 'FIELD',
  PASTURE: 'PASTURE',
  INFRASTRUCTURE: 'INFRASTRUCTURE',
  OTHER: 'OTHER',
};

// Land tract statuses
const LandStatus = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
};

/**
 * GET /api/land-tracts
 * List land tracts with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
    if (!userData) {
      return res.status(403).json({ success: false, message: 'User not found' });
    }

    const { siteId, type, status = 'active', page = 1, limit = 50 } = req.query;

    const tracts = await firestoreService.getLandTracts(userData.tenantId, {
      siteId,
      type,
      status,
    });

    // Simple pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const paginatedTracts = tracts.slice(startIndex, startIndex + parseInt(limit));

    res.json({
      success: true,
      data: {
        tracts: paginatedTracts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: tracts.length,
          pages: Math.ceil(tracts.length / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching land tracts:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch land tracts' });
  }
});

/**
 * GET /api/land-tracts/stats
 * Get land tract statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
    if (!userData) {
      return res.status(403).json({ success: false, message: 'User not found' });
    }

    const { siteId } = req.query;

    const stats = await firestoreService.getLandTractStats(userData.tenantId, { siteId });

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching land tract stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch land tract stats' });
  }
});

/**
 * GET /api/land-tracts/:id
 * Get a single land tract
 */
router.get(
  '/:id',
  [param('id').notEmpty().withMessage('Land tract ID is required')],
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

      const tract = await firestoreService.getLandTract(userData.tenantId, req.params.id);

      if (!tract) {
        return res.status(404).json({ success: false, message: 'Land tract not found' });
      }

      res.json({ success: true, data: { tract } });
    } catch (error) {
      console.error('Error fetching land tract:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch land tract' });
    }
  }
);

/**
 * POST /api/land-tracts
 * Create a new land tract
 */
router.post(
  '/',
  [
    body('siteId').notEmpty().withMessage('Site ID is required'),
    body('name').notEmpty().withMessage('Name is required'),
    body('type').isIn(Object.values(LandType)).withMessage('Invalid land type'),
    body('geometry').notEmpty().withMessage('Geometry is required'),
    body('geometry.type').equals('Polygon').withMessage('Geometry must be a Polygon'),
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
        name,
        code,
        type,
        geometry,
        areaSqMeters,
        areaAcres,
        centroid,
        tags = [],
        soil,
        notes,
      } = req.body;

      const tractData = {
        siteId,
        name,
        code: code?.toUpperCase() || null,
        type,
        status: 'active',
        geometry,
        areaSqMeters: areaSqMeters || 0,
        areaAcres: areaAcres || 0,
        centroid: centroid || null,
        tags,
        soil: soil || null,
        notes: notes || null,
        createdBy: userData.user.id,
        updatedBy: userData.user.id,
      };

      const tract = await firestoreService.createLandTract(userData.tenantId, tractData);

      res.status(201).json({ success: true, data: { tract } });
    } catch (error) {
      console.error('Error creating land tract:', error);
      res.status(500).json({ success: false, message: 'Failed to create land tract' });
    }
  }
);

/**
 * PATCH /api/land-tracts/:id
 * Update a land tract
 */
router.patch(
  '/:id',
  [param('id').notEmpty().withMessage('Land tract ID is required')],
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
        name,
        code,
        type,
        geometry,
        areaSqMeters,
        areaAcres,
        centroid,
        tags,
        soil,
        notes,
      } = req.body;

      const updateData = {
        updatedBy: userData.user.id,
      };

      if (name !== undefined) updateData.name = name;
      if (code !== undefined) updateData.code = code?.toUpperCase() || null;
      if (type !== undefined) updateData.type = type;
      if (geometry !== undefined) updateData.geometry = geometry;
      if (areaSqMeters !== undefined) updateData.areaSqMeters = areaSqMeters;
      if (areaAcres !== undefined) updateData.areaAcres = areaAcres;
      if (centroid !== undefined) updateData.centroid = centroid;
      if (tags !== undefined) updateData.tags = tags;
      if (soil !== undefined) updateData.soil = soil;
      if (notes !== undefined) updateData.notes = notes;

      const tract = await firestoreService.updateLandTract(userData.tenantId, req.params.id, updateData);

      res.json({ success: true, data: { tract } });
    } catch (error) {
      console.error('Error updating land tract:', error);
      res.status(500).json({ success: false, message: 'Failed to update land tract' });
    }
  }
);

/**
 * POST /api/land-tracts/:id/status
 * Update land tract status (archive)
 */
router.post(
  '/:id/status',
  requireRole(['owner', 'admin', 'manager']),
  [
    param('id').notEmpty().withMessage('Land tract ID is required'),
    body('status').isIn(Object.values(LandStatus)).withMessage('Invalid status'),
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

      const { status } = req.body;

      const tract = await firestoreService.updateLandTract(userData.tenantId, req.params.id, {
        status,
        updatedBy: userData.user.id,
      });

      res.json({ success: true, data: { tract } });
    } catch (error) {
      console.error('Error updating land tract status:', error);
      res.status(500).json({ success: false, message: 'Failed to update land tract status' });
    }
  }
);

module.exports = router;
