import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSite } from '../../../contexts/SiteContext';
import { tasksApi, landTractsApi, animalsApi } from '../../../services/api';
import { HelpTooltip } from '../../../components/ui/Tooltip';

// Categories that could involve livestock
const livestockCategories = ['FEEDING', 'WATERING', 'HEALTH_CHECK', 'MEDICATION', 'BREEDING', 'OTHER'];

const categoryOptions = [
  { value: 'FEEDING', label: 'Feeding', icon: '🍽️' },
  { value: 'WATERING', label: 'Watering', icon: '💧' },
  { value: 'HEALTH_CHECK', label: 'Health Check', icon: '🩺' },
  { value: 'MEDICATION', label: 'Medication', icon: '💊' },
  { value: 'BREEDING', label: 'Breeding', icon: '🐄' },
  { value: 'MAINTENANCE', label: 'Maintenance', icon: '🔧' },
  { value: 'CLEANING', label: 'Cleaning', icon: '🧹' },
  { value: 'HARVESTING', label: 'Harvesting', icon: '🌾' },
  { value: 'PLANTING', label: 'Planting', icon: '🌱' },
  { value: 'WEEDING', label: 'Weeding', icon: '🌿' },
  { value: 'IRRIGATION', label: 'Irrigation', icon: '💦' },
  { value: 'PEST_CONTROL', label: 'Pest Control', icon: '🐛' },
  { value: 'EQUIPMENT', label: 'Equipment', icon: '⚙️' },
  { value: 'ADMINISTRATIVE', label: 'Administrative', icon: '📋' },
  { value: 'OTHER', label: 'Other', icon: '📝' },
];

const priorityOptions = [
  { value: 'LOW', label: 'Low', color: 'bg-gray-100 text-gray-800' },
  { value: 'MEDIUM', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'HIGH', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'URGENT', label: 'Urgent', color: 'bg-red-100 text-red-800' },
];

const recurrencePatterns = [
  { value: 'ONCE', label: 'One time only' },
  { value: 'DAILY', label: 'Every day' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Every 2 weeks' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'YEARLY', label: 'Yearly' },
];

const daysOfWeek = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

export default function TaskForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentSite, sites } = useSite();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'OTHER',
    priority: 'MEDIUM',
    estimatedDurationMinutes: '',
    landTractId: '',
    instructions: '',
    requiredEquipment: [],
    siteIds: [],
    defaultAssigneeId: '',
    recurrence: {
      pattern: 'ONCE',
      interval: 1,
      daysOfWeek: [],
      dayOfMonth: null,
    },
    active: true,
    herdGroupId: '',
    selectedAnimalIds: [],
  });

  const [equipmentInput, setEquipmentInput] = useState('');
  const [landTracts, setLandTracts] = useState([]);
  const [animalGroups, setAnimalGroups] = useState([]);
  const [animalsInGroup, setAnimalsInGroup] = useState([]);
  const [loadingAnimals, setLoadingAnimals] = useState(false);

  useEffect(() => {
    if (isEditing) {
      fetchTemplate();
    }
    fetchLandTracts();
    fetchAnimalGroups();
  }, [id]);

  // Fetch animals when herd/group changes
  useEffect(() => {
    if (form.herdGroupId) {
      fetchAnimalsInGroup(form.herdGroupId);
    } else {
      setAnimalsInGroup([]);
    }
  }, [form.herdGroupId]);

  const fetchLandTracts = async () => {
    try {
      const response = await landTractsApi.list({ limit: 100 });
      const tracts = response?.data?.tracts || response?.tracts || [];
      setLandTracts(Array.isArray(tracts) ? tracts : []);
    } catch (err) {
      console.error('Failed to fetch land tracts:', err);
      setLandTracts([]);
    }
  };

  const fetchAnimalGroups = async () => {
    try {
      const response = await animalsApi.listGroups({ limit: 100 });
      const groups = response?.data?.groups || response?.groups || [];
      setAnimalGroups(Array.isArray(groups) ? groups : []);
    } catch (err) {
      console.error('Failed to fetch animal groups:', err);
      setAnimalGroups([]);
    }
  };

  const fetchAnimalsInGroup = async (groupId) => {
    setLoadingAnimals(true);
    try {
      // Include siteId in the query for proper filtering
      const response = await animalsApi.list({
        groupId,
        siteId: currentSite?.id,
        limit: 200
      });
      const animals = response?.data?.animals || response?.animals || [];
      setAnimalsInGroup(Array.isArray(animals) ? animals : []);
    } catch (err) {
      console.error('Failed to fetch animals in group:', err);
      setAnimalsInGroup([]);
    } finally {
      setLoadingAnimals(false);
    }
  };

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const response = await tasksApi.getTemplate(id);
      const template = response.data?.template || response.template || response.data;

      setForm({
        name: template.name || '',
        description: template.description || '',
        category: template.category || 'OTHER',
        priority: template.priority || 'MEDIUM',
        estimatedDurationMinutes: template.estimatedDurationMinutes || '',
        landTractId: template.landTractId || '',
        instructions: template.instructions || '',
        requiredEquipment: template.requiredEquipment || [],
        siteIds: template.siteIds || [],
        defaultAssigneeId: template.defaultAssigneeId || '',
        recurrence: template.recurrence || {
          pattern: 'ONCE',
          interval: 1,
          daysOfWeek: [],
          dayOfMonth: null,
        },
        active: template.active !== false,
        herdGroupId: template.herdGroupId || '',
        selectedAnimalIds: template.selectedAnimalIds || [],
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleRecurrenceChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      recurrence: {
        ...prev.recurrence,
        [field]: value,
      },
    }));
  };

  const handleDayOfWeekToggle = (day) => {
    setForm((prev) => {
      const current = prev.recurrence.daysOfWeek || [];
      const updated = current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day].sort();
      return {
        ...prev,
        recurrence: {
          ...prev.recurrence,
          daysOfWeek: updated,
        },
      };
    });
  };

  const handleAnimalToggle = (animalId) => {
    setForm((prev) => {
      const current = prev.selectedAnimalIds || [];
      const updated = current.includes(animalId)
        ? current.filter((id) => id !== animalId)
        : [...current, animalId];
      return {
        ...prev,
        selectedAnimalIds: updated,
      };
    });
  };

  const handleSelectAllAnimals = () => {
    const allAnimalIds = animalsInGroup.map((a) => a.id || a._id);
    const allSelected = allAnimalIds.every((id) => form.selectedAnimalIds.includes(id));

    setForm((prev) => ({
      ...prev,
      selectedAnimalIds: allSelected ? [] : allAnimalIds,
    }));
  };

  const isLivestockCategory = livestockCategories.includes(form.category);

  const handleAddEquipment = () => {
    if (equipmentInput.trim()) {
      setForm((prev) => ({
        ...prev,
        requiredEquipment: [...prev.requiredEquipment, equipmentInput.trim()],
      }));
      setEquipmentInput('');
    }
  };

  const handleRemoveEquipment = (index) => {
    setForm((prev) => ({
      ...prev,
      requiredEquipment: prev.requiredEquipment.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setError('Task name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const data = {
        ...form,
        estimatedDurationMinutes: form.estimatedDurationMinutes
          ? parseInt(form.estimatedDurationMinutes)
          : undefined,
        siteIds: form.siteIds.length > 0 ? form.siteIds : [currentSite.id],
      };

      // Clean up empty fields
      if (!data.description) delete data.description;
      if (!data.instructions) delete data.instructions;
      if (!data.defaultAssigneeId) delete data.defaultAssigneeId;
      if (!data.landTractId) delete data.landTractId;
      if (!data.herdGroupId) delete data.herdGroupId;
      if (!data.selectedAnimalIds || data.selectedAnimalIds.length === 0) delete data.selectedAnimalIds;

      if (isEditing) {
        await tasksApi.updateTemplate(id, data);
      } else {
        await tasksApi.createTemplate(data);
      }

      navigate('/app/tasks/templates');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
        <p className="mt-2 text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
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
        <h1 className="text-2xl font-display font-bold text-gray-900 mt-2">
          {isEditing ? 'Edit Task Template' : 'Create Task Template'}
        </h1>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>

          <div className="space-y-4">
            <div>
              <label className="label">Task Name *</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="input"
                placeholder="e.g., Feed cattle"
                required
              />
            </div>

            <div>
              <label className="label">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                className="input"
                rows={2}
                placeholder="Brief description of the task"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Category *</label>
                <select
                  name="category"
                  value={form.category}
                  onChange={(e) => {
                    handleChange(e);
                    // Reset livestock fields when changing away from livestock category
                    if (!livestockCategories.includes(e.target.value)) {
                      setForm((prev) => ({
                        ...prev,
                        category: e.target.value,
                        herdGroupId: '',
                        selectedAnimalIds: [],
                      }));
                    }
                  }}
                  className="input"
                >
                  {categoryOptions.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Priority *</label>
                <select
                  name="priority"
                  value={form.priority}
                  onChange={handleChange}
                  className="input"
                >
                  {priorityOptions.map((pri) => (
                    <option key={pri.value} value={pri.value}>
                      {pri.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Livestock Selection - Only shown for livestock-related categories */}
            {isLivestockCategory && (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <span>🐄</span> Livestock Selection
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="label">Herd / Group</label>
                    <select
                      name="herdGroupId"
                      value={form.herdGroupId}
                      onChange={(e) => {
                        setForm((prev) => ({
                          ...prev,
                          herdGroupId: e.target.value,
                          selectedAnimalIds: [], // Reset animal selection when group changes
                        }));
                      }}
                      className="input"
                    >
                      <option value="">Select a herd or group...</option>
                      {animalGroups.map((group) => (
                        <option key={group.id || group._id} value={group.id || group._id}>
                          {group.name} {group.animalCount ? `(${group.animalCount} animals)` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {form.herdGroupId && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="label mb-0">Select Animals</label>
                        <button
                          type="button"
                          onClick={handleSelectAllAnimals}
                          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                          {animalsInGroup.length > 0 &&
                          form.selectedAnimalIds.length === animalsInGroup.length
                            ? 'Deselect All'
                            : 'Select All'}
                        </button>
                      </div>

                      {loadingAnimals ? (
                        <div className="text-sm text-gray-500 py-4 text-center">
                          Loading animals...
                        </div>
                      ) : animalsInGroup.length === 0 ? (
                        <div className="text-sm text-gray-500 py-4 text-center bg-white rounded border border-gray-200">
                          No animals found in this group
                        </div>
                      ) : (
                        <div className="bg-white rounded border border-gray-200 max-h-48 overflow-y-auto">
                          {animalsInGroup.map((animal) => {
                            const animalId = animal.id || animal._id;
                            const isSelected = form.selectedAnimalIds.includes(animalId);
                            return (
                              <label
                                key={animalId}
                                className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                                  isSelected ? 'bg-primary-50' : ''
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleAnimalToggle(animalId)}
                                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                />
                                <span className="flex-1 text-sm text-gray-700">
                                  {animal.name || animal.tagNumber || `Animal #${animalId.slice(-6)}`}
                                </span>
                                {animal.tagNumber && animal.name && (
                                  <span className="text-xs text-gray-400">#{animal.tagNumber}</span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {form.selectedAnimalIds.length > 0 && (
                        <p className="text-xs text-gray-500 mt-2">
                          {form.selectedAnimalIds.length} animal{form.selectedAnimalIds.length !== 1 ? 's' : ''} selected
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="label">Estimated Duration (minutes)</label>
              <input
                type="number"
                name="estimatedDurationMinutes"
                value={form.estimatedDurationMinutes}
                onChange={handleChange}
                className="input"
                placeholder="30"
                min="1"
              />
            </div>
          </div>
        </div>

        {/* Location, Instructions & Equipment */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Location, Instructions & Equipment</h2>

          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="label mb-0">Location (Land Tract)</label>
                <HelpTooltip content="Optional: Select the pasture, field, or area where this task will be performed. Leave blank for off-site tasks like store runs." position="right" />
              </div>
              <select
                name="landTractId"
                value={form.landTractId}
                onChange={handleChange}
                className="input"
              >
                <option value="">No specific location (off-site or general)</option>
                {landTracts.map((tract) => (
                  <option key={tract.id || tract._id} value={tract.id || tract._id}>
                    {tract.name} {tract.acres ? `(${tract.acres} acres)` : ''} {tract.landUse ? `- ${tract.landUse}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Instructions</label>
              <textarea
                name="instructions"
                value={form.instructions}
                onChange={handleChange}
                className="input"
                rows={4}
                placeholder="Step-by-step instructions for completing this task..."
              />
            </div>

            <div>
              <label className="label">Required Equipment</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={equipmentInput}
                  onChange={(e) => setEquipmentInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEquipment())}
                  className="input flex-1"
                  placeholder="Add equipment..."
                />
                <button
                  type="button"
                  onClick={handleAddEquipment}
                  className="btn-secondary"
                >
                  Add
                </button>
              </div>
              {form.requiredEquipment.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.requiredEquipment.map((item, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => handleRemoveEquipment(index)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recurrence */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recurrence Schedule</h2>

          <div className="space-y-4">
            <div>
              <label className="label">Pattern</label>
              <select
                value={form.recurrence.pattern}
                onChange={(e) => handleRecurrenceChange('pattern', e.target.value)}
                className="input"
              >
                {recurrencePatterns.map((pat) => (
                  <option key={pat.value} value={pat.value}>
                    {pat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Day of Week Selection (for WEEKLY/BIWEEKLY) */}
            {['WEEKLY', 'BIWEEKLY'].includes(form.recurrence.pattern) && (
              <div>
                <label className="label">Days of Week</label>
                <div className="flex gap-2">
                  {daysOfWeek.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => handleDayOfWeekToggle(day.value)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                        form.recurrence.daysOfWeek?.includes(day.value)
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Day of Month (for MONTHLY) */}
            {form.recurrence.pattern === 'MONTHLY' && (
              <div>
                <label className="label">Day of Month</label>
                <select
                  value={form.recurrence.dayOfMonth || ''}
                  onChange={(e) =>
                    handleRecurrenceChange('dayOfMonth', e.target.value ? parseInt(e.target.value) : null)
                  }
                  className="input"
                >
                  <option value="">First available day</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Active</h3>
              <p className="text-sm text-gray-500">Inactive templates won't be used in lists</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="active"
                checked={form.active}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate('/app/tasks/templates')}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button type="submit" disabled={saving} className="flex-1 btn-primary py-3">
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Template'}
          </button>
        </div>
      </form>
    </div>
  );
}
