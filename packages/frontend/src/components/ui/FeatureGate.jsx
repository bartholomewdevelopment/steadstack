import { usePlanLimits } from '../../contexts/PlanLimitsContext';
import { Link } from 'react-router-dom';

/**
 * Feature display names and descriptions
 */
const FEATURE_INFO = {
  purchasingEnabled: {
    name: 'Purchasing',
    description: 'Manage vendors, purchase orders, receipts, and bills',
  },
  advancedAccounting: {
    name: 'Advanced Accounting',
    description: 'A/R, A/P aging reports, and bank reconciliation',
  },
};

/**
 * Wraps content that requires a specific feature to be enabled.
 * Shows upgrade prompt if feature is not available.
 */
export function FeatureGate({ feature, children, fallback }) {
  const { isFeatureEnabled, currentPlan, loading } = usePlanLimits();

  // Show loading state briefly
  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-40 bg-gray-100 rounded-xl"></div>
      </div>
    );
  }

  // Feature is enabled - render children
  if (isFeatureEnabled(feature)) {
    return children;
  }

  // Feature not enabled - show fallback or default upgrade prompt
  if (fallback) {
    return fallback;
  }

  const featureInfo = FEATURE_INFO[feature] || {
    name: feature,
    description: 'This feature requires a higher plan',
  };

  return <FeatureLockedCard feature={feature} featureInfo={featureInfo} currentPlan={currentPlan} />;
}

/**
 * Card shown when a feature is locked
 */
export function FeatureLockedCard({ feature, featureInfo, currentPlan }) {
  return (
    <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {featureInfo.name} is Locked
      </h3>
      <p className="text-gray-600 mb-4 max-w-sm mx-auto">
        {featureInfo.description}. Upgrade your plan to unlock this feature.
      </p>
      <Link
        to="/app/settings?tab=billing"
        className="inline-flex items-center gap-2 px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
        Upgrade Plan
      </Link>
    </div>
  );
}

/**
 * Icon for locked menu items
 */
export function LockedIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={`${className} text-gray-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

/**
 * Hook to check if a feature is locked (for conditional rendering)
 */
export function useFeatureGate(feature) {
  const { isFeatureEnabled, loading } = usePlanLimits();
  return {
    isLocked: !loading && !isFeatureEnabled(feature),
    isLoading: loading,
  };
}

export default FeatureGate;
