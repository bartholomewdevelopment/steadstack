import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSite } from '../../contexts/SiteContext';
import { animalsApi, inventoryApi, tasksApi, eventsApi } from '../../services/api';

export default function DashboardHome() {
  const { user } = useAuth();
  const { currentSite, sites } = useSite();
  const [stats, setStats] = useState({
    animals: { value: '—', loading: true },
    tasks: { value: '—', loading: true },
    inventory: { value: '—', loading: true },
    events: { value: '—', loading: true },
  });
  const [recentAnimals, setRecentAnimals] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentSite?.id) {
      fetchDashboardData();
    }
  }, [currentSite]);

  const fetchDashboardData = async () => {
    setLoading(true);

    // Reset all stats to loading state
    setStats({
      animals: { value: 0, loading: true },
      tasks: { value: 0, loading: true },
      inventory: { value: 0, loading: true },
      events: { value: 0, loading: true },
    });

    try {
      // Log current site info for debugging
      console.log('Dashboard fetching data for site:', currentSite?.id, currentSite?.name);

      // Fetch all data in parallel - don't filter by siteId for animals to get all
      const [animalsRes, tasksRes, inventoryRes, eventsRes] = await Promise.allSettled([
        animalsApi.list({ limit: 50 }), // Remove siteId filter to get ALL animals
        tasksApi.list({ siteId: currentSite?.id }),
        inventoryApi.list({ siteId: currentSite?.id }),
        eventsApi.list({ siteId: currentSite?.id, limit: 5 }),
      ]);

      // Process animals - API returns { success, data: { animals } }
      if (animalsRes.status === 'fulfilled') {
        const response = animalsRes.value;
        console.log('Animals API response:', JSON.stringify(response, null, 2));
        const animalsData = response?.data?.animals || response?.animals || (Array.isArray(response?.data) ? response.data : []);
        const animals = Array.isArray(animalsData) ? animalsData : [];
        console.log('Parsed animals:', animals.length, animals);
        setStats(prev => ({ ...prev, animals: { value: animals.length, loading: false } }));
        setRecentAnimals(animals.slice(0, 5));
      } else {
        console.error('Animals API failed:', animalsRes.reason);
        setStats(prev => ({ ...prev, animals: { value: 0, loading: false } }));
      }

      // Process tasks - API returns { success, data: { occurrences } }
      if (tasksRes.status === 'fulfilled') {
        const response = tasksRes.value;
        const tasksData = response?.data?.occurrences || response?.data?.tasks || response?.occurrences || (Array.isArray(response?.data) ? response.data : []);
        const tasks = Array.isArray(tasksData) ? tasksData : [];
        const openTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
        setStats(prev => ({ ...prev, tasks: { value: openTasks.length, loading: false } }));
      } else {
        console.error('Tasks API failed:', tasksRes.reason);
        setStats(prev => ({ ...prev, tasks: { value: 0, loading: false } }));
      }

      // Process inventory - API returns { success, data: { items } }
      if (inventoryRes.status === 'fulfilled') {
        const response = inventoryRes.value;
        const itemsData = response?.data?.items || response?.items || (Array.isArray(response?.data) ? response.data : []);
        const items = Array.isArray(itemsData) ? itemsData : [];
        const lowStock = items.filter(i => i.quantity <= (i.reorderPoint || 0));
        setStats(prev => ({ ...prev, inventory: { value: lowStock.length, loading: false } }));
      } else {
        console.error('Inventory API failed:', inventoryRes.reason);
        setStats(prev => ({ ...prev, inventory: { value: 0, loading: false } }));
      }

      // Process events - MongoDB API returns { events, pagination }
      if (eventsRes.status === 'fulfilled') {
        const response = eventsRes.value;
        const eventsData = response?.events || response?.data?.events || (Array.isArray(response?.data) ? response.data : []);
        const events = Array.isArray(eventsData) ? eventsData : [];
        setStats(prev => ({ ...prev, events: { value: events.length, loading: false } }));
        setRecentEvents(events.slice(0, 5));
      } else {
        console.error('Events API failed:', eventsRes.reason);
        setStats(prev => ({ ...prev, events: { value: 0, loading: false } }));
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      // Reset all to show 0 on error
      setStats({
        animals: { value: 0, loading: false },
        tasks: { value: 0, loading: false },
        inventory: { value: 0, loading: false },
        events: { value: 0, loading: false },
      });
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Animals', value: stats.animals.value, loading: stats.animals.loading, icon: '🐄', href: '/app/animals' },
    { label: 'Open Tasks', value: stats.tasks.value, loading: stats.tasks.loading, icon: '📋', href: '/app/tasks' },
    { label: 'Low Stock Items', value: stats.inventory.value, loading: stats.inventory.loading, icon: '📦', href: '/app/inventory' },
    { label: 'Recent Events', value: stats.events.value, loading: stats.events.loading, icon: '📅', href: '/app/events' },
  ];

  const quickActions = [
    { label: 'Log Event', description: 'Record a farm activity', icon: '📝', href: '/app/events/new' },
    { label: 'Add Animal', description: 'Register new livestock', icon: '🐮', href: '/app/animals/new' },
    { label: 'Add Inventory', description: 'Track supplies', icon: '📦', href: '/app/inventory/new' },
    { label: 'View Reports', description: 'Check analytics', icon: '📊', href: '/app/accounting/analysis' },
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
        {statCards.map((stat, index) => (
          <Link
            key={index}
            to={stat.href}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-primary-300 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <span className="text-2xl">{stat.icon}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {stat.loading ? (
                <span className="inline-block w-8 h-8 bg-gray-200 rounded animate-pulse"></span>
              ) : (
                stat.value
              )}
            </p>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.href}
              className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all text-left group"
            >
              <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-primary-100 flex items-center justify-center text-2xl transition-colors">
                {action.icon}
              </div>
              <div>
                <p className="font-medium text-gray-900">{action.label}</p>
                <p className="text-sm text-gray-500">{action.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Animals */}
      {recentAnimals.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Animals</h2>
            <Link to="/app/animals" className="text-sm text-primary-600 hover:text-primary-700">
              View all →
            </Link>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID/Tag</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Species</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentAnimals.map((animal) => (
                  <tr key={animal.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link to={`/app/animals/${animal.id}`} className="text-primary-600 hover:text-primary-700 font-medium">
                        {animal.tagNumber || animal.id?.slice(-6)}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">{animal.name || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{animal.species}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                        animal.status === 'active' ? 'bg-green-100 text-green-700' :
                        animal.status === 'sold' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {animal.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Events */}
      {recentEvents.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Events</h2>
            <Link to="/app/events" className="text-sm text-primary-600 hover:text-primary-700">
              View all →
            </Link>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {new Date(event.occurredAt || event.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-primary-100 text-primary-700">
                        {event.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-900 truncate max-w-xs">{event.description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && recentAnimals.length === 0 && recentEvents.length === 0 && currentSite && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-gray-900 font-medium">No activity yet</h3>
          <p className="text-gray-500 text-sm mt-1">
            Start by adding animals or logging events to see them here
          </p>
        </div>
      )}
    </div>
  );
}
