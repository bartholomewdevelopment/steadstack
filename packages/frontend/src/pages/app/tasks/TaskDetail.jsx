import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { tasksApi } from '../../../services/api';

const categoryIcons = {
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

const priorityColors = {
  URGENT: 'bg-red-100 text-red-800',
  HIGH: 'bg-orange-100 text-orange-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  LOW: 'bg-gray-100 text-gray-800',
};

const recurrenceLabels = {
  ONCE: 'One time only',
  DAILY: 'Every day',
  WEEKLY: 'Weekly',
  BIWEEKLY: 'Every 2 weeks',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  YEARLY: 'Yearly',
};

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTemplate();
  }, [id]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const response = await tasksApi.getTemplate(id);
      setTemplate(response.data?.template || response.template || response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to deactivate this task template?')) return;

    try {
      await tasksApi.deleteTemplate(id);
      navigate('/app/tasks/templates');
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const formatRecurrence = (recurrence) => {
    if (!recurrence) return 'Once';

    let description = recurrenceLabels[recurrence.pattern] || recurrence.pattern;

    if (['WEEKLY', 'BIWEEKLY'].includes(recurrence.pattern) && recurrence.daysOfWeek?.length > 0) {
      const days = recurrence.daysOfWeek.map((d) => dayLabels[d]).join(', ');
      description += ` on ${days}`;
    }

    if (recurrence.pattern === 'MONTHLY' && recurrence.dayOfMonth) {
      description += ` on day ${recurrence.dayOfMonth}`;
    }

    return description;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
        <p className="mt-2 text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md mx-auto">
          <p className="text-red-600">{error}</p>
          <button onClick={fetchTemplate} className="mt-2 text-red-700 underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Template not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/app/tasks/templates"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to Templates
        </Link>

        <div className="flex items-start justify-between mt-4">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{categoryIcons[template.category] || '📝'}</span>
            <div>
              <h1 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-2">
                {template.name}
                {!template.active && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 rounded">
                    Inactive
                  </span>
                )}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${priorityColors[template.priority]}`}>
                  {template.priority}
                </span>
                <span className="text-gray-500">{template.category?.replace(/_/g, ' ')}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to={`/app/tasks/templates/${id}/edit`} className="btn-secondary">
              Edit
            </Link>
            {template.active && (
              <button onClick={handleDelete} className="btn-secondary text-red-600 hover:text-red-700">
                Deactivate
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
            <dl className="grid sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Estimated Duration</dt>
                <dd className="mt-1 text-gray-900">
                  {template.estimatedDurationMinutes ? `${template.estimatedDurationMinutes} minutes` : 'Not set'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Recurrence</dt>
                <dd className="mt-1 text-gray-900">{formatRecurrence(template.recurrence)}</dd>
              </div>
              {template.description && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Description</dt>
                  <dd className="mt-1 text-gray-900">{template.description}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Instructions Card */}
          {template.instructions && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Instructions</h2>
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                {template.instructions}
              </div>
            </div>
          )}

          {/* Equipment Card */}
          {template.requiredEquipment?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Required Equipment</h2>
              <div className="flex flex-wrap gap-2">
                {template.requiredEquipment.map((item, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Info</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">Status</dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                      template.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {template.active ? 'Active' : 'Inactive'}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Created</dt>
                <dd className="mt-1 text-gray-900">
                  {template.createdAt
                    ? new Date(template.createdAt._seconds ? template.createdAt._seconds * 1000 : template.createdAt).toLocaleDateString()
                    : 'Unknown'}
                </dd>
              </div>
              {template.updatedAt && (
                <div>
                  <dt className="text-sm text-gray-500">Last Updated</dt>
                  <dd className="mt-1 text-gray-900">
                    {new Date(template.updatedAt._seconds ? template.updatedAt._seconds * 1000 : template.updatedAt).toLocaleDateString()}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Actions</h3>
            <div className="space-y-2">
              <Link
                to={`/app/tasks/templates/${id}/edit`}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                Edit Template
              </Link>
              <Link
                to="/app/tasks/lists"
                className="flex items-center gap-2 w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                Add to a List
              </Link>
            </div>
          </div>

          {/* Danger Zone */}
          {template.active && (
            <div className="bg-white rounded-xl border border-red-200 p-6">
              <h3 className="font-semibold text-red-900 mb-2">Danger Zone</h3>
              <p className="text-sm text-gray-600 mb-4">
                Deactivating this template will prevent it from being used in new lists.
              </p>
              <button
                onClick={handleDelete}
                className="w-full px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
              >
                Deactivate Template
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
