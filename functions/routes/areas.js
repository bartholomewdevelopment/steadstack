const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { verifyToken, requireRole } = require('../middleware/auth');
const firestoreService = require('../services/firestore');

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

/**
 * GET /api/areas
 * List all areas (across all structures)
 */
router.get('/', async (req, res) => {
  try {
    const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
    if (!userData) {
      return res.status(403).json({ success: false, message: 'User not found' });
    }

    const { structureId, isActive = 'true' } = req.query;

    const areas = await firestoreService.getAreas(userData.tenantId, {
      structureId: structureId || undefined,
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
});

/**
 * GET /api/areas/:id
 * Get a single area
 */
router.get(
  '/:id',
  [param('id').notEmpty().withMessage('Area ID is required')],
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

      const area = await firestoreService.getArea(userData.tenantId, req.params.id);

      if (!area) {
        return res.status(404).json({ success: false, message: 'Area not found' });
      }

      res.json({ success: true, data: { area } });
    } catch (error) {
      console.error('Error fetching area:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch area' });
    }
  }
);

/**
 * PATCH /api/areas/:id
 * Update an area
 */
router.patch(
  '/:id',
  [
    param('id').notEmpty().withMessage('Area ID is required'),
    body('name')
      .optional()
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

      // Verify area exists
      const existing = await firestoreService.getArea(userData.tenantId, req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Area not found' });
      }

      const { name, description, sortOrder } = req.body;

      const updateData = {
        updatedBy: userData.user.id,
      };

      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description?.trim() || null;
      if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

      const area = await firestoreService.updateArea(userData.tenantId, req.params.id, updateData);

      res.json({ success: true, data: { area } });
    } catch (error) {
      console.error('Error updating area:', error);
      res.status(500).json({ success: false, message: 'Failed to update area' });
    }
  }
);

/**
 * DELETE /api/areas/:id
 * Soft delete an area
 */
router.delete(
  '/:id',
  requireRole(['owner', 'admin', 'manager']),
  [param('id').notEmpty().withMessage('Area ID is required')],
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

      // Verify area exists
      const existing = await firestoreService.getArea(userData.tenantId, req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Area not found' });
      }

      await firestoreService.deleteArea(userData.tenantId, req.params.id);

      res.json({
        success: true,
        data: { message: 'Area deleted successfully' },
      });
    } catch (error) {
      console.error('Error deleting area:', error);
      res.status(500).json({ success: false, message: 'Failed to delete area' });
    }
  }
);

module.exports = router;
