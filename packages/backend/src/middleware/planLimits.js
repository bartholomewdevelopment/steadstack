/**
 * Plan Limits Middleware
 *
 * Middleware factories for enforcing plan limits and feature gates.
 * Must be used after verifyToken middleware.
 */

const firestoreService = require('../services/firestore');
const planLimitsService = require('../services/plan-limits-service');
const { getPlanConfig, getResourceDisplayName } = require('../config/plans');

/**
 * Middleware factory to check if a resource limit allows the operation
 * Returns 402 if limit exceeded with upgrade suggestion
 *
 * @param {string} resourceType - The resource type to check (e.g., 'animals', 'sites')
 * @param {function} [getIncrement] - Optional function(req) that returns the increment amount
 * @returns {function} Express middleware
 */
const checkPlanLimit = (resourceType, getIncrement = () => 1) => {
  return async (req, res, next) => {
    try {
      // Get user context from Firestore
      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({
          success: false,
          message: 'User not found',
        });
      }

      // Get tenant info to determine plan
      const tenant = await firestoreService.getTenant(userData.tenantId);
      if (!tenant) {
        return res.status(403).json({
          success: false,
          message: 'Tenant not found',
        });
      }

      const plan = tenant.plan || 'free';
      const increment = typeof getIncrement === 'function' ? getIncrement(req) : 1;

      // Check the limit
      const result = await planLimitsService.checkLimit(
        userData.tenantId,
        plan,
        resourceType,
        increment
      );

      if (!result.allowed) {
        const planConfig = getPlanConfig(plan);
        const displayName = getResourceDisplayName(resourceType);

        return res.status(402).json({
          success: false,
          code: 'PLAN_LIMIT_EXCEEDED',
          message: `You've reached your ${planConfig.name} plan limit for ${displayName} (${result.current}/${result.limit})`,
          data: {
            resourceType,
            current: result.current,
            limit: result.limit,
            plan,
            planName: planConfig.name,
            percentUsed: result.percentUsed,
            suggestedPlan: result.suggestedPlan,
          },
        });
      }

      // Attach usage info for potential warning in response
      req.planUsage = {
        resourceType,
        ...result,
        plan,
      };

      // Attach tenant and user data for downstream use
      req.tenantData = tenant;
      req.userData = userData;

      next();
    } catch (error) {
      console.error('Plan limit check error:', error);
      // Don't block on errors - allow the request to proceed
      // but log for investigation
      next();
    }
  };
};

/**
 * Middleware factory to check if a feature is enabled for the tenant's plan
 * Returns 403 if feature is not available
 *
 * @param {string} featureName - The feature to check (e.g., 'purchasingEnabled', 'advancedAccounting')
 * @returns {function} Express middleware
 */
const requireFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      // Get user context from Firestore
      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({
          success: false,
          message: 'User not found',
        });
      }

      // Get tenant info to determine plan
      const tenant = await firestoreService.getTenant(userData.tenantId);
      if (!tenant) {
        return res.status(403).json({
          success: false,
          message: 'Tenant not found',
        });
      }

      const plan = tenant.plan || 'free';
      const featureEnabled = planLimitsService.checkFeatureEnabled(plan, featureName);

      if (!featureEnabled) {
        const planConfig = getPlanConfig(plan);

        // Find the first plan that has this feature
        const { PLAN_ORDER } = require('../config/plans');
        const { isFeatureEnabled } = require('../config/plans');
        let requiredPlan = null;
        for (const planName of PLAN_ORDER) {
          if (isFeatureEnabled(planName, featureName)) {
            requiredPlan = planName;
            break;
          }
        }

        const featureDisplayNames = {
          purchasingEnabled: 'Purchasing',
          advancedAccounting: 'Advanced Accounting (A/R, A/P, Reconciliation)',
        };

        return res.status(403).json({
          success: false,
          code: 'FEATURE_NOT_AVAILABLE',
          message: `${featureDisplayNames[featureName] || featureName} is not available on the ${planConfig.name} plan`,
          data: {
            feature: featureName,
            plan,
            planName: planConfig.name,
            requiredPlan,
          },
        });
      }

      // Attach tenant and user data for downstream use
      req.tenantData = tenant;
      req.userData = userData;

      next();
    } catch (error) {
      console.error('Feature check error:', error);
      // Don't block on errors
      next();
    }
  };
};

/**
 * Helper middleware to increment usage after a successful create
 * Use in the route handler after the resource is created
 *
 * @param {string} resourceType - The resource type to increment
 * @param {number} [amount=1] - Amount to increment
 * @returns {Promise<void>}
 */
const incrementUsageAfterCreate = async (tenantId, resourceType, amount = 1) => {
  try {
    await planLimitsService.incrementUsage(tenantId, resourceType, amount);
  } catch (error) {
    console.error('Failed to increment usage:', error);
    // Don't throw - resource was created successfully
  }
};

/**
 * Helper to decrement usage after a delete
 *
 * @param {string} tenantId
 * @param {string} resourceType
 * @param {number} [amount=1]
 * @returns {Promise<void>}
 */
const decrementUsageAfterDelete = async (tenantId, resourceType, amount = 1) => {
  try {
    await planLimitsService.decrementUsage(tenantId, resourceType, amount);
  } catch (error) {
    console.error('Failed to decrement usage:', error);
  }
};

/**
 * Combined middleware that checks limit AND increments atomically
 * This prevents race conditions where two concurrent requests could exceed the limit
 *
 * @param {string} resourceType - The resource type to check
 * @returns {function} Express middleware
 */
const checkAndIncrementLimit = (resourceType) => {
  return async (req, res, next) => {
    try {
      // Get user context from Firestore
      const userData = await firestoreService.findUserByAuthUid(req.firebaseUser.uid);
      if (!userData) {
        return res.status(403).json({
          success: false,
          message: 'User not found',
        });
      }

      // Get tenant info to determine plan
      const tenant = await firestoreService.getTenant(userData.tenantId);
      if (!tenant) {
        return res.status(403).json({
          success: false,
          message: 'Tenant not found',
        });
      }

      const plan = tenant.plan || 'free';

      // Atomically check and increment
      const result = await planLimitsService.checkAndIncrement(
        userData.tenantId,
        plan,
        resourceType,
        1
      );

      if (!result.allowed) {
        const planConfig = getPlanConfig(plan);
        const displayName = getResourceDisplayName(resourceType);

        return res.status(402).json({
          success: false,
          code: 'PLAN_LIMIT_EXCEEDED',
          message: `You've reached your ${planConfig.name} plan limit for ${displayName} (${result.current}/${result.limit})`,
          data: {
            resourceType,
            current: result.current,
            limit: result.limit,
            plan,
            planName: planConfig.name,
            percentUsed: result.percentUsed,
            suggestedPlan: result.suggestedPlan,
          },
        });
      }

      // Mark that we've already incremented (for rollback if create fails)
      req.usageIncremented = {
        tenantId: userData.tenantId,
        resourceType,
      };

      // Attach tenant and user data for downstream use
      req.tenantData = tenant;
      req.userData = userData;

      next();
    } catch (error) {
      console.error('Check and increment error:', error);
      next();
    }
  };
};

/**
 * Rollback usage increment if the create operation fails
 * Call this in error handlers
 *
 * @param {object} req - Express request with usageIncremented info
 * @returns {Promise<void>}
 */
const rollbackUsageIncrement = async (req) => {
  if (req.usageIncremented) {
    const { tenantId, resourceType } = req.usageIncremented;
    await planLimitsService.decrementUsage(tenantId, resourceType, 1);
  }
};

module.exports = {
  checkPlanLimit,
  requireFeature,
  incrementUsageAfterCreate,
  decrementUsageAfterDelete,
  checkAndIncrementLimit,
  rollbackUsageIncrement,
};
