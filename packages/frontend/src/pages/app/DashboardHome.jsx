import { useAuth } from '../../contexts/AuthContext';
import { useSite } from '../../contexts/SiteContext';

export default function DashboardHome() {
  const { user, userProfile } = useAuth();
  const { currentSite, sites } = useSite();

  const stats = [
    { label: 'Animals', value: '—', change: null, icon: '🐄' },
    { label: 'Open Tasks', value: '—', change: null, icon: '📋' },
    { label: 'Inventory Alerts', value: '—', change: null, icon: '📦' },
    { label: 'This Month Revenue', value: '—', change: null, icon: '💰' },
  ];

  const quickActions = [
    { label: 'Log Event', description: 'Record a farm activity', icon: '📝', href: '/app/events/new' },
    { label: 'Add Animal', description: 'Register new livestock', icon: '🐮', href: '/app/animals/new' },
    { label: 'Record Purchase', description: 'Log an expense', icon: '🧾', href: '/app/accounting/purchase' },
    { label: 'Check Inventory', description: 'View stock levels', icon: '📊', href: '/app/inventory' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">
          Welcome back, {user?.displayName?.split(' ')[0] || 'there'}!
        </h1>
        <p className="text-gray-600 mt-1">
          {currentSite ? (
            <>Here's what's happening at <strong>{currentSite.name}</strong></>
          ) : (
            'Create a site to get started'
          )}
        </p>
      </div>

      {/* No site prompt */}
      {sites.length === 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Create your first site</h3>
              <p className="text-gray-600 mt-1">
                A site represents a physical location like a farm, pasture, or barn.
                Start by adding your main property.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Use the site selector in the sidebar to add a new site.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-xl border border-gray-200 p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <span className="text-2xl">{stat.icon}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
            {stat.change && (
              <p className={`text-sm mt-1 ${stat.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stat.change > 0 ? '+' : ''}{stat.change}% from last month
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <button
              key={index}
              className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all text-left group"
              onClick={() => {/* TODO: implement */}}
            >
              <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-primary-100 flex items-center justify-center text-2xl transition-colors">
                {action.icon}
              </div>
              <div>
                <p className="font-medium text-gray-900">{action.label}</p>
                <p className="text-sm text-gray-500">{action.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent activity placeholder */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-gray-900 font-medium">No recent activity</h3>
          <p className="text-gray-500 text-sm mt-1">
            Start logging events to see your activity here
          </p>
        </div>
      </div>

      {/* Alerts placeholder */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Alerts & Reminders</h2>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-gray-900 font-medium">All caught up!</h3>
          <p className="text-gray-500 text-sm mt-1">
            No alerts or reminders at this time
          </p>
        </div>
      </div>
    </div>
  );
}
