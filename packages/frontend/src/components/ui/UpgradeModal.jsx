import { useState, useEffect } from 'react';
import { usePlanLimits } from '../../contexts/PlanLimitsContext';
import { useAuth } from '../../contexts/AuthContext';
import { billingApi } from '../../services/api';

// Plan display info
const PLAN_INFO = {
  free: {
    name: 'Free',
    price: 0,
    color: 'gray',
  },
  homestead: {
    name: 'Homestead',
    price: 19,
    color: 'green',
  },
  ranchGrowth: {
    name: 'Ranch Growth',
    price: 99,
    color: 'blue',
  },
  ranchPro: {
    name: 'Ranch Pro',
    price: 249,
    color: 'purple',
  },
};

// Resource display names
const RESOURCE_NAMES = {
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

export default function UpgradeModal({ isOpen, onClose, limitData }) {
  const { currentPlan, planLimits, allPlans } = usePlanLimits();
  const { user, userProfile } = useAuth();
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState(null);

  // Determine suggested plan
  const suggestedPlan = limitData?.data?.suggestedPlan ||
    (currentPlan === 'free' ? 'homestead' :
     currentPlan === 'homestead' ? 'ranchGrowth' :
     currentPlan === 'ranchGrowth' ? 'ranchPro' : null);

  const suggestedPlanInfo = suggestedPlan ? PLAN_INFO[suggestedPlan] : null;
  const currentPlanInfo = PLAN_INFO[currentPlan] || PLAN_INFO.free;

  // Resource that exceeded
  const resourceType = limitData?.data?.resourceType;
  const resourceName = RESOURCE_NAMES[resourceType] || resourceType;

  const handleUpgrade = async () => {
    if (!userProfile?.tenant || !suggestedPlan) return;

    try {
      setUpgrading(true);
      setError(null);

      const result = await billingApi.createCheckoutSession({
        tenantId: userProfile.tenant.id || userProfile.tenant._id,
        userId: user.uid,
        userEmail: user.email,
        plan: suggestedPlan,
      });

      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        setError('Failed to start checkout. Please try again.');
      }
    } catch (err) {
      console.error('Upgrade error:', err);
      setError(err.message || 'Failed to start checkout');
    } finally {
      setUpgrading(false);
    }
  };

  if (!isOpen) return null;

  const isFeatureGate = limitData?.code === 'FEATURE_NOT_AVAILABLE';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 text-white">
          <h2 className="text-xl font-semibold">
            {isFeatureGate ? 'Feature Not Available' : 'Upgrade Your Plan'}
          </h2>
          <p className="text-primary-100 text-sm mt-1">
            {isFeatureGate
              ? `${limitData?.data?.feature || 'This feature'} requires a higher plan`
              : `You've reached your ${resourceName} limit`}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Current vs Limit */}
          {!isFeatureGate && limitData?.data && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-red-700 font-medium">
                  {resourceName.charAt(0).toUpperCase() + resourceName.slice(1)}
                </span>
                <span className="text-red-600 font-bold">
                  {limitData.data.current} / {limitData.data.limit}
                </span>
              </div>
              <div className="mt-2 w-full bg-red-200 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          )}

          {/* Plan comparison */}
          {suggestedPlanInfo && (
            <div className="space-y-4">
              {/* Current plan */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <span className="text-sm text-gray-500">Current Plan</span>
                  <p className="font-semibold text-gray-900">{currentPlanInfo.name}</p>
                </div>
                <span className="text-gray-600">
                  ${currentPlanInfo.price}/mo
                </span>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>

              {/* Suggested plan */}
              <div className="flex items-center justify-between p-3 bg-primary-50 rounded-lg border-2 border-primary-500">
                <div>
                  <span className="text-sm text-primary-600">Recommended</span>
                  <p className="font-semibold text-primary-900">{suggestedPlanInfo.name}</p>
                </div>
                <span className="text-primary-700 font-bold">
                  ${suggestedPlanInfo.price}/mo
                </span>
              </div>

              {/* Key benefits */}
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700 font-medium mb-2">
                  What you'll get:
                </p>
                <ul className="text-sm text-green-600 space-y-1">
                  {!isFeatureGate && resourceType && allPlans[suggestedPlan] && (
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Up to {allPlans[suggestedPlan].limits[resourceType] === -1 ? 'unlimited' : allPlans[suggestedPlan].limits[resourceType]} {resourceName}
                    </li>
                  )}
                  {isFeatureGate && (
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {limitData?.data?.feature || 'This feature'} unlocked
                    </li>
                  )}
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Higher limits across all resources
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 font-medium"
          >
            Maybe Later
          </button>
          <div className="flex gap-3">
            <a
              href="/pricing"
              className="px-4 py-2 text-primary-600 hover:text-primary-700 font-medium"
            >
              View All Plans
            </a>
            {suggestedPlan && (
              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                className="px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {upgrading ? 'Processing...' : 'Upgrade Now'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
