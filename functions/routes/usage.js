/**
 * Usage API Routes
 *
 * Provides tenant usage information and plan limits.
 */

const express = require('express');
const { verifyToken } = require('../middleware/auth');
const firestoreService = require('../services/firestore');
const planLimitsService = require('../services/plan-limits-service');
const { PLAN_LIMITS, getPlanConfig } = require('../config/plans');
const Tenant = require('../models/Tenant');

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

/**
 * GET /api/usage
 * Get current usage summary with plan limits
 */
router.get('/', async (req, res) => {
  try {
    const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
    if (!userData) {
      return res.status(403).json({
        success: false,
        message: 'User not found',
      });
    }

    const tenant = await firestoreService.getTenant(userData.tenantId);
    if (!tenant) {
      return res.status(403).json({
        success: false,
        message: 'Tenant not found',
      });
    }

    let plan = tenant.plan || 'free';

    // If Mongo tenant exists, prefer its plan (Stripe sync updates Mongo first)
    const mongoTenant = await Tenant.findOne({ firestoreId: userData.tenantId }).lean();
    if (mongoTenant?.plan && mongoTenant.plan !== plan) {
      plan = mongoTenant.plan;
      // Keep Firestore tenant in sync for future reads
      await firestoreService.updateTenant(userData.tenantId, { plan });
    }
    const summary = await planLimitsService.getUsageSummary(userData.tenantId, plan);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch usage',
    });
  }
});

/**
 * GET /api/usage/plans
 * Get available plans and their limits (public info for upgrade comparison)
 */
router.get('/plans', async (req, res) => {
  try {
    const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
    if (!userData) {
      return res.status(403).json({
        success: false,
        message: 'User not found',
      });
    }

    const tenant = await firestoreService.getTenant(userData.tenantId);
    const currentPlan = tenant?.plan || 'free';

    // Return all plans with current plan marked
    const plans = Object.entries(PLAN_LIMITS).map(([key, config]) => ({
      id: key,
      name: config.name,
      price: config.price,
      priceAnnual: config.priceAnnual,
      description: config.description,
      limits: config.limits,
      features: config.features,
      isCurrent: key === currentPlan,
    }));

    res.json({
      success: true,
      data: {
        currentPlan,
        plans,
      },
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch plans',
    });
  }
});

/**
 * GET /api/usage/check/:resourceType
 * Check if a specific resource can be created
 */
router.get('/check/:resourceType', async (req, res) => {
  try {
    const { resourceType } = req.params;
    const increment = parseInt(req.query.increment) || 1;

    const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
    if (!userData) {
      return res.status(403).json({
        success: false,
        message: 'User not found',
      });
    }

    const tenant = await firestoreService.getTenant(userData.tenantId);
    if (!tenant) {
      return res.status(403).json({
        success: false,
        message: 'Tenant not found',
      });
    }

    const plan = tenant.plan || 'free';
    const result = await planLimitsService.checkLimit(userData.tenantId, plan, resourceType, increment);

    res.json({
      success: true,
      data: {
        resourceType,
        ...result,
        plan,
      },
    });
  } catch (error) {
    console.error('Error checking limit:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check limit',
    });
  }
});

module.exports = router;
