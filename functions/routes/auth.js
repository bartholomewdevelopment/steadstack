const express = require('express');
const { body, validationResult } = require('express-validator');
const { User, Tenant } = require('../models');
const { verifyToken } = require('../middleware/auth');
const firestoreService = require('../services/firestore');
const { seedChartOfAccounts } = require('../services/accounting');

const router = express.Router();

/**
 * POST /api/auth/sync
 * Sync Firebase user with Firestore tenant/user + MongoDB accounting
 * Creates tenant and user if first time, updates if existing
 */
router.post(
  '/sync',
  verifyToken,
  [
    body('farmName')
      .optional({ values: 'falsy' })
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Farm name must be 2-100 characters'),
    body('timezone')
      .optional({ values: 'falsy' })
      .trim()
      .isString(),
  ],
  async (req, res) => {
    try {
      console.log('Auth sync called for:', req.firebaseUser?.email);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array());
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { uid, email, name, picture } = req.firebaseUser;
      const { farmName, timezone } = req.body;

      // Check if user exists in Firestore
      let existingData = await firestoreService.findUserByAuthUid(uid);

      if (existingData) {
        // Update existing user in Firestore
        const { tenantId, tenant, user } = existingData;

        await firestoreService.upsertUser(tenantId, {
          authUid: uid,
          email,
          displayName: name || user.displayName,
          photoURL: picture || user.photoURL,
        });

        // Also update MongoDB for backward compatibility
        await User.findOneAndUpdate(
          { firebaseUid: uid },
          {
            email,
            displayName: name || email.split('@')[0],
            photoURL: picture,
            lastLoginAt: new Date(),
          },
          { upsert: false }
        );

        return res.json({
          success: true,
          data: {
            user: {
              id: user.id,
              authUid: uid,
              email,
              displayName: name || user.displayName,
              photoURL: picture || user.photoURL,
              roles: user.roles,
              tenant: {
                id: tenantId,
                name: tenant.name,
                timezone: tenant.timezone,
                settings: tenant.settings,
              },
            },
            isNewUser: false,
          },
        });
      }

      // Create new tenant in Firestore
      const tenantName = farmName || `${name || email.split('@')[0]}'s Farm`;
      const tenantTimezone = timezone || 'America/New_York';

      console.log('Creating new tenant:', tenantName);

      const newTenant = await firestoreService.createTenant({
        name: tenantName,
        timezone: tenantTimezone,
        settings: {
          livestockCostingMode: 'EXPENSE',
          autoReorderEnabled: false,
          autoReorderApprovalRequired: true,
        },
      });

      // Create user in Firestore
      const newUser = await firestoreService.upsertUser(newTenant.id, {
        authUid: uid,
        email,
        displayName: name || email.split('@')[0],
        photoURL: picture,
        roles: ['owner'],
      });

      // Seed Chart of Accounts in MongoDB for this tenant
      console.log('Seeding Chart of Accounts for tenant:', newTenant.id);
      await seedChartOfAccounts(newTenant.id);

      // Also create in MongoDB for backward compatibility
      const slug =
        tenantName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') +
        '-' +
        Date.now().toString(36);

      const mongoTenant = await Tenant.create({
        name: tenantName,
        slug,
        plan: 'starter',
        status: 'trial',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        firestoreId: newTenant.id, // Link to Firestore
      });

      await User.create({
        firebaseUid: uid,
        email,
        displayName: name || email.split('@')[0],
        photoURL: picture,
        tenantId: mongoTenant._id,
        firestoreTenantId: newTenant.id, // Link to Firestore
        role: 'owner',
        status: 'active',
        lastLoginAt: new Date(),
      });

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: newUser.id,
            authUid: uid,
            email,
            displayName: name || email.split('@')[0],
            photoURL: picture,
            roles: ['owner'],
            tenant: {
              id: newTenant.id,
              name: newTenant.name,
              timezone: newTenant.timezone,
              settings: newTenant.settings,
            },
          },
          isNewUser: true,
        },
      });
    } catch (error) {
      console.error('User sync error:', error.message, error.stack);
      res.status(500).json({
        success: false,
        message: 'Failed to sync user',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * GET /api/auth/me
 * Get current user profile from Firestore
 */
router.get('/me', verifyToken, async (req, res) => {
  try {
    const { uid, email, name, picture } = req.firebaseUser;

    // Try Firestore first
    const firestoreData = await firestoreService.findUserByAuthUid(uid);

    if (firestoreData) {
      const { tenantId, tenant, user } = firestoreData;

      return res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            authUid: uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            roles: user.roles,
            tenant: {
              id: tenantId,
              name: tenant.name,
              timezone: tenant.timezone,
              settings: tenant.settings,
            },
          },
        },
      });
    }

    // Fallback to MongoDB
    if (req.user) {
      const user = await User.findById(req.user._id).populate('tenantId');

      return res.json({
        success: true,
        data: {
          user: {
            id: user._id,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            role: user.role,
            settings: user.settings,
            tenant: user.tenantId
              ? {
                  id: user.tenantId._id,
                  name: user.tenantId.name,
                  slug: user.tenantId.slug,
                  plan: user.tenantId.plan,
                  status: user.tenantId.status,
                }
              : null,
          },
        },
      });
    }

    return res.status(404).json({
      success: false,
      message: 'User not found. Please sync first.',
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
    body('settings.timezone').optional().isString(),
    body('settings.dateFormat')
      .optional()
      .isIn(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']),
  ],
  async (req, res) => {
    try {
      const { uid } = req.firebaseUser;

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { displayName, photoURL } = req.body;

      // Update in Firestore
      const firestoreData = await firestoreService.findUserByAuthUid(uid);

      if (firestoreData) {
        const updates = {};
        if (displayName) updates.displayName = displayName;
        if (photoURL) updates.photoURL = photoURL;

        await firestoreService.upsertUser(firestoreData.tenantId, {
          authUid: uid,
          email: firestoreData.user.email,
          ...firestoreData.user,
          ...updates,
        });
      }

      // Also update MongoDB for backward compatibility
      if (req.user) {
        const user = await User.findById(req.user._id);
        if (displayName) user.displayName = displayName;
        if (req.body.settings) {
          user.settings = { ...user.settings, ...req.body.settings };
        }
        await user.save();
      }

      res.json({
        success: true,
        data: {
          message: 'Profile updated successfully',
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
