const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { verifyToken, requireRole } = require('../middleware/auth');
const firestoreService = require('../services/firestore');

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Structure types for validation
const StructureType = firestoreService.StructureType;

// ============================================================================
// STRUCTURE ENDPOINTS
// ============================================================================

/**
 * GET /api/structures
 * List structures with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
    if (!userData) {
      return res.status(403).json({ success: false, message: 'User not found' });
    }

    const { landTractId, isActive = 'true' } = req.query;

    const structures = await firestoreService.getStructures(userData.tenantId, {
      landTractId,
      isActive: isActive === 'true',
    });

    res.json({
      success: true,
      data: { structures },
    });
  } catch (error) {
    console.error('Error fetching structures:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch structures' });
  }
});

/**
 * GET /api/structures/:id
 * Get a single structure
 */
router.get(
  '/:id',
  [param('id').notEmpty().withMessage('Structure ID is required')],
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

      const structure = await firestoreService.getStructure(userData.tenantId, req.params.id);

      if (!structure) {
        return res.status(404).json({ success: false, message: 'Structure not found' });
      }

      res.json({ success: true, data: { structure } });
    } catch (error) {
      console.error('Error fetching structure:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch structure' });
    }
  }
);

/**
 * POST /api/structures
 * Create a new structure
 */
router.post(
  '/',
  [
    body('landTractId').notEmpty().withMessage('Land Tract ID is required'),
    body('name')
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ max: 100 })
      .withMessage('Name cannot exceed 100 characters')
      .trim(),
    body('type')
      .optional()
      .isIn(Object.values(StructureType))
      .withMessage('Invalid structure type'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters')
      .trim(),
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

      // Verify land tract exists and belongs to tenant
      const landTract = await firestoreService.getLandTract(userData.tenantId, req.body.landTractId);
      if (!landTract) {
        return res.status(404).json({ success: false, message: 'Land tract not found' });
      }

      const { landTractId, name, type, description } = req.body;

      const structureData = {
        landTractId,
        name: name.trim(),
        type: type || null,
        description: description?.trim() || null,
        createdBy: userData.user.id,
        updatedBy: userData.user.id,
      };

      const structure = await firestoreService.createStructure(userData.tenantId, structureData);

      res.status(201).json({ success: true, data: { structure } });
    } catch (error) {
      console.error('Error creating structure:', error);
      res.status(500).json({ success: false, message: 'Failed to create structure' });
    }
  }
);

/**
 * PATCH /api/structures/:id
 * Update a structure
 */
router.patch(
  '/:id',
  [
    param('id').notEmpty().withMessage('Structure ID is required'),
    body('name')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Name cannot exceed 100 characters')
      .trim(),
    body('type')
      .optional()
      .isIn([...Object.values(StructureType), null])
      .withMessage('Invalid structure type'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters')
      .trim(),
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

      // Verify structure exists
      const existing = await firestoreService.getStructure(userData.tenantId, req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Structure not found' });
      }

      const { name, type, description } = req.body;

      const updateData = {
        updatedBy: userData.user.id,
      };

      if (name !== undefined) updateData.name = name.trim();
      if (type !== undefined) updateData.type = type;
      if (description !== undefined) updateData.description = description?.trim() || null;

      const structure = await firestoreService.updateStructure(userData.tenantId, req.params.id, updateData);

      res.json({ success: true, data: { structure } });
    } catch (error) {
      console.error('Error updating structure:', error);
      res.status(500).json({ success: false, message: 'Failed to update structure' });
    }
  }
);

/**
 * DELETE /api/structures/:id
 * Soft delete a structure (cascades to areas)
 */
router.delete(
  '/:id',
  requireRole(['owner', 'admin', 'manager']),
  [param('id').notEmpty().withMessage('Structure ID is required')],
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

      // Verify structure exists
      const existing = await firestoreService.getStructure(userData.tenantId, req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Structure not found' });
      }

      const result = await firestoreService.deleteStructure(userData.tenantId, req.params.id);

      res.json({
        success: true,
        data: {
          message: 'Structure deleted successfully',
          areasAffected: result.areasAffected,
        },
      });
    } catch (error) {
      console.error('Error deleting structure:', error);
      res.status(500).json({ success: false, message: 'Failed to delete structure' });
    }
  }
);

// ============================================================================
// AREA ENDPOINTS (nested under structures)
// ============================================================================

/**
 * GET /api/structures/:structureId/areas
 * List areas for a structure
 */
router.get(
  '/:structureId/areas',
  [param('structureId').notEmpty().withMessage('Structure ID is required')],
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

      const { isActive = 'true' } = req.query;

      const areas = await firestoreService.getAreas(userData.tenantId, {
        structureId: req.params.structureId,
        isActive: isActive === 'true',
      });

      res.json({
        success: true,
        data: { areas },
      });
    } catch (error) {
      console.error('Error fetching areas:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch areas' });
    }
  }
);

/**
 * POST /api/structures/:structureId/areas
 * Create a new area under a structure
 */
router.post(
  '/:structureId/areas',
  [
    param('structureId').notEmpty().withMessage('Structure ID is required'),
    body('name')
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ max: 100 })
      .withMessage('Name cannot exceed 100 characters')
      .trim(),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters')
      .trim(),
    body('sortOrder')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Sort order must be a non-negative integer'),
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

      // Verify structure exists and belongs to tenant
      const structure = await firestoreService.getStructure(userData.tenantId, req.params.structureId);
      if (!structure) {
        return res.status(404).json({ success: false, message: 'Structure not found' });
      }

      const { name, description, sortOrder } = req.body;

      const areaData = {
        structureId: req.params.structureId,
        name: name.trim(),
        description: description?.trim() || null,
        sortOrder: sortOrder || 0,
        createdBy: userData.user.id,
        updatedBy: userData.user.id,
      };

      const area = await firestoreService.createArea(userData.tenantId, areaData);

      res.status(201).json({ success: true, data: { area } });
    } catch (error) {
      console.error('Error creating area:', error);
      res.status(500).json({ success: false, message: 'Failed to create area' });
    }
  }
);

// ============================================================================
// BIN ENDPOINTS (nested under structures)
// ============================================================================

// Bin types for validation
const BinType = firestoreService.BinType;

/**
 * GET /api/structures/:structureId/bins
 * List bins for a structure
 */
router.get(
  '/:structureId/bins',
  [param('structureId').notEmpty().withMessage('Structure ID is required')],
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

      const { areaId, isActive = 'true', groupByArea } = req.query;

      const bins = await firestoreService.getBins(userData.tenantId, {
        structureId: req.params.structureId,
        areaId: areaId || undefined,
        isActive: isActive === 'true',
      });

      // Optionally group by area
      if (groupByArea === 'true') {
        // Get areas for this structure
        const areas = await firestoreService.getAreas(userData.tenantId, {
          structureId: req.params.structureId,
          isActive: true,
        });

        const areaMap = {};
        areas.forEach(area => {
          areaMap[area.id] = { ...area, bins: [] };
        });

        // Group for structure-level bins (no area)
        const structureLevelBins = [];

        bins.forEach(bin => {
          if (bin.areaId && areaMap[bin.areaId]) {
            areaMap[bin.areaId].bins.push(bin);
          } else {
            structureLevelBins.push(bin);
          }
        });

        return res.json({
          success: true,
          data: {
            structureLevelBins,
            areaGroups: Object.values(areaMap).filter(area => area.bins.length > 0),
            totalCount: bins.length,
          },
        });
      }

      res.json({
        success: true,
        data: { bins },
      });
    } catch (error) {
      console.error('Error fetching bins:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch bins' });
    }
  }
);

/**
 * POST /api/structures/:structureId/bins
 * Create a new bin under a structure
 */
router.post(
  '/:structureId/bins',
  [
    param('structureId').notEmpty().withMessage('Structure ID is required'),
    body('name')
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ max: 100 })
      .withMessage('Name cannot exceed 100 characters')
      .trim(),
    body('code')
      .notEmpty()
      .withMessage('Code is required')
      .isLength({ min: 2, max: 30 })
      .withMessage('Code must be 2-30 characters')
      .trim(),
    body('areaId')
      .optional({ nullable: true }),
    body('type')
      .optional()
      .isIn([...Object.values(BinType), null])
      .withMessage('Invalid bin type'),
    body('notes')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters')
      .trim(),
    body('capacity')
      .optional()
      .isObject()
      .withMessage('Capacity must be an object'),
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

      // Verify structure exists and belongs to tenant
      const structure = await firestoreService.getStructure(userData.tenantId, req.params.structureId);
      if (!structure) {
        return res.status(404).json({ success: false, message: 'Structure not found' });
      }

      const { name, code, areaId, type, notes, capacity } = req.body;

      const binData = {
        structureId: req.params.structureId,
        landTractId: structure.landTractId,
        areaId: areaId || null,
        name: name.trim(),
        code: code.trim(),
        type: type || null,
        notes: notes?.trim() || null,
        capacity: capacity || null,
        createdBy: userData.user.id,
        updatedBy: userData.user.id,
      };

      const bin = await firestoreService.createBin(userData.tenantId, binData);

      res.status(201).json({ success: true, data: { bin } });
    } catch (error) {
      console.error('Error creating bin:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to create bin' });
    }
  }
);

module.exports = router;
