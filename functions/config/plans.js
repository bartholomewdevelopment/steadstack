/**
 * Plan Limits Configuration
 *
 * Centralized configuration for all plan tiers and their limits.
 * Used by both backend (enforcement) and frontend (display).
 */

const PLAN_LIMITS = {
  free: {
    name: 'Free',
    price: 0,
    priceAnnual: 0,
    description: 'For hobby farms and getting started',
    limits: {
      sites: 1,
      users: 1,
      animals: 10,
      activeTasks: 25,
      runlists: 2,
      eventsPerMonth: 200,
      inventoryItems: 25,
      contacts: 25,
      purchasingEnabled: false,
      posPerMonth: 0,
      billsPerMonth: 0,
      advancedAccounting: false,
      storageGB: 1,
    },
    features: [
      'Up to 1 site',
      'Up to 10 animals',
      'Up to 25 active tasks',
      'Up to 2 runlists',
      '200 events per month',
      'Basic inventory (25 items)',
      'Basic contacts (25)',
      'Basic accounting only',
      'Email support',
    ],
  },
  homestead: {
    name: 'Homestead',
    price: 19,
    priceAnnual: 192,
    description: 'For small family farms',
    limits: {
      sites: 2,
      users: 3,
      animals: 100,
      activeTasks: 250,
      runlists: 10,
      eventsPerMonth: 2000,
      inventoryItems: 150,
      contacts: 150,
      purchasingEnabled: true,
      posPerMonth: 30,
      billsPerMonth: 30,
      advancedAccounting: true,
      storageGB: 5,
    },
    features: [
      'Up to 2 sites',
      'Up to 3 team members',
      'Up to 100 animals',
      'Up to 250 active tasks',
      'Up to 10 runlists',
      '2,000 events per month',
      'Full inventory (150 items)',
      'Full contacts (150)',
      'Full purchasing (30 POs/month)',
      'Full double-entry accounting',
      '5 GB storage',
      'Priority email support',
    ],
  },
  ranchGrowth: {
    name: 'Ranch Growth',
    price: 99,
    priceAnnual: 1008,
    description: 'For growing operations',
    limits: {
      sites: 5,
      users: 12,
      animals: 2000,
      activeTasks: 2000,
      runlists: 50,
      eventsPerMonth: 15000,
      inventoryItems: 1500,
      contacts: 1000,
      purchasingEnabled: true,
      posPerMonth: 300,
      billsPerMonth: 300,
      advancedAccounting: true,
      storageGB: 25,
    },
    features: [
      'Up to 5 sites',
      'Up to 12 team members',
      'Up to 2,000 animals',
      'Up to 2,000 active tasks',
      'Up to 50 runlists',
      '15,000 events per month',
      'Full inventory (1,500 items)',
      'Full contacts (1,000)',
      'Full purchasing (300 POs/month)',
      'Full accounting + advanced reporting',
      '25 GB storage',
      'Priority support',
    ],
  },
  ranchPro: {
    name: 'Ranch Pro',
    price: 249,
    priceAnnual: 2544,
    description: 'For large-scale operations',
    limits: {
      sites: -1, // unlimited
      users: 25,
      animals: 10000,
      activeTasks: 10000,
      runlists: 200,
      eventsPerMonth: 100000,
      inventoryItems: 5000,
      contacts: 5000,
      purchasingEnabled: true,
      posPerMonth: 2000,
      billsPerMonth: 2000,
      advancedAccounting: true,
      storageGB: 100,
    },
    features: [
      'Unlimited sites',
      'Up to 25 team members',
      'Up to 10,000 animals',
      'Up to 10,000 active tasks',
      'Up to 200 runlists',
      '100,000 events per month',
      'Full inventory (5,000 items)',
      'Full contacts (5,000)',
      'Full purchasing (2,000 POs/month)',
      'Full accounting + advanced reporting',
      '100 GB storage',
      'Priority support + dedicated onboarding',
    ],
  },
};

// Plan order for upgrade suggestions
const PLAN_ORDER = ['free', 'homestead', 'ranchGrowth', 'ranchPro'];

// Legacy plan name mapping (for migration)
const LEGACY_PLAN_MAP = {
  starter: 'free',
  professional: 'homestead',
  enterprise: 'ranchPro',
};

/**
 * Get limits for a specific plan
 * @param {string} planName - The plan name (e.g., 'free', 'homestead')
 * @returns {object} The plan's limits object
 */
const getPlanLimits = (planName) => {
  // Handle legacy plan names
  const normalizedPlan = LEGACY_PLAN_MAP[planName] || planName;
  return PLAN_LIMITS[normalizedPlan]?.limits || PLAN_LIMITS.free.limits;
};

/**
 * Get full plan config
 * @param {string} planName - The plan name
 * @returns {object} Full plan config including name, price, limits, features
 */
const getPlanConfig = (planName) => {
  const normalizedPlan = LEGACY_PLAN_MAP[planName] || planName;
  return PLAN_LIMITS[normalizedPlan] || PLAN_LIMITS.free;
};

/**
 * Check if a limit value represents "unlimited"
 * @param {number} value - The limit value
 * @returns {boolean} True if unlimited
 */
const isUnlimited = (value) => value === -1;

/**
 * Get the limit for a specific resource on a plan
 * @param {string} planName - The plan name
 * @param {string} resourceType - The resource type (e.g., 'animals', 'sites')
 * @returns {number} The limit value (-1 for unlimited)
 */
const getLimit = (planName, resourceType) => {
  const limits = getPlanLimits(planName);
  return limits[resourceType] ?? 0;
};

/**
 * Check if a feature is enabled for a plan
 * @param {string} planName - The plan name
 * @param {string} featureName - The feature name (e.g., 'purchasingEnabled')
 * @returns {boolean} True if feature is enabled
 */
const isFeatureEnabled = (planName, featureName) => {
  const limits = getPlanLimits(planName);
  return !!limits[featureName];
};

/**
 * Suggest the next plan that would satisfy a resource need
 * @param {string} currentPlan - Current plan name
 * @param {string} resourceType - The resource type that's limited
 * @param {number} requiredAmount - The amount needed
 * @returns {string|null} Suggested plan name or null if no upgrade available
 */
const suggestUpgradePlan = (currentPlan, resourceType, requiredAmount = 0) => {
  const normalizedCurrent = LEGACY_PLAN_MAP[currentPlan] || currentPlan;
  const currentIndex = PLAN_ORDER.indexOf(normalizedCurrent);

  // Look for the next plan that satisfies the requirement
  for (let i = currentIndex + 1; i < PLAN_ORDER.length; i++) {
    const planName = PLAN_ORDER[i];
    const limit = getLimit(planName, resourceType);
    if (isUnlimited(limit) || limit >= requiredAmount) {
      return planName;
    }
  }

  return null; // Already on highest plan or no plan satisfies requirement
};

/**
 * Get human-readable resource name
 * @param {string} resourceType - The resource type key
 * @returns {string} Human-readable name
 */
const getResourceDisplayName = (resourceType) => {
  const names = {
    sites: 'sites',
    users: 'team members',
    animals: 'animals',
    activeTasks: 'active tasks',
    runlists: 'runlists',
    eventsPerMonth: 'events this month',
    inventoryItems: 'inventory items',
    contacts: 'contacts',
    posPerMonth: 'purchase orders this month',
    billsPerMonth: 'bills this month',
  };
  return names[resourceType] || resourceType;
};

module.exports = {
  PLAN_LIMITS,
  PLAN_ORDER,
  LEGACY_PLAN_MAP,
  getPlanLimits,
  getPlanConfig,
  isUnlimited,
  getLimit,
  isFeatureEnabled,
  suggestUpgradePlan,
  getResourceDisplayName,
};
