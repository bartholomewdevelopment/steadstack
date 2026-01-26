import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSite } from '../../../contexts/SiteContext';
import { tasksApi } from '../../../services/api';
import { HelpTooltip } from '../../../components/ui/Tooltip';

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

export default function TasksList() {
  const { currentSite } = useSite();
  const [searchParams, setSearchParams] = useSearchParams();
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const currentCategory = searchParams.get('category') || '';
  const currentPriority = searchParams.get('priority') || '';
  const currentActive = searchParams.get('active') !== 'false';

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (currentSite?.id) {
      fetchTemplates();
    }
  }, [currentSite, currentCategory, currentPriority, currentActive]);

  const fetchCategories = async () => {
    try {
      const response = await tasksApi.getCategories();
      setCategories(response.data?.categories || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchTemplates = async () => {
    if (!currentSite?.id) return;

    try {
      setLoading(true);
      setError(null);

      const params = {
        siteId: currentSite.id,
        activeOnly: currentActive,
      };
      if (currentCategory) params.category = currentCategory;

      const response = await tasksApi.listTemplates(params);
      let templatesData = response.data?.templates || [];

      // Filter by priority client-side if needed
      if (currentPriority) {
        templatesData = templatesData.filter((t) => t.priority === currentPriority);
      }

      setTemplates(templatesData);
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
    setSearchParams(params);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to deactivate this task template?')) return;

    try {
      await tasksApi.deleteTemplate(id);
      await fetchTemplates();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  if (!currentSite?.id) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Select a site to view task templates.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-bold text-gray-900">Task Templates</h1>
            <HelpTooltip content="Templates define recurring tasks. Add them to runlists to schedule them automatically or generate one-time occurrences." position="right" />
          </div>
          <p className="text-gray-600">Create reusable tasks to add to your chore lists</p>
        </div>
        <Link to="/app/tasks/templates/new" className="btn-primary inline-flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Task Template
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
          className="px-4 py-2 text-sm font-medium text-primary-600 border-b-2 border-primary-600"
        >
          Task Templates
        </Link>
        <Link
          to="/app/tasks/lists"
          className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          Lists
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={currentCategory}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="input py-2 min-w-[150px]"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {categoryIcons[cat.value]} {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={currentPriority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="input py-2 min-w-[150px]"
            >
              <option value="">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={currentActive ? 'true' : 'false'}
              onChange={(e) => handleFilterChange('active', e.target.value === 'true' ? '' : 'false')}
              className="input py-2 min-w-[150px]"
            >
              <option value="true">Active Only</option>
              <option value="false">Include Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Templates List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading templates...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600">{error}</p>
          <button onClick={fetchTemplates} className="mt-2 text-red-700 underline">
            Try again
          </button>
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">No task templates found</h3>
          <p className="text-gray-500 mt-1">
            {currentCategory || currentPriority ? 'Try adjusting your filters.' : 'Create your first task template to get started.'}
          </p>
          <Link to="/app/tasks/templates/new" className="btn-primary mt-4 inline-block">
            Create Task Template
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recurrence
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {templates.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{categoryIcons[template.category] || '📝'}</span>
                        <div>
                          <Link
                            to={`/app/tasks/templates/${template.id}`}
                            className="font-medium text-gray-900 hover:text-primary-600"
                          >
                            {template.name}
                          </Link>
                          {template.description && (
                            <p className="text-sm text-gray-500 truncate max-w-xs">{template.description}</p>
                          )}
                        </div>
                        {!template.active && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {template.category?.replace(/_/g, ' ').toLowerCase()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${priorityColors[template.priority]}`}>
                        {template.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {template.estimatedDurationMinutes ? `${template.estimatedDurationMinutes} min` : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {template.recurrence?.pattern || 'Once'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/app/tasks/templates/${template.id}`}
                          className="text-primary-600 hover:text-primary-700 font-medium"
                        >
                          View
                        </Link>
                        <Link
                          to={`/app/tasks/templates/${template.id}/edit`}
                          className="text-gray-600 hover:text-gray-700 font-medium"
                        >
                          Edit
                        </Link>
                        {template.active && (
                          <button
                            onClick={() => handleDelete(template.id)}
                            className="text-red-600 hover:text-red-700 font-medium"
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
