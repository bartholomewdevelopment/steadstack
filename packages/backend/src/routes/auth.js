const express = require('express');
const { body, validationResult } = require('express-validator');
const { User, Tenant } = require('../models');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/sync
 * Sync Firebase user to MongoDB
 * Creates user and tenant if first time, updates if existing
 */
router.post(
  '/sync',
  verifyToken,
  [
    body('farmName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Farm name must be 2-100 characters'),
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

      const { uid, email, name, picture } = req.firebaseUser;
      const { farmName } = req.body;

      // Check if user already exists
      let user = await User.findOne({ firebaseUid: uid }).populate('tenantId');

      if (user) {
        // Update existing user
        user.email = email;
        user.displayName = name || user.displayName;
        user.photoURL = picture || user.photoURL;
        user.lastLoginAt = new Date();
        await user.save();

        return res.json({
          success: true,
          data: {
            user: {
              id: user._id,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              role: user.role,
              tenant: user.tenantId ? {
                id: user.tenantId._id,
                name: user.tenantId.name,
                slug: user.tenantId.slug,
                plan: user.tenantId.plan,
              } : null,
            },
            isNewUser: false,
          },
        });
      }

      // Create new tenant for new user
      const tenantName = farmName || `${name || email.split('@')[0]}'s Farm`;
      const slug = tenantName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        + '-' + Date.now().toString(36);

      const tenant = await Tenant.create({
        name: tenantName,
        slug,
        plan: 'starter',
        status: 'trial',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      });

      // Create new user
      user = await User.create({
        firebaseUid: uid,
        email,
        displayName: name || email.split('@')[0],
        photoURL: picture,
        tenantId: tenant._id,
        role: 'owner',
        status: 'active',
        lastLoginAt: new Date(),
      });

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user._id,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            role: user.role,
            tenant: {
              id: tenant._id,
              name: tenant.name,
              slug: tenant.slug,
              plan: tenant.plan,
            },
          },
          isNewUser: true,
        },
      });
    } catch (error) {
      console.error('User sync error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to sync user',
      });
    }
  }
);

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', verifyToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please sync first.',
      });
    }

    const user = await User.findById(req.user._id).populate('tenantId');

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: user.role,
          settings: user.settings,
          tenant: user.tenantId ? {
            id: user.tenantId._id,
            name: user.tenantId.name,
            slug: user.tenantId.slug,
            plan: user.tenantId.plan,
            status: user.tenantId.status,
          } : null,
        },
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
    });
  }
});

/**
 * PATCH /api/auth/me
 * Update current user profile
 */
router.patch(
  '/me',
  verifyToken,
  [
    body('displayName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Display name must be 2-100 characters'),
    body('settings.timezone')
      .optional()
      .isString(),
    body('settings.dateFormat')
      .optional()
      .isIn(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']),
  ],
  async (req, res) => {
    try {
      if (!req.user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { displayName, settings } = req.body;

      const user = await User.findById(req.user._id);

      if (displayName) user.displayName = displayName;
      if (settings) {
        user.settings = { ...user.settings, ...settings };
      }

      await user.save();

      res.json({
        success: true,
        data: {
          user: {
            id: user._id,
            displayName: user.displayName,
            settings: user.settings,
          },
        },
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
      });
    }
  }
);

module.exports = router;
