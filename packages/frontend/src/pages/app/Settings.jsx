import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSite } from '../../contexts/SiteContext';
import { usePlanLimits } from '../../contexts/PlanLimitsContext';
import { billingApi } from '../../services/api';
import { HelpTooltip } from '../../components/ui/Tooltip';

export default function Settings() {
  const { user, userProfile, updateUserProfile } = useAuth();
  const { sites } = useSite();
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'farm', label: 'Farm Settings' },
    { id: 'sites', label: 'Sites' },
    { id: 'team', label: 'Team' },
    { id: 'billing', label: 'Billing' },
  ];

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <h1 className="text-2xl font-display font-bold text-gray-900">Settings</h1>
        <HelpTooltip content="Configure your profile, farm settings, team members, and billing. Changes here affect your entire organization." position="right" />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8 -mb-px overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'profile' && <ProfileSettings user={user} userProfile={userProfile} />}
      {activeTab === 'farm' && <FarmSettings userProfile={userProfile} />}
      {activeTab === 'sites' && <SitesSettings sites={sites} />}
      {activeTab === 'team' && <TeamSettings userProfile={userProfile} />}
      {activeTab === 'billing' && <BillingSettings userProfile={userProfile} />}
    </div>
  );
}

function ProfileSettings({ user, userProfile }) {
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    // TODO: Implement save
    setTimeout(() => setSaving(false), 1000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Profile</h2>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-2xl font-bold">
              {user?.displayName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <button type="button" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                Change photo
              </button>
              <p className="text-xs text-gray-500 mt-1">JPG, PNG. Max 2MB</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Display Name</label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="input bg-gray-50 text-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>
          </div>

          <div className="pt-4">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Password</h2>
        <p className="text-gray-600 text-sm mb-4">
          Password is managed through Firebase Authentication.
        </p>
        <button className="btn-secondary">
          Change Password
        </button>
      </div>
    </div>
  );
}

function FarmSettings({ userProfile }) {
  const tenant = userProfile?.tenant;
  const tenantId = tenant?._id || tenant?.id;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Farm Information</h2>

        <div className="space-y-4">
          <div>
            <label className="label">Farm Name</label>
            <input
              type="text"
              defaultValue={tenant?.name || ''}
              className="input"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Timezone</label>
              <select className="input">
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
              </select>
            </div>
            <div>
              <label className="label">Date Format</label>
              <select className="input">
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
          </div>

          <div className="pt-4">
            <button className="btn-primary">Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SitesSettings({ sites }) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Your Sites</h2>
          <button className="btn-primary text-sm">Add Site</button>
        </div>

        {sites.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No sites yet. Add your first site to get started.
          </p>
        ) : (
          <div className="space-y-3">
            {sites.map((site) => (
              <div
                key={site.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center font-medium">
                    {site.code || site.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{site.name}</p>
                    <p className="text-sm text-gray-500">
                      {site.type} {site.acreage && `• ${site.acreage} acres`}
                    </p>
                  </div>
                </div>
                <button className="text-sm text-primary-600 hover:text-primary-700">
                  Edit
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamSettings({ userProfile }) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
          <button className="btn-primary text-sm">Invite Member</button>
        </div>

        <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-medium">
                {userProfile?.displayName?.charAt(0) || 'U'}
              </div>
              <div>
                <p className="font-medium text-gray-900">{userProfile?.displayName || 'You'}</p>
                <p className="text-sm text-gray-500">{userProfile?.email}</p>
              </div>
            </div>
            <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
              Owner
            </span>
          </div>
        </div>

        <p className="text-sm text-gray-500 mt-4">
          Invite team members to help manage your farm. Available on Full Access plans.
        </p>
      </div>
    </div>
  );
}

// Plan display configuration - prices match main website (Pricing.jsx)
// Annual pricing is 15% off monthly rate
const PLAN_DISPLAY = {
  free: {
    name: 'Free',
    price: 0,
    priceAnnual: 0,
    description: 'For tiny homesteads starting out',
    color: 'gray',
    highlights: ['1 site', '10 animals', '25 contacts', 'Basic accounting'],
  },
  homestead: {
    name: 'Homestead',
    price: 19,
    priceAnnual: 192,
    description: 'For small farms that need control',
    color: 'blue',
    highlights: ['2 sites', '100 animals', 'Full purchasing', 'A/R & A/P'],
  },
  ranchGrowth: {
    name: 'Ranch Growth',
    price: 99,
    priceAnnual: 1008,
    description: 'For multi-crew operations',
    color: 'green',
    highlights: ['5 sites', '2,000 animals', '12 team members', 'Advanced reports'],
  },
  ranchPro: {
    name: 'Ranch Pro',
    price: 249,
    priceAnnual: 2544,
    description: 'For high-scale ranches',
    color: 'purple',
    highlights: ['Unlimited sites', '10,000 animals', '25 team members', 'Priority support'],
  },
};

const PLAN_ORDER = ['free', 'homestead', 'ranchGrowth', 'ranchPro'];

function BillingSettings({ userProfile }) {
  const { user, refreshUserProfile } = useAuth();
  const tenant = userProfile?.tenant;
  const tenantId = tenant?._id || tenant?.id;
  const { usage, currentPlan, planLimits, allPlans, loading: usageLoading, refreshUsage } = usePlanLimits();
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [error, setError] = useState('');
  const [billingCycle, setBillingCycle] = useState('monthly');

  // Check URL params for success/cancel
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      fetchSubscription();
      refreshUsage();
    }
  }, []);

  const fetchSubscription = async () => {
    if (!tenantId) return;
    try {
      const result = await billingApi.getSubscription(tenantId);
      if (result.success) {
        setSubscription(result.data);
        const planFromSubscription = result.data?.plan;
        if (refreshUserProfile && planFromSubscription && planFromSubscription !== currentPlan) {
          await refreshUserProfile();
        }
      }
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [tenantId]);

  const handleUpgrade = async (targetPlan) => {
    setLoading(true);
    setError('');

    try {
      const result = await billingApi.createCheckoutSession({
        tenantId: tenant._id || tenant.id,
        userId: user.uid,
        userEmail: user.email,
        plan: targetPlan,
        billingCycle,
      });

      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        setError('Failed to start checkout. Please try again.');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err.message || 'Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await billingApi.createPortalSession({
        tenantId: tenant._id || tenant.id,
      });

      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        setError('Failed to open billing portal. Please try again.');
      }
    } catch (err) {
      console.error('Portal error:', err);
      setError(err.message || 'Failed to open billing portal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const effectivePlan = subscription?.plan || currentPlan;
  const currentPlanIndex = PLAN_ORDER.indexOf(effectivePlan);
  const effectivePlanLimits = allPlans?.[effectivePlan] || planLimits;
  const getPlanLimit = (resourceKey) => effectivePlanLimits?.limits?.[resourceKey];

  // Get usage stats for display
  const usageStats = usage?.resources || {};

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Current Plan Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
          {currentPlan !== 'free' && (
            <button
              onClick={handleManageSubscription}
              disabled={loading}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              {loading ? 'Loading...' : 'Manage Subscription'}
            </button>
          )}
        </div>

        <div className={`flex items-center justify-between p-4 rounded-lg border-2 ${
          currentPlan === 'free' ? 'bg-gray-50 border-gray-300' :
          currentPlan === 'homestead' ? 'bg-blue-50 border-blue-300' :
          currentPlan === 'ranchGrowth' ? 'bg-green-50 border-green-300' :
          'bg-purple-50 border-purple-300'
        }`}>
          <div>
            <p className="font-semibold text-gray-900 text-lg">
              {PLAN_DISPLAY[effectivePlan]?.name || PLAN_DISPLAY[currentPlan]?.name || 'Free'} Plan
            </p>
            <p className="text-sm text-gray-600">
              {subscription?.cancelAtPeriodEnd
                ? `Cancels on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                : PLAN_DISPLAY[effectivePlan]?.description || PLAN_DISPLAY[currentPlan]?.description}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              ${PLAN_DISPLAY[effectivePlan]?.price || PLAN_DISPLAY[currentPlan]?.price || 0}
              <span className="text-sm font-normal text-gray-500">/mo</span>
            </p>
          </div>
        </div>
      </div>

      {/* Usage Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage Summary</h2>

        {usageLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded"></div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <UsageBar
              label="Sites"
              current={usageStats.sites?.current || 0}
              limit={getPlanLimit('sites')}
              unlimited={getPlanLimit('sites') === -1}
            />
            <UsageBar
              label="Animals"
              current={usageStats.animals?.current || 0}
              limit={getPlanLimit('animals')}
              unlimited={getPlanLimit('animals') === -1}
            />
            <UsageBar
              label="Contacts"
              current={usageStats.contacts?.current || 0}
              limit={getPlanLimit('contacts')}
              unlimited={getPlanLimit('contacts') === -1}
            />
            <UsageBar
              label="Inventory Items"
              current={usageStats.inventoryItems?.current || 0}
              limit={getPlanLimit('inventoryItems')}
              unlimited={getPlanLimit('inventoryItems') === -1}
            />
            <UsageBar
              label="Active Tasks"
              current={usageStats.activeTasks?.current || 0}
              limit={getPlanLimit('activeTasks')}
              unlimited={getPlanLimit('activeTasks') === -1}
            />
            <UsageBar
              label="Events (this month)"
              current={usageStats.eventsPerMonth?.current || 0}
              limit={getPlanLimit('eventsPerMonth')}
              unlimited={getPlanLimit('eventsPerMonth') === -1}
            />
            {effectivePlanLimits?.limits?.purchasingEnabled && (
              <UsageBar
                label="Purchase Orders (this month)"
                current={usageStats.posPerMonth?.current || 0}
                limit={getPlanLimit('posPerMonth')}
                unlimited={getPlanLimit('posPerMonth') === -1}
              />
            )}
          </div>
        )}

        {/* Feature flags */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Features</h3>
          <div className="flex flex-wrap gap-2">
            <FeatureBadge
              label="Purchasing"
              enabled={effectivePlanLimits?.limits?.purchasingEnabled}
            />
            <FeatureBadge
              label="Advanced Accounting"
              enabled={effectivePlanLimits?.limits?.advancedAccounting}
            />
          </div>
        </div>
      </div>

      {/* Plan Comparison */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Available Plans</h2>

          {/* Billing cycle toggle */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                billingCycle === 'annual'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Annual <span className="text-green-600 text-xs">Save 15%</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLAN_ORDER.map((planKey, index) => {
            const plan = PLAN_DISPLAY[planKey];
            const isCurrent = planKey === effectivePlan;
            const isUpgrade = index > currentPlanIndex;
            const isDowngrade = index < currentPlanIndex;
            const price = billingCycle === 'annual' ? plan.priceAnnual : plan.price;
            const monthlyEquivalent = billingCycle === 'annual' ? Math.round(plan.priceAnnual / 12) : plan.price;

            return (
              <div
                key={planKey}
                className={`rounded-xl border-2 p-4 ${
                  isCurrent
                    ? planKey === 'free' ? 'border-gray-400 bg-gray-50' :
                      planKey === 'homestead' ? 'border-blue-400 bg-blue-50' :
                      planKey === 'ranchGrowth' ? 'border-green-400 bg-green-50' :
                      'border-purple-400 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                  {isCurrent && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-800 text-white">
                      Current
                    </span>
                  )}
                </div>

                <div className="mb-3">
                  <span className="text-2xl font-bold text-gray-900">
                    ${monthlyEquivalent}
                  </span>
                  <span className="text-gray-500">/mo</span>
                  {billingCycle === 'annual' && price > 0 && (
                    <p className="text-xs text-gray-500">
                      ${price}/year billed annually
                    </p>
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-3">{plan.description}</p>

                <ul className="text-sm space-y-1 mb-4">
                  {plan.highlights.map((highlight, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-gray-700">
                      <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {highlight}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2 px-4 text-sm font-medium rounded-lg bg-gray-200 text-gray-500 cursor-not-allowed"
                  >
                    Current Plan
                  </button>
                ) : isUpgrade ? (
                  <button
                    onClick={() => handleUpgrade(planKey)}
                    disabled={loading}
                    className="w-full py-2 px-4 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : 'Upgrade'}
                  </button>
                ) : isDowngrade ? (
                  <button
                    onClick={handleManageSubscription}
                    disabled={loading}
                    className="w-full py-2 px-4 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : 'Downgrade'}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function UsageBar({ label, current, limit, unlimited }) {
  const percentage = unlimited ? 0 : limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
  const warningLevel = percentage >= 100 ? 'exceeded' : percentage >= 90 ? 'critical' : percentage >= 80 ? 'warning' : 'safe';

  const barColor = {
    safe: 'bg-green-500',
    warning: 'bg-yellow-500',
    critical: 'bg-orange-500',
    exceeded: 'bg-red-500',
  }[warningLevel];

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-700">{label}</span>
        <span className="text-sm font-medium text-gray-900">
          {current.toLocaleString()} / {unlimited ? 'Unlimited' : limit?.toLocaleString()}
        </span>
      </div>
      {!unlimited && (
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}

function FeatureBadge({ label, enabled }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
      enabled
        ? 'bg-green-100 text-green-700'
        : 'bg-gray-100 text-gray-500'
    }`}>
      {enabled ? (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )}
      {label}
    </span>
  );
}
