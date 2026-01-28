/**
 * Plan Limits Service
 *
 * Handles usage tracking and limit enforcement for tenant plans.
 * Uses Firestore for atomic usage counter operations.
 */

const { db, admin } = require('../config/firebase-admin');
const { FieldValue } = admin.firestore;
const {
  getPlanLimits,
  getPlanConfig,
  isUnlimited,
  getLimit,
  isFeatureEnabled,
  suggestUpgradePlan,
  getResourceDisplayName,
  LEGACY_PLAN_MAP,
} = require('../config/plans');

/**
 * Get the usage document reference for a tenant
 * @param {string} tenantId
 * @returns {FirebaseFirestore.DocumentReference}
 */
const getUsageRef = (tenantId) => {
  return db.collection('tenants').doc(tenantId).collection('usage').doc('current');
};

/**
 * Initialize usage document for a new tenant
 * @param {string} tenantId
 * @param {Date} billingCycleStart - When the billing cycle started
 * @returns {Promise<void>}
 */
const initializeUsage = async (tenantId, billingCycleStart = new Date()) => {
  const usageRef = getUsageRef(tenantId);

  // Calculate billing cycle end (1 month from start)
  const billingCycleEnd = new Date(billingCycleStart);
  billingCycleEnd.setMonth(billingCycleEnd.getMonth() + 1);

  const initialUsage = {
    billingCycleStart: admin.firestore.Timestamp.fromDate(billingCycleStart),
    billingCycleEnd: admin.firestore.Timestamp.fromDate(billingCycleEnd),

    // Monthly counters (reset each billing cycle)
    eventsThisCycle: 0,
    posThisCycle: 0,
    billsThisCycle: 0,

    // Cumulative counters (never reset)
    sites: 0,
    users: 0,
    animals: 0,
    activeTasks: 0,
    runlists: 0,
    inventoryItems: 0,
    contacts: 0,

    lastUpdated: FieldValue.serverTimestamp(),
  };

  await usageRef.set(initialUsage, { merge: true });
};

/**
 * Get current usage for a tenant
 * @param {string} tenantId
 * @returns {Promise<object>} Usage data
 */
const getTenantUsage = async (tenantId) => {
  const usageRef = getUsageRef(tenantId);
  const usageDoc = await usageRef.get();

  if (!usageDoc.exists) {
    // Initialize usage if it doesn't exist
    await initializeUsage(tenantId);
    const newDoc = await usageRef.get();
    return newDoc.data();
  }

  const usage = usageDoc.data();

  // Check if billing cycle needs to be reset
  const now = new Date();
  if (usage.billingCycleEnd && usage.billingCycleEnd.toDate() <= now) {
    await resetBillingCycle(tenantId);
    const updatedDoc = await usageRef.get();
    return updatedDoc.data();
  }

  return usage;
};

/**
 * Reset the billing cycle counters
 * @param {string} tenantId
 * @returns {Promise<void>}
 */
const resetBillingCycle = async (tenantId) => {
  const usageRef = getUsageRef(tenantId);
  const usageDoc = await usageRef.get();

  if (!usageDoc.exists) return;

  const usage = usageDoc.data();
  const oldCycleEnd = usage.billingCycleEnd?.toDate() || new Date();

  // New cycle starts where old one ended
  const newCycleStart = new Date(oldCycleEnd);
  const newCycleEnd = new Date(newCycleStart);
  newCycleEnd.setMonth(newCycleEnd.getMonth() + 1);

  await usageRef.update({
    billingCycleStart: admin.firestore.Timestamp.fromDate(newCycleStart),
    billingCycleEnd: admin.firestore.Timestamp.fromDate(newCycleEnd),
    eventsThisCycle: 0,
    posThisCycle: 0,
    billsThisCycle: 0,
    lastUpdated: FieldValue.serverTimestamp(),
  });
};

/**
 * Map resource types to their usage field names
 */
const RESOURCE_TO_FIELD = {
  sites: 'sites',
  users: 'users',
  animals: 'animals',
  activeTasks: 'activeTasks',
  runlists: 'runlists',
  inventoryItems: 'inventoryItems',
  contacts: 'contacts',
  eventsPerMonth: 'eventsThisCycle',
  posPerMonth: 'posThisCycle',
  billsPerMonth: 'billsThisCycle',
};

/**
 * Check if a tenant can create more of a resource
 * @param {string} tenantId
 * @param {string} plan - Tenant's current plan
 * @param {string} resourceType - Type of resource (e.g., 'animals', 'sites')
 * @param {number} increment - How many to add (default 1)
 * @returns {Promise<object>} { allowed, current, limit, percentUsed, suggestedPlan }
 */
const checkLimit = async (tenantId, plan, resourceType, increment = 1) => {
  const normalizedPlan = LEGACY_PLAN_MAP[plan] || plan;
  const limit = getLimit(normalizedPlan, resourceType);

  // Unlimited
  if (isUnlimited(limit)) {
    return {
      allowed: true,
      current: 0,
      limit: -1,
      percentUsed: 0,
      isUnlimited: true,
    };
  }

  const usage = await getTenantUsage(tenantId);
  const fieldName = RESOURCE_TO_FIELD[resourceType] || resourceType;
  const current = usage[fieldName] || 0;
  const newTotal = current + increment;

  const allowed = newTotal <= limit;
  const percentUsed = limit > 0 ? Math.round((current / limit) * 100) : 0;

  return {
    allowed,
    current,
    limit,
    percentUsed,
    newTotal,
    isUnlimited: false,
    suggestedPlan: allowed ? null : suggestUpgradePlan(normalizedPlan, resourceType, newTotal),
  };
};

/**
 * Increment usage counter for a resource
 * @param {string} tenantId
 * @param {string} resourceType
 * @param {number} amount - Amount to increment (default 1)
 * @returns {Promise<void>}
 */
const incrementUsage = async (tenantId, resourceType, amount = 1) => {
  const usageRef = getUsageRef(tenantId);
  const fieldName = RESOURCE_TO_FIELD[resourceType] || resourceType;

  // First ensure usage doc exists
  const usageDoc = await usageRef.get();
  if (!usageDoc.exists) {
    await initializeUsage(tenantId);
  }

  await usageRef.update({
    [fieldName]: FieldValue.increment(amount),
    lastUpdated: FieldValue.serverTimestamp(),
  });
};

/**
 * Decrement usage counter for a resource
 * @param {string} tenantId
 * @param {string} resourceType
 * @param {number} amount - Amount to decrement (default 1)
 * @returns {Promise<void>}
 */
const decrementUsage = async (tenantId, resourceType, amount = 1) => {
  const usageRef = getUsageRef(tenantId);
  const fieldName = RESOURCE_TO_FIELD[resourceType] || resourceType;

  const usageDoc = await usageRef.get();
  if (!usageDoc.exists) return;

  // Ensure we don't go below 0
  const current = usageDoc.data()[fieldName] || 0;
  const decrement = Math.min(amount, current);

  if (decrement > 0) {
    await usageRef.update({
      [fieldName]: FieldValue.increment(-decrement),
      lastUpdated: FieldValue.serverTimestamp(),
    });
  }
};

/**
 * Get a complete usage summary with all limits and percentages
 * @param {string} tenantId
 * @param {string} plan - Tenant's current plan
 * @returns {Promise<object>} Complete usage summary
 */
const getUsageSummary = async (tenantId, plan) => {
  const normalizedPlan = LEGACY_PLAN_MAP[plan] || plan;
  const usage = await getTenantUsage(tenantId);
  const limits = getPlanLimits(normalizedPlan);
  const planConfig = getPlanConfig(normalizedPlan);

  const summary = {
    plan: normalizedPlan,
    planName: planConfig.name,
    billingCycleStart: usage.billingCycleStart?.toDate() || null,
    billingCycleEnd: usage.billingCycleEnd?.toDate() || null,
    resources: {},
  };

  // Build resource-by-resource summary
  const resourceTypes = [
    'sites',
    'users',
    'animals',
    'activeTasks',
    'runlists',
    'eventsPerMonth',
    'inventoryItems',
    'contacts',
    'posPerMonth',
    'billsPerMonth',
  ];

  for (const resourceType of resourceTypes) {
    const fieldName = RESOURCE_TO_FIELD[resourceType] || resourceType;
    const current = usage[fieldName] || 0;
    const limit = limits[resourceType] ?? 0;
    const unlimited = isUnlimited(limit);
    const percentUsed = unlimited ? 0 : limit > 0 ? Math.round((current / limit) * 100) : 0;

    summary.resources[resourceType] = {
      current,
      limit,
      unlimited,
      percentUsed,
      displayName: getResourceDisplayName(resourceType),
      warningLevel: getWarningLevel(percentUsed),
    };
  }

  // Add feature flags
  summary.features = {
    purchasingEnabled: limits.purchasingEnabled,
    advancedAccounting: limits.advancedAccounting,
  };

  return summary;
};

/**
 * Get warning level based on usage percentage
 * @param {number} percentUsed
 * @returns {string} 'safe' | 'warning' | 'critical' | 'exceeded'
 */
const getWarningLevel = (percentUsed) => {
  if (percentUsed >= 100) return 'exceeded';
  if (percentUsed >= 90) return 'critical';
  if (percentUsed >= 80) return 'warning';
  return 'safe';
};

/**
 * Check if a feature is enabled for a tenant's plan
 * @param {string} plan - Tenant's current plan
 * @param {string} featureName - Feature to check
 * @returns {boolean}
 */
const checkFeatureEnabled = (plan, featureName) => {
  const normalizedPlan = LEGACY_PLAN_MAP[plan] || plan;
  return isFeatureEnabled(normalizedPlan, featureName);
};

/**
 * Atomically check limit and increment usage (for race condition prevention)
 * Uses a Firestore transaction to ensure consistency
 * @param {string} tenantId
 * @param {string} plan
 * @param {string} resourceType
 * @param {number} increment
 * @returns {Promise<object>} { allowed, current, limit, ... }
 */
const checkAndIncrement = async (tenantId, plan, resourceType, increment = 1) => {
  const normalizedPlan = LEGACY_PLAN_MAP[plan] || plan;
  const limit = getLimit(normalizedPlan, resourceType);
  const usageRef = getUsageRef(tenantId);
  const fieldName = RESOURCE_TO_FIELD[resourceType] || resourceType;

  // Unlimited - just increment
  if (isUnlimited(limit)) {
    await incrementUsage(tenantId, resourceType, increment);
    return {
      allowed: true,
      current: 0,
      limit: -1,
      percentUsed: 0,
      isUnlimited: true,
    };
  }

  // Use transaction for atomicity
  return await db.runTransaction(async (transaction) => {
    const usageDoc = await transaction.get(usageRef);

    let usage;
    if (!usageDoc.exists) {
      // Initialize in transaction
      const billingCycleStart = new Date();
      const billingCycleEnd = new Date(billingCycleStart);
      billingCycleEnd.setMonth(billingCycleEnd.getMonth() + 1);

      usage = {
        billingCycleStart: admin.firestore.Timestamp.fromDate(billingCycleStart),
        billingCycleEnd: admin.firestore.Timestamp.fromDate(billingCycleEnd),
        eventsThisCycle: 0,
        posThisCycle: 0,
        billsThisCycle: 0,
        sites: 0,
        users: 0,
        animals: 0,
        activeTasks: 0,
        runlists: 0,
        inventoryItems: 0,
        contacts: 0,
        lastUpdated: FieldValue.serverTimestamp(),
      };
      transaction.set(usageRef, usage);
    } else {
      usage = usageDoc.data();
    }

    const current = usage[fieldName] || 0;
    const newTotal = current + increment;
    const allowed = newTotal <= limit;
    const percentUsed = limit > 0 ? Math.round((current / limit) * 100) : 0;

    if (allowed) {
      transaction.update(usageRef, {
        [fieldName]: FieldValue.increment(increment),
        lastUpdated: FieldValue.serverTimestamp(),
      });
    }

    return {
      allowed,
      current,
      limit,
      percentUsed,
      newTotal,
      isUnlimited: false,
      suggestedPlan: allowed ? null : suggestUpgradePlan(normalizedPlan, resourceType, newTotal),
    };
  });
};

module.exports = {
  initializeUsage,
  getTenantUsage,
  resetBillingCycle,
  checkLimit,
  incrementUsage,
  decrementUsage,
  getUsageSummary,
  getWarningLevel,
  checkFeatureEnabled,
  checkAndIncrement,
  RESOURCE_TO_FIELD,
};
