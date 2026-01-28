import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { usageApi } from '../services/api';

const PlanLimitsContext = createContext({});

export const usePlanLimits = () => useContext(PlanLimitsContext);

// Plan limits configuration (mirror of backend config for UI display)
const PLAN_LIMITS = {
  free: {
    name: 'Free',
    price: 0,
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
    },
  },
  homestead: {
    name: 'Homestead',
    price: 19,
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
    },
  },
  ranchGrowth: {
    name: 'Ranch Growth',
    price: 99,
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
    },
  },
  ranchPro: {
    name: 'Ranch Pro',
    price: 249,
    limits: {
      sites: -1,
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
    },
  },
};

// Legacy plan mapping
const LEGACY_PLAN_MAP = {
  starter: 'free',
  professional: 'homestead',
  enterprise: 'ranchPro',
};

export function PlanLimitsProvider({ children }) {
  const { user, userProfile } = useAuth();
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Normalize plan name (handle legacy names)
  const normalizePlan = (plan) => LEGACY_PLAN_MAP[plan] || plan || 'free';

  // Current plan from userProfile
  const currentPlan = normalizePlan(userProfile?.tenant?.plan);
  const planLimits = PLAN_LIMITS[currentPlan] || PLAN_LIMITS.free;

  // Fetch usage data
  const fetchUsage = useCallback(async () => {
    if (!user || !userProfile?.tenant) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await usageApi.getUsage();
      if (response.success) {
        setUsage(response.data);
      }
    } catch (err) {
      console.error('Error fetching usage:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, userProfile]);

  // Fetch usage when user changes
  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  // Check if a specific resource limit allows creation
  const checkLimit = (resourceType) => {
    if (!usage?.resources?.[resourceType]) {
      return { allowed: true, current: 0, limit: 0, percentUsed: 0 };
    }

    const resource = usage.resources[resourceType];
    return {
      allowed: resource.unlimited || resource.current < resource.limit,
      current: resource.current,
      limit: resource.limit,
      unlimited: resource.unlimited,
      percentUsed: resource.percentUsed,
    };
  };

  // Check if a feature is enabled for current plan
  const isFeatureEnabled = (featureName) => {
    return !!planLimits.limits[featureName];
  };

  // Get warning level for a resource
  const getWarningLevel = (resourceType) => {
    const resource = usage?.resources?.[resourceType];
    if (!resource) return 'safe';

    if (resource.unlimited) return 'safe';
    if (resource.percentUsed >= 100) return 'exceeded';
    if (resource.percentUsed >= 90) return 'critical';
    if (resource.percentUsed >= 80) return 'warning';
    return 'safe';
  };

  // Get resources that are at warning level (80%+)
  const getWarningResources = () => {
    if (!usage?.resources) return [];

    return Object.entries(usage.resources)
      .filter(([, resource]) => !resource.unlimited && resource.percentUsed >= 80)
      .map(([type, resource]) => ({
        type,
        ...resource,
        warningLevel: getWarningLevel(type),
      }))
      .sort((a, b) => b.percentUsed - a.percentUsed);
  };

  // Refresh usage data
  const refreshUsage = () => {
    fetchUsage();
  };

  const value = {
    // Data
    usage,
    loading,
    error,
    currentPlan,
    planLimits,
    allPlans: PLAN_LIMITS,

    // Methods
    checkLimit,
    isFeatureEnabled,
    getWarningLevel,
    getWarningResources,
    refreshUsage,
  };

  return (
    <PlanLimitsContext.Provider value={value}>
      {children}
    </PlanLimitsContext.Provider>
  );
}

export default PlanLimitsContext;
