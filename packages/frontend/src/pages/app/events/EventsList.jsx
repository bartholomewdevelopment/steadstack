import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSite } from '../../../contexts/SiteContext';
import { eventsApi } from '../../../services/api';

const eventTypeColors = {
  feeding: 'bg-green-100 text-green-800',
  treatment: 'bg-red-100 text-red-800',
  purchase: 'bg-blue-100 text-blue-800',
  sale: 'bg-purple-100 text-purple-800',
  transfer: 'bg-yellow-100 text-yellow-800',
  adjustment: 'bg-gray-100 text-gray-800',
  maintenance: 'bg-orange-100 text-orange-800',
  labor: 'bg-indigo-100 text-indigo-800',
  breeding: 'bg-pink-100 text-pink-800',
  birth: 'bg-emerald-100 text-emerald-800',
  death: 'bg-slate-100 text-slate-800',
  harvest: 'bg-amber-100 text-amber-800',
  custom: 'bg-cyan-100 text-cyan-800',
};

const statusColors = {
  draft: 'bg-gray-100 text-gray-600',
  pending: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function EventsList() {
  const { currentSite } = useSite();
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const currentType = searchParams.get('type') || '';
  const currentStatus = searchParams.get('status') || '';
  const currentPage = parseInt(searchParams.get('page') || '1');

  useEffect(() => {
    if (currentSite?.id) {
      fetchEvents();
    }
  }, [currentSite, currentType, currentStatus, currentPage]);

  const fetchEvents = async () => {
    if (!currentSite?.id) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = {
        siteId: currentSite.id,
        page: currentPage,
        limit: 20,
      };

      if (currentType) params.type = currentType;
      if (currentStatus) params.status = currentStatus;

      const response = await eventsApi.list(params);
      setEvents(response.events);
      setPagination(response.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  if (!currentSite?.id) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Select a site to view events.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Events</h1>
          <p className="text-gray-600">Track farm activities at {currentSite.name}</p>
        </div>
        <Link to="/app/events/new" className="btn-primary inline-flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Log Event
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
            <select
              value={currentType}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="input py-2 min-w-[150px]"
            >
              <option value="">All Types</option>
              <option value="feeding">Feeding</option>
              <option value="treatment">Treatment</option>
              <option value="purchase">Purchase</option>
              <option value="sale">Sale</option>
              <option value="transfer">Transfer</option>
              <option value="maintenance">Maintenance</option>
              <option value="labor">Labor</option>
              <option value="breeding">Breeding</option>
              <option value="birth">Birth</option>
              <option value="death">Death</option>
              <option value="harvest">Harvest</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={currentStatus}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="input py-2 min-w-[150px]"
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="draft">Draft</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Events List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading events...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600">{error}</p>
          <button onClick={fetchEvents} className="mt-2 text-red-700 underline">
            Try again
          </button>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">No events found</h3>
          <p className="text-gray-500 mt-1">
            {currentType || currentStatus ? 'Try adjusting your filters.' : 'Start by logging your first event.'}
          </p>
          <Link to="/app/events/new" className="btn-primary mt-4 inline-block">
            Log First Event
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {events.map((event) => (
                  <tr key={event._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(event.eventDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${eventTypeColors[event.type] || 'bg-gray-100 text-gray-800'}`}>
                        {event.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-md truncate">
                      {event.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${statusColors[event.status]}`}>
                        {event.status}
                      </span>
                      {event.posted && (
                        <span className="ml-2 text-xs text-green-600" title="Posted to ledger">
                          Posted
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {event.totalRevenue > 0 ? (
                        <span className="text-green-600">+{formatCurrency(event.totalRevenue)}</span>
                      ) : event.totalCost > 0 ? (
                        <span className="text-red-600">-{formatCurrency(event.totalCost)}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Link
                        to={`/app/events/${event._id}`}
                        className="text-primary-600 hover:text-primary-700 font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing page {pagination.page} of {pagination.pages} ({pagination.total} events)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleFilterChange('page', String(currentPage - 1))}
                  disabled={currentPage <= 1}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => handleFilterChange('page', String(currentPage + 1))}
                  disabled={currentPage >= pagination.pages}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
