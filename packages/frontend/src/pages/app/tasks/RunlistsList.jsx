import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSite } from '../../../contexts/SiteContext';
import { tasksApi } from '../../../services/api';

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-600',
  ACTIVE: 'bg-green-100 text-green-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  ARCHIVED: 'bg-gray-100 text-gray-500',
};

export default function RunlistsList() {
  const { currentSite } = useSite();
  const [runlists, setRunlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ACTIVE');

  useEffect(() => {
    if (currentSite?.id) {
      fetchRunlists();
    }
  }, [currentSite, statusFilter]);

  const fetchRunlists = async () => {
    if (!currentSite?.id) return;

    try {
      setLoading(true);
      setError(null);

      const params = {
        siteId: currentSite.id,
      };
      if (statusFilter) {
        params.status = statusFilter;
      }

      const response = await tasksApi.listRunlists(params);
      setRunlists(response.data?.runlists || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (id) => {
    try {
      await tasksApi.activateRunlist(id);
      await fetchRunlists();
    } catch (err) {
      alert('Failed to activate: ' + err.message);
    }
  };

  const handlePause = async (id) => {
    try {
      await tasksApi.pauseRunlist(id);
      await fetchRunlists();
    } catch (err) {
      alert('Failed to pause: ' + err.message);
    }
  };

  const handleArchive = async (id) => {
    if (!confirm('Are you sure you want to archive this list?')) return;
    try {
      await tasksApi.archiveRunlist(id);
      await fetchRunlists();
    } catch (err) {
      alert('Failed to archive: ' + err.message);
    }
  };

  const formatScheduleTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  if (!currentSite?.id) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Select a site to view task lists.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Task Lists</h1>
          <p className="text-gray-600">Organize tasks into scheduled chore lists</p>
        </div>
        <Link to="/app/tasks/lists/new" className="btn-primary inline-flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New List
        </Link>
      </div>

      {/* Sub-navigation */}
      <div className="flex items-center gap-4 border-b border-gray-200">
        <Link
          to="/app/tasks"
          className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          Today
        </Link>
        <Link
          to="/app/tasks/templates"
          className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          Task Templates
        </Link>
        <Link
          to="/app/tasks/lists"
          className="px-4 py-2 text-sm font-medium text-primary-600 border-b-2 border-primary-600"
        >
          Lists
        </Link>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2">
        {['ACTIVE', 'PAUSED', 'DRAFT', 'ARCHIVED'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status === statusFilter ? '' : status)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              status === statusFilter
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {status.charAt(0) + status.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Lists Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading lists...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600">{error}</p>
          <button onClick={fetchRunlists} className="mt-2 text-red-700 underline">
            Try again
          </button>
        </div>
      ) : runlists.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">No task lists found</h3>
          <p className="text-gray-500 mt-1">
            {statusFilter ? 'Try changing your filter.' : 'Create your first task list to organize your chores.'}
          </p>
          <Link to="/app/tasks/lists/new" className="btn-primary mt-4 inline-block">
            Create a List
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {runlists.map((runlist) => (
            <div
              key={runlist.id}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <Link
                    to={`/app/tasks/lists/${runlist.id}`}
                    className="font-semibold text-gray-900 hover:text-primary-600"
                  >
                    {runlist.name}
                  </Link>
                  <span className={`ml-2 inline-flex px-2 py-0.5 text-xs font-medium rounded ${statusColors[runlist.status]}`}>
                    {runlist.status}
                  </span>
                </div>
              </div>

              {runlist.description && (
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{runlist.description}</p>
              )}

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    {formatScheduleTime(runlist.scheduleTime) || 'No schedule'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                  </svg>
                  <span>{runlist.templateIds?.length || 0} tasks</span>
                </div>
                {runlist.nextGenerationAt && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    <span>
                      Next: {new Date(runlist.nextGenerationAt._seconds ? runlist.nextGenerationAt._seconds * 1000 : runlist.nextGenerationAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                <Link
                  to={`/app/tasks/lists/${runlist.id}`}
                  className="text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  View
                </Link>
                <span className="text-gray-300">|</span>
                <Link
                  to={`/app/tasks/lists/${runlist.id}/edit`}
                  className="text-sm font-medium text-gray-600 hover:text-gray-700"
                >
                  Edit
                </Link>
                <span className="text-gray-300">|</span>
                {runlist.status === 'DRAFT' && (
                  <button
                    onClick={() => handleActivate(runlist.id)}
                    className="text-sm font-medium text-green-600 hover:text-green-700"
                  >
                    Activate
                  </button>
                )}
                {runlist.status === 'ACTIVE' && (
                  <button
                    onClick={() => handlePause(runlist.id)}
                    className="text-sm font-medium text-yellow-600 hover:text-yellow-700"
                  >
                    Pause
                  </button>
                )}
                {runlist.status === 'PAUSED' && (
                  <button
                    onClick={() => handleActivate(runlist.id)}
                    className="text-sm font-medium text-green-600 hover:text-green-700"
                  >
                    Resume
                  </button>
                )}
                {runlist.status !== 'ARCHIVED' && (
                  <>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={() => handleArchive(runlist.id)}
                      className="text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      Archive
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
