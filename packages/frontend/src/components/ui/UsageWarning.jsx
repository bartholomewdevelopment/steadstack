import { usePlanLimits } from '../../contexts/PlanLimitsContext';
import { Link } from 'react-router-dom';

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

/**
 * Inline warning banner shown when a resource is at 80%+ usage
 */
export function UsageWarning({ resourceType, className = '' }) {
  const { usage, getWarningLevel } = usePlanLimits();

  if (!usage?.resources?.[resourceType]) return null;

  const resource = usage.resources[resourceType];
  const warningLevel = getWarningLevel(resourceType);

  // Only show warning if at 80% or higher
  if (warningLevel === 'safe') return null;

  const resourceName = RESOURCE_NAMES[resourceType] || resourceType;
  const isUnlimited = resource.unlimited;

  if (isUnlimited) return null;

  const getStyles = () => {
    switch (warningLevel) {
      case 'exceeded':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'critical':
        return 'bg-orange-50 border-orange-200 text-orange-700';
      case 'warning':
      default:
        return 'bg-yellow-50 border-yellow-200 text-yellow-700';
    }
  };

  const getIcon = () => {
    if (warningLevel === 'exceeded') {
      return (
        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${getStyles()} ${className}`}>
      <div className="flex items-center gap-2">
        {getIcon()}
        <span className="text-sm font-medium">
          {warningLevel === 'exceeded'
            ? `You've reached your ${resourceName} limit`
            : `You've used ${resource.percentUsed}% of your ${resourceName}`}
          <span className="font-normal ml-1">
            ({resource.current}/{resource.limit})
          </span>
        </span>
      </div>
      <Link
        to="/app/settings?tab=billing"
        className="text-sm font-medium hover:underline"
      >
        Upgrade
      </Link>
    </div>
  );
}

/**
 * Dashboard widget showing all resources at warning level
 */
export function UsageSummaryWarning({ className = '' }) {
  const { getWarningResources, loading } = usePlanLimits();

  if (loading) return null;

  const warningResources = getWarningResources();

  if (warningResources.length === 0) return null;

  return (
    <div className={`bg-yellow-50 border border-yellow-200 rounded-xl p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <svg className="w-6 h-6 text-yellow-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div className="flex-1">
          <h3 className="font-semibold text-yellow-800">Approaching Plan Limits</h3>
          <ul className="mt-2 space-y-1">
            {warningResources.map(({ type, displayName, current, limit, percentUsed }) => (
              <li key={type} className="text-sm text-yellow-700">
                {displayName}: {current}/{limit} ({percentUsed}%)
              </li>
            ))}
          </ul>
          <Link
            to="/app/settings?tab=billing"
            className="inline-block mt-3 text-sm font-medium text-yellow-800 hover:text-yellow-900"
          >
            Upgrade your plan &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

export default UsageWarning;
