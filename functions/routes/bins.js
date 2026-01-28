const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { verifyToken, requireRole } = require('../middleware/auth');
const firestoreService = require('../services/firestore');

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Bin types for validation
const BinType = firestoreService.BinType;

/**
 * GET /api/bins
 * List all bins with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
    if (!userData) {
      return res.status(403).json({ success: false, message: 'User not found' });
    }

    const { structureId, areaId, isActive = 'true' } = req.query;

    const bins = await firestoreService.getBins(userData.tenantId, {
      structureId,
      areaId: areaId || undefined,
      isActive: isActive === 'true',
    });

    res.json({
      success: true,
      data: { bins },
    });
  } catch (error) {
    console.error('Error fetching bins:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bins' });
  }
});

/**
 * GET /api/bins/types
 * Get available bin types
 */
router.get('/types', async (req, res) => {
  res.json({
    success: true,
    data: {
      types: Object.entries(BinType).map(([key, value]) => ({
        value,
        label: key.charAt(0) + key.slice(1).toLowerCase(),
      })),
    },
  });
});

/**
 * GET /api/bins/check-code
 * Check if a bin code is available
 */
router.get('/check-code', async (req, res) => {
  try {
    const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
    if (!userData) {
      return res.status(403).json({ success: false, message: 'User not found' });
    }

    const { code, excludeBinId } = req.query;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Code is required' });
    }

    const isAvailable = await firestoreService.isBinCodeUnique(
      userData.tenantId,
      code,
      excludeBinId || null
    );

    res.json({
      success: true,
      data: { isAvailable },
    });
  } catch (error) {
    console.error('Error checking bin code:', error);
    res.status(500).json({ success: false, message: 'Failed to check bin code' });
  }
});

/**
 * GET /api/bins/:id
 * Get a single bin
 */
router.get(
  '/:id',
  [param('id').notEmpty().withMessage('Bin ID is required')],
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

      const bin = await firestoreService.getBin(userData.tenantId, req.params.id);

      if (!bin) {
        return res.status(404).json({ success: false, message: 'Bin not found' });
      }

      res.json({ success: true, data: { bin } });
    } catch (error) {
      console.error('Error fetching bin:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch bin' });
    }
  }
);

/**
 * PATCH /api/bins/:id
 * Update a bin
 */
router.patch(
  '/:id',
  [
    param('id').notEmpty().withMessage('Bin ID is required'),
    body('name')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Name cannot exceed 100 characters')
      .trim(),
    body('code')
      .optional()
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

      // Verify bin exists
      const existing = await firestoreService.getBin(userData.tenantId, req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Bin not found' });
      }

      const { name, code, areaId, type, notes, capacity } = req.body;

      const updateData = {
        updatedBy: userData.user.id,
      };

      if (name !== undefined) updateData.name = name.trim();
      if (code !== undefined) updateData.code = code.trim();
      if (areaId !== undefined) updateData.areaId = areaId;
      if (type !== undefined) updateData.type = type;
      if (notes !== undefined) updateData.notes = notes?.trim() || null;
      if (capacity !== undefined) updateData.capacity = capacity;

      const bin = await firestoreService.updateBin(userData.tenantId, req.params.id, updateData);

      res.json({ success: true, data: { bin } });
    } catch (error) {
      console.error('Error updating bin:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to update bin' });
    }
  }
);

/**
 * DELETE /api/bins/:id
 * Soft delete a bin
 */
router.delete(
  '/:id',
  requireRole(['owner', 'admin', 'manager']),
  [param('id').notEmpty().withMessage('Bin ID is required')],
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

      // Verify bin exists
      const existing = await firestoreService.getBin(userData.tenantId, req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Bin not found' });
      }

      await firestoreService.deleteBin(userData.tenantId, req.params.id);

      res.json({
        success: true,
        data: {
          message: 'Bin deleted successfully',
        },
      });
    } catch (error) {
      console.error('Error deleting bin:', error);
      res.status(500).json({ success: false, message: 'Failed to delete bin' });
    }
  }
);

module.exports = router;
