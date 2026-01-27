import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSite } from '../../../contexts/SiteContext';
import { tasksApi } from '../../../services/api';

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-600',
  ACTIVE: 'bg-green-100 text-green-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  ARCHIVED: 'bg-gray-100 text-gray-500',
};

const occurrenceStatusColors = {
  SCHEDULED: 'bg-gray-100 text-gray-600',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  SKIPPED: 'bg-yellow-100 text-yellow-700',
  CANCELLED: 'bg-red-100 text-red-700',
  OVERDUE: 'bg-red-100 text-red-700',
};

export default function RunlistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentSite } = useSite();
  const [runlist, setRunlist] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [occurrences, setOccurrences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchRunlist();
    }
  }, [id]);

  const fetchRunlist = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await tasksApi.getRunlist(id);
      setRunlist(response.data?.runlist);

      // Fetch templates for this runlist
      const templateIds = response.data?.runlist?.templateIds || [];
      if (templateIds.length > 0) {
        const templatePromises = templateIds.map((tid) =>
          tasksApi.getTemplate(tid).catch(() => null)
        );
        const templateResults = await Promise.all(templatePromises);
        setTemplates(templateResults.filter(Boolean).map((r) => r.data?.template));
      }

      // Fetch recent occurrences
      try {
        const occResponse = await tasksApi.listOccurrences({
          runlistId: id,
          limit: 10,
        });
        setOccurrences(occResponse.data?.occurrences || []);
      } catch (err) {
        console.error('Failed to fetch occurrences:', err);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    try {
      setActionLoading(true);
      await tasksApi.activateRunlist(id);
      await fetchRunlist();
    } catch (err) {
      alert('Failed to activate: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    try {
      setActionLoading(true);
      await tasksApi.pauseRunlist(id);
      await fetchRunlist();
    } catch (err) {
      alert('Failed to pause: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm('Are you sure you want to archive this list? This action cannot be undone.')) {
      return;
    }
    try {
      setActionLoading(true);
      await tasksApi.archiveRunlist(id);
      navigate('/app/tasks/lists');
    } catch (err) {
      alert('Failed to archive: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const formatScheduleTime = (time) => {
    if (!time) return 'Not set';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatRecurrence = (pattern, daysOfWeek, dayOfMonth) => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    switch (pattern) {
      case 'ONCE':
        return 'One time';
      case 'DAILY':
        return 'Every day';
      case 'WEEKLY':
        if (daysOfWeek?.length === 7) return 'Every day';
        if (daysOfWeek?.length === 5 && !daysOfWeek.includes(0) && !daysOfWeek.includes(6)) {
          return 'Weekdays';
        }
        if (daysOfWeek?.length === 2 && daysOfWeek.includes(0) && daysOfWeek.includes(6)) {
          return 'Weekends';
        }
        return `Weekly on ${daysOfWeek?.map((d) => dayNames[d]).join(', ') || 'selected days'}`;
      case 'BIWEEKLY':
        return `Every two weeks on ${daysOfWeek?.map((d) => dayNames[d]).join(', ') || 'selected days'}`;
      case 'MONTHLY':
        return `Monthly on day ${dayOfMonth || 1}`;
      case 'QUARTERLY':
        return `Quarterly on day ${dayOfMonth || 1}`;
      case 'YEARLY':
        return 'Yearly';
      default:
        return pattern || 'Not set';
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date._seconds ? new Date(date._seconds * 1000) : new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!currentSite?.id) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Select a site to view list details.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
        <p className="mt-2 text-gray-500">Loading list...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600">{error}</p>
        <button onClick={fetchRunlist} className="mt-2 text-red-700 underline">
          Try again
        </button>
      </div>
    );
  }

  if (!runlist) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">List not found.</p>
        <Link to="/app/tasks/lists" className="text-primary-600 hover:text-primary-700 mt-2 inline-block">
          Back to Lists
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/app/tasks/lists"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-display font-bold text-gray-900">{runlist.name}</h1>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[runlist.status]}`}>
                {runlist.status}
              </span>
            </div>
            {runlist.description && (
              <p className="text-gray-600 mt-1">{runlist.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {runlist.status === 'DRAFT' && (
            <button
              onClick={handleActivate}
              disabled={actionLoading}
              className="btn-primary disabled:opacity-50"
            >
              Activate
            </button>
          )}
          {runlist.status === 'ACTIVE' && (
            <button
              onClick={handlePause}
              disabled={actionLoading}
              className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 font-medium disabled:opacity-50"
            >
              Pause
            </button>
          )}
          {runlist.status === 'PAUSED' && (
            <button
              onClick={handleActivate}
              disabled={actionLoading}
              className="btn-primary disabled:opacity-50"
            >
              Resume
            </button>
          )}
          {runlist.status !== 'ARCHIVED' && (
            <>
              <Link
                to={`/app/tasks/lists/${id}/edit`}
                className="btn-secondary"
              >
                Edit
              </Link>
              <button
                onClick={handleArchive}
                disabled={actionLoading}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium disabled:opacity-50"
              >
                Archive
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tasks in this List */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Tasks ({templates.length})
            </h2>
            {templates.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500 mb-2">No tasks in this list</p>
                <Link
                  to={`/app/tasks/lists/${id}/edit`}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Add tasks
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((template) => (
                  <Link
                    key={template.id}
                    to={`/app/tasks/templates/${template.id}`}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-2xl">{getCategoryIcon(template.category)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{template.name}</p>
                      <p className="text-sm text-gray-500 capitalize">
                        {template.category?.toLowerCase().replace('_', ' ')}
                        {template.estimatedDuration && ` • ${template.estimatedDuration} min`}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded capitalize ${
                      template.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                      template.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                      template.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {template.priority?.toLowerCase()}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Occurrences */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
            {occurrences.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No task occurrences yet</p>
                {runlist.status === 'DRAFT' && (
                  <p className="text-sm text-gray-400 mt-1">
                    Activate this list to start generating tasks
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {occurrences.map((occ) => (
                  <div
                    key={occ.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{occ.taskName}</p>
                      <p className="text-sm text-gray-500">{formatDate(occ.scheduledDate)}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${occurrenceStatusColors[occ.status]}`}>
                      {occ.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Schedule Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Schedule</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Time</p>
                <p className="font-medium text-gray-900">{formatScheduleTime(runlist.scheduleTime)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Recurrence</p>
                <p className="font-medium text-gray-900">
                  {formatRecurrence(runlist.recurrencePattern, runlist.daysOfWeek, runlist.dayOfMonth)}
                </p>
              </div>
              {runlist.nextGenerationAt && (
                <div>
                  <p className="text-sm text-gray-500">Next Run</p>
                  <p className="font-medium text-gray-900">{formatDate(runlist.nextGenerationAt)}</p>
                </div>
              )}
              {runlist.timezone && (
                <div>
                  <p className="text-sm text-gray-500">Timezone</p>
                  <p className="font-medium text-gray-900">{runlist.timezone}</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{templates.length}</p>
                <p className="text-sm text-gray-500">Tasks</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{occurrences.length}</p>
                <p className="text-sm text-gray-500">Occurrences</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {occurrences.filter((o) => o.status === 'COMPLETED').length}
                </p>
                <p className="text-sm text-gray-500">Completed</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">
                  {occurrences.filter((o) => o.status === 'SKIPPED').length}
                </p>
                <p className="text-sm text-gray-500">Skipped</p>
              </div>
            </div>
          </div>

          {/* Meta Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Info</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="text-gray-900">{formatDate(runlist.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Updated</span>
                <span className="text-gray-900">{formatDate(runlist.updatedAt)}</span>
              </div>
              {runlist.createdBy && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Created by</span>
                  <span className="text-gray-900 truncate ml-2">{runlist.createdBy}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getCategoryIcon(category) {
  const icons = {
    FEEDING: '🍽️',
    WATERING: '💧',
    HEALTH_CHECK: '🩺',
    MEDICATION: '💊',
    BREEDING: '🐄',
    MAINTENANCE: '🔧',
    CLEANING: '🧹',
    HARVESTING: '🌾',
    PLANTING: '🌱',
    WEEDING: '🌿',
    IRRIGATION: '💦',
    PEST_CONTROL: '🐛',
    EQUIPMENT: '⚙️',
    ADMINISTRATIVE: '📋',
    OTHER: '📝',
  };
  return icons[category] || '📝';
}
