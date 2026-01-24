import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useSite } from '../../../contexts/SiteContext';
import { tasksApi } from '../../../services/api';

const daysOfWeek = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

export default function RunlistForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentSite } = useSite();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    scheduleTime: '08:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    recurrencePattern: 'DAILY',
    daysOfWeek: [1, 2, 3, 4, 5], // Weekdays by default
    dayOfMonth: 1,
    templateIds: [],
    defaultAssignee: '',
  });

  useEffect(() => {
    if (currentSite?.id) {
      fetchTemplates();
      if (isEditing) {
        fetchRunlist();
      }
    }
  }, [currentSite, id]);

  const fetchTemplates = async () => {
    if (!currentSite?.id) return;

    try {
      setLoadingTemplates(true);
      const response = await tasksApi.listTemplates({
        siteId: currentSite.id,
        isActive: true,
        limit: 100,
      });
      setAvailableTemplates(response.data?.templates || []);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const fetchRunlist = async () => {
    try {
      setLoading(true);
      const response = await tasksApi.getRunlist(id);
      const runlist = response.data?.runlist;
      if (runlist) {
        setFormData({
          name: runlist.name || '',
          description: runlist.description || '',
          scheduleTime: runlist.scheduleTime || '08:00',
          timezone: runlist.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          recurrencePattern: runlist.recurrencePattern || 'DAILY',
          daysOfWeek: runlist.daysOfWeek || [1, 2, 3, 4, 5],
          dayOfMonth: runlist.dayOfMonth || 1,
          templateIds: runlist.templateIds || [],
          defaultAssignee: runlist.defaultAssignee || '',
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentSite?.id) return;

    try {
      setSaving(true);
      setError(null);

      const payload = {
        ...formData,
        siteId: currentSite.id,
      };

      if (isEditing) {
        await tasksApi.updateRunlist(id, payload);
      } else {
        await tasksApi.createRunlist(payload);
      }

      navigate('/app/tasks/lists');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateToggle = (templateId) => {
    setFormData((prev) => {
      const newIds = prev.templateIds.includes(templateId)
        ? prev.templateIds.filter((id) => id !== templateId)
        : [...prev.templateIds, templateId];
      return { ...prev, templateIds: newIds };
    });
  };

  const handleDayToggle = (day) => {
    setFormData((prev) => {
      const newDays = prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day].sort((a, b) => a - b);
      return { ...prev, daysOfWeek: newDays };
    });
  };

  const selectedTemplates = availableTemplates.filter((t) =>
    formData.templateIds.includes(t.id)
  );
  const unselectedTemplates = availableTemplates.filter(
    (t) => !formData.templateIds.includes(t.id)
  );

  if (!currentSite?.id) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Select a site to manage lists.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
        <p className="mt-2 text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
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
          <h1 className="text-2xl font-display font-bold text-gray-900">
            {isEditing ? 'Edit List' : 'Create New List'}
          </h1>
          <p className="text-gray-600">
            {isEditing ? 'Update list settings and tasks' : 'Set up a recurring task list'}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid gap-4">
            <div>
              <label className="label">List Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                placeholder="Morning Chores"
              />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input"
                rows={3}
                placeholder="Daily morning tasks for the farm..."
              />
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Schedule</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Time of Day</label>
              <input
                type="time"
                value={formData.scheduleTime}
                onChange={(e) => setFormData({ ...formData, scheduleTime: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Recurrence Pattern</label>
              <select
                value={formData.recurrencePattern}
                onChange={(e) => setFormData({ ...formData, recurrencePattern: e.target.value })}
                className="input"
              >
                <option value="ONCE">One Time</option>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="BIWEEKLY">Every Two Weeks</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>
          </div>

          {/* Days of Week for Weekly patterns */}
          {(formData.recurrencePattern === 'WEEKLY' || formData.recurrencePattern === 'BIWEEKLY') && (
            <div className="mt-4">
              <label className="label">Days of Week</label>
              <div className="flex flex-wrap gap-2">
                {daysOfWeek.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => handleDayToggle(day.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.daysOfWeek.includes(day.value)
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Day of Month for Monthly patterns */}
          {(formData.recurrencePattern === 'MONTHLY' || formData.recurrencePattern === 'QUARTERLY') && (
            <div className="mt-4">
              <label className="label">Day of Month</label>
              <select
                value={formData.dayOfMonth}
                onChange={(e) => setFormData({ ...formData, dayOfMonth: parseInt(e.target.value) })}
                className="input w-32"
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick presets */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <label className="label">Quick Presets</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, recurrencePattern: 'DAILY' })}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Every Day
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    recurrencePattern: 'WEEKLY',
                    daysOfWeek: [1, 2, 3, 4, 5],
                  })
                }
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Weekdays
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    recurrencePattern: 'WEEKLY',
                    daysOfWeek: [0, 6],
                  })
                }
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Weekends
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    recurrencePattern: 'WEEKLY',
                    daysOfWeek: [1],
                  })
                }
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Every Monday
              </button>
            </div>
          </div>
        </div>

        {/* Task Templates */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Tasks ({formData.templateIds.length} selected)
          </h2>

          {loadingTemplates ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent"></div>
            </div>
          ) : availableTemplates.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500 mb-2">No task templates available</p>
              <Link to="/app/tasks/templates/new" className="text-primary-600 hover:text-primary-700 font-medium">
                Create a task template first
              </Link>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Available Templates */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Available Templates</h3>
                <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                  {unselectedTemplates.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      All templates selected
                    </div>
                  ) : (
                    unselectedTemplates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => handleTemplateToggle(template.id)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 text-left"
                      >
                        <span className="text-xl">{getCategoryIcon(template.category)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {template.name}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">
                            {template.category?.toLowerCase().replace('_', ' ')}
                          </p>
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Selected Templates */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Templates</h3>
                <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto bg-primary-50/30">
                  {selectedTemplates.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      No templates selected
                    </div>
                  ) : (
                    selectedTemplates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => handleTemplateToggle(template.id)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-primary-50 border-b border-primary-100 last:border-b-0 text-left"
                      >
                        <span className="text-xl">{getCategoryIcon(template.category)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {template.name}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">
                            {template.category?.toLowerCase().replace('_', ' ')}
                          </p>
                        </div>
                        <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Link
            to="/app/tasks/lists"
            className="btn-secondary"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary disabled:opacity-50"
          >
            {saving ? 'Saving...' : isEditing ? 'Update List' : 'Create List'}
          </button>
        </div>
      </form>
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
    IRRIGATION: '💦',
    PEST_CONTROL: '🐛',
    EQUIPMENT: '⚙️',
    ADMINISTRATIVE: '📋',
    OTHER: '📝',
  };
  return icons[category] || '📝';
}
