const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { Site } = require('../models');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

/**
 * GET /api/sites
 * List all sites for current tenant
 */
router.get('/', async (req, res) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: 'No tenant associated with user',
      });
    }

    const sites = await Site.find({
      tenantId: req.user.tenantId,
      status: { $ne: 'archived' },
    }).sort({ name: 1 });

    res.json({
      success: true,
      data: { sites },
    });
  } catch (error) {
    console.error('List sites error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list sites',
    });
  }
});

/**
 * GET /api/sites/:id
 * Get single site by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const site = await Site.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found',
      });
    }

    res.json({
      success: true,
      data: { site },
    });
  } catch (error) {
    console.error('Get site error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get site',
    });
  }
});

/**
 * POST /api/sites
 * Create a new site (owner/admin only)
 */
router.post(
  '/',
  requireRole(['owner', 'admin']),
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ max: 100 })
      .withMessage('Name cannot exceed 100 characters'),
    body('code')
      .optional()
      .trim()
      .isLength({ max: 10 })
      .withMessage('Code cannot exceed 10 characters'),
    body('type')
      .optional()
      .isIn(['farm', 'ranch', 'pasture', 'barn', 'feedlot', 'greenhouse', 'storage', 'other']),
    body('acreage')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Acreage must be a positive number'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const {
        name, code, description, address, coordinates, acreage, type, primaryContact,
        boundaryGeometry, boundaryAreaSqMeters, boundaryAreaAcres, boundaryCentroid,
        connectedLandRuleAccepted
      } = req.body;

      // Check site limit based on tenant plan
      const siteCount = await Site.countDocuments({
        tenantId: req.user.tenantId,
        status: { $ne: 'archived' },
      });

      const tenant = req.user.tenantId;
      const planLimits = { starter: 1, professional: -1 };
      const limit = planLimits[tenant.plan] || 1;

      if (limit !== -1 && siteCount >= limit) {
        return res.status(403).json({
          success: false,
          message: `Your ${tenant.plan} plan allows up to ${limit} site(s). Please upgrade to add more.`,
        });
      }

      // Determine status: active if boundary is set, draft otherwise
      const status = boundaryGeometry ? 'active' : 'draft';

      const site = await Site.create({
        tenantId: req.user.tenantId,
        name,
        code: code?.toUpperCase(),
        description,
        address,
        coordinates,
        acreage,
        type,
        primaryContact,
        boundaryGeometry,
        boundaryAreaSqMeters,
        boundaryAreaAcres,
        boundaryCentroid,
        connectedLandRuleAccepted,
        status,
      });

      res.status(201).json({
        success: true,
        data: { site },
      });
    } catch (error) {
      console.error('Create site error:', error);
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'A site with this code already exists',
        });
      }
      res.status(500).json({
        success: false,
        message: 'Failed to create site',
      });
    }
  }
);

/**
 * PATCH /api/sites/:id
 * Update a site (owner/admin only)
 */
router.patch(
  '/:id',
  requireRole(['owner', 'admin']),
  [
    param('id').isMongoId().withMessage('Invalid site ID'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be 1-100 characters'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const site = await Site.findOne({
        _id: req.params.id,
        tenantId: req.user.tenantId,
      });

      if (!site) {
        return res.status(404).json({
          success: false,
          message: 'Site not found',
        });
      }

      const allowedUpdates = [
        'name', 'code', 'description', 'address', 'coordinates',
        'acreage', 'type', 'status', 'primaryContact', 'settings',
        'boundaryGeometry', 'boundaryAreaSqMeters', 'boundaryAreaAcres',
        'boundaryCentroid', 'connectedLandRuleAccepted'
      ];

      allowedUpdates.forEach((field) => {
        if (req.body[field] !== undefined) {
          site[field] = req.body[field];
        }
      });

      // Auto-activate site when boundary is set
      if (req.body.boundaryGeometry && site.status === 'draft') {
        site.status = 'active';
      }

      await site.save();

      res.json({
        success: true,
        data: { site },
      });
    } catch (error) {
      console.error('Update site error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update site',
      });
    }
  }
);

/**
 * DELETE /api/sites/:id
 * Archive a site (owner only)
 */
router.delete(
  '/:id',
  requireRole(['owner']),
  async (req, res) => {
    try {
      const site = await Site.findOne({
        _id: req.params.id,
        tenantId: req.user.tenantId,
      });

      if (!site) {
        return res.status(404).json({
          success: false,
          message: 'Site not found',
        });
      }

      // Soft delete - archive the site
      site.status = 'archived';
      await site.save();

      res.json({
        success: true,
        message: 'Site archived successfully',
      });
    } catch (error) {
      console.error('Delete site error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to archive site',
      });
    }
  }
);

module.exports = router;
