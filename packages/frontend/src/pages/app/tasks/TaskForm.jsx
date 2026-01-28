import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSite } from '../../../contexts/SiteContext';
import { tasksApi, landTractsApi, animalsApi, inventoryApi } from '../../../services/api';
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
    siteIds: [],
    defaultAssigneeId: '',
    recurrence: {
      pattern: 'ONCE',
      interval: 1,
      daysOfWeek: [],
      dayOfMonth: null,
    },
    active: true,
    herdGroupIds: [], // Changed from herdGroupId to support multiple
    selectedAnimalIds: [],
    // Inventory items needed for this task
    inventoryItems: [], // Array of { itemId, itemName, quantity, uom, allocationMode: 'TOTAL' | 'PER_ANIMAL' }
    // Tools needed for this task
    tools: [],
  });

  const [toolInput, setToolInput] = useState('');
  const [landTracts, setLandTracts] = useState([]);
  const [animalGroups, setAnimalGroups] = useState([]);
  const [animalsInGroups, setAnimalsInGroups] = useState([]); // Animals from all selected groups
  const [loadingAnimals, setLoadingAnimals] = useState(false);
  const [inventoryCatalog, setInventoryCatalog] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(false);

  useEffect(() => {
    if (isEditing) {
      fetchTemplate();
    }
    fetchLandTracts();
    fetchAnimalGroups();
    fetchInventoryCatalog();
  }, [id]);

  // Fetch animals when herd/groups change
  useEffect(() => {
    if (form.herdGroupIds.length > 0) {
      fetchAnimalsInGroups(form.herdGroupIds);
    } else {
      setAnimalsInGroups([]);
    }
  }, [form.herdGroupIds]);

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

  const fetchAnimalsInGroups = async (groupIds) => {
    setLoadingAnimals(true);
    try {
      // Fetch animals from all selected groups in parallel
      const responses = await Promise.all(
        groupIds.map((groupId) =>
          animalsApi.list({
            groupId,
            siteId: currentSite?.id,
            limit: 200,
          })
        )
      );

      // Combine all animals and tag them with their group info
      const allAnimals = [];
      responses.forEach((response, index) => {
        const animals = response?.data?.animals || response?.animals || [];
        const groupId = groupIds[index];
        const group = animalGroups.find((g) => (g.id || g._id) === groupId);
        animals.forEach((animal) => {
          allAnimals.push({
            ...animal,
            _groupId: groupId,
            _groupName: group?.name || 'Unknown Group',
          });
        });
      });
      setAnimalsInGroups(allAnimals);
    } catch (err) {
      console.error('Failed to fetch animals in groups:', err);
      setAnimalsInGroups([]);
    } finally {
      setLoadingAnimals(false);
    }
  };

  const fetchInventoryCatalog = async () => {
    setLoadingInventory(true);
    try {
      const response = await inventoryApi.list({ limit: 200 });
      const items = response?.data?.items || response?.items || [];
      setInventoryCatalog(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error('Failed to fetch inventory catalog:', err);
      setInventoryCatalog([]);
    } finally {
      setLoadingInventory(false);
    }
  };

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const response = await tasksApi.getTemplate(id);
      const template = response.data?.template || response.template || response.data;

      // Handle backward compatibility: convert old herdGroupId to herdGroupIds array
      let herdGroupIds = template.herdGroupIds || [];
      if (herdGroupIds.length === 0 && template.herdGroupId) {
        herdGroupIds = [template.herdGroupId];
      }

      setForm({
        name: template.name || '',
        description: template.description || '',
        category: template.category || 'OTHER',
        priority: template.priority || 'MEDIUM',
        estimatedDurationMinutes: template.estimatedDurationMinutes || '',
        landTractId: template.landTractId || '',
        instructions: template.instructions || '',
        siteIds: template.siteIds || [],
        defaultAssigneeId: template.defaultAssigneeId || '',
        recurrence: template.recurrence || {
          pattern: 'ONCE',
          interval: 1,
          daysOfWeek: [],
          dayOfMonth: null,
        },
        active: template.active !== false,
        herdGroupIds,
        selectedAnimalIds: template.selectedAnimalIds || [],
        inventoryItems: template.inventoryItems || [],
        tools: template.tools || [],
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

  const handleHerdGroupToggle = (groupId) => {
    setForm((prev) => {
      const current = prev.herdGroupIds || [];
      const updated = current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId];
      return {
        ...prev,
        herdGroupIds: updated,
        // Keep only animals that belong to still-selected groups
        selectedAnimalIds: prev.selectedAnimalIds.filter((animalId) => {
          const animal = animalsInGroups.find((a) => (a.id || a._id) === animalId);
          return animal && updated.includes(animal._groupId);
        }),
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
    const allAnimalIds = animalsInGroups.map((a) => a.id || a._id);
    const allSelected = allAnimalIds.every((id) => form.selectedAnimalIds.includes(id));

    setForm((prev) => ({
      ...prev,
      selectedAnimalIds: allSelected ? [] : allAnimalIds,
    }));
  };

  // Tool handlers
  const handleAddTool = () => {
    if (toolInput.trim()) {
      setForm((prev) => ({
        ...prev,
        tools: [...prev.tools, toolInput.trim()],
      }));
      setToolInput('');
    }
  };

  const handleRemoveTool = (index) => {
    setForm((prev) => ({
      ...prev,
      tools: prev.tools.filter((_, i) => i !== index),
    }));
  };

  // Inventory handlers
  const handleAddInventoryItem = (itemId) => {
    const item = inventoryCatalog.find((i) => (i.id || i._id) === itemId);
    if (!item) return;

    // Don't add duplicates
    if (form.inventoryItems.some((i) => i.itemId === itemId)) return;

    setForm((prev) => ({
      ...prev,
      inventoryItems: [
        ...prev.inventoryItems,
        {
          itemId,
          itemName: item.name,
          quantity: '',
          uom: item.uom || 'units',
          allocationMode: 'TOTAL', // Default to total allocation
        },
      ],
    }));
  };

  const handleRemoveInventoryItem = (index) => {
    setForm((prev) => ({
      ...prev,
      inventoryItems: prev.inventoryItems.filter((_, i) => i !== index),
    }));
  };

  const handleInventoryItemChange = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      inventoryItems: prev.inventoryItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  // Calculate total animals selected for inventory calculations
  const totalAnimalsSelected = form.selectedAnimalIds.length;

  const isLivestockCategory = livestockCategories.includes(form.category);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setError('Task name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Process inventory items to include calculated values
      const processedInventoryItems = form.inventoryItems.map((item) => ({
        ...item,
        quantity: parseFloat(item.quantity) || 0,
      }));

      const data = {
        ...form,
        estimatedDurationMinutes: form.estimatedDurationMinutes
          ? parseInt(form.estimatedDurationMinutes)
          : undefined,
        siteIds: form.siteIds.length > 0 ? form.siteIds : [currentSite.id],
        inventoryItems: processedInventoryItems,
      };

      // Clean up empty fields
      if (!data.description) delete data.description;
      if (!data.instructions) delete data.instructions;
      if (!data.defaultAssigneeId) delete data.defaultAssigneeId;
      if (!data.landTractId) delete data.landTractId;
      if (!data.herdGroupIds || data.herdGroupIds.length === 0) delete data.herdGroupIds;
      if (!data.selectedAnimalIds || data.selectedAnimalIds.length === 0) delete data.selectedAnimalIds;
      if (!data.inventoryItems || data.inventoryItems.length === 0) delete data.inventoryItems;
      if (!data.tools || data.tools.length === 0) delete data.tools;

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
                  {/* Multi-select Herd/Groups */}
                  <div>
                    <label className="label">Herds / Groups (select one or more)</label>
                    <div className="bg-white rounded border border-gray-200 max-h-40 overflow-y-auto">
                      {animalGroups.length === 0 ? (
                        <div className="text-sm text-gray-500 py-4 text-center">
                          No herds or groups found
                        </div>
                      ) : (
                        animalGroups.map((group) => {
                          const groupId = group.id || group._id;
                          const isSelected = form.herdGroupIds.includes(groupId);
                          return (
                            <label
                              key={groupId}
                              className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                                isSelected ? 'bg-primary-50' : ''
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleHerdGroupToggle(groupId)}
                                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                              />
                              <span className="flex-1 text-sm text-gray-700">
                                {group.name}
                              </span>
                              {group.animalCount && (
                                <span className="text-xs text-gray-400">
                                  {group.animalCount} animals
                                </span>
                              )}
                            </label>
                          );
                        })
                      )}
                    </div>
                    {form.herdGroupIds.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {form.herdGroupIds.length} group{form.herdGroupIds.length !== 1 ? 's' : ''} selected
                      </p>
                    )}
                  </div>

                  {/* Animal selection from all selected groups */}
                  {form.herdGroupIds.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="label mb-0">Select Animals</label>
                        <button
                          type="button"
                          onClick={handleSelectAllAnimals}
                          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                          {animalsInGroups.length > 0 &&
                          form.selectedAnimalIds.length === animalsInGroups.length
                            ? 'Deselect All'
                            : 'Select All'}
                        </button>
                      </div>

                      {loadingAnimals ? (
                        <div className="text-sm text-gray-500 py-4 text-center">
                          Loading animals...
                        </div>
                      ) : animalsInGroups.length === 0 ? (
                        <div className="text-sm text-gray-500 py-4 text-center bg-white rounded border border-gray-200">
                          No animals found in selected groups
                        </div>
                      ) : (
                        <div className="bg-white rounded border border-gray-200 max-h-48 overflow-y-auto">
                          {animalsInGroups.map((animal) => {
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
                                <span className="text-xs text-gray-400">
                                  {animal._groupName}
                                  {animal.tagNumber && animal.name && ` • #${animal.tagNumber}`}
                                </span>
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
              <label className="label">Tools Needed</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={toolInput}
                  onChange={(e) => setToolInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTool())}
                  className="input flex-1"
                  placeholder="Add a tool (e.g., Pitchfork, Bucket, Syringe)..."
                />
                <button
                  type="button"
                  onClick={handleAddTool}
                  className="btn-secondary"
                >
                  Add
                </button>
              </div>
              {form.tools.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.tools.map((tool, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm"
                    >
                      🔧 {tool}
                      <button
                        type="button"
                        onClick={() => handleRemoveTool(index)}
                        className="text-amber-600 hover:text-amber-800"
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

        {/* Inventory Items */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>📦</span> Inventory Items
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Track inventory items that will be used/consumed when this task is performed.
          </p>

          <div className="space-y-4">
            {/* Add inventory item dropdown */}
            <div>
              <label className="label">Add Inventory Item</label>
              <select
                value=""
                onChange={(e) => e.target.value && handleAddInventoryItem(e.target.value)}
                className="input"
                disabled={loadingInventory}
              >
                <option value="">
                  {loadingInventory ? 'Loading inventory...' : 'Select an item to add...'}
                </option>
                {inventoryCatalog
                  .filter((item) => !form.inventoryItems.some((i) => i.itemId === (item.id || item._id)))
                  .map((item) => (
                    <option key={item.id || item._id} value={item.id || item._id}>
                      {item.name} ({item.category}) - {item.uom}
                    </option>
                  ))}
              </select>
            </div>

            {/* List of added inventory items */}
            {form.inventoryItems.length > 0 && (
              <div className="space-y-3">
                {form.inventoryItems.map((item, index) => (
                  <div
                    key={item.itemId}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-gray-900">{item.itemName}</p>
                        <p className="text-xs text-gray-500">Unit: {item.uom}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveInventoryItem(index)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Quantity</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleInventoryItemChange(index, 'quantity', e.target.value)}
                            className="input flex-1"
                            placeholder="0"
                            min="0"
                            step="0.01"
                          />
                          <span className="text-sm text-gray-500">{item.uom}</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Allocation Mode</label>
                        <select
                          value={item.allocationMode}
                          onChange={(e) => handleInventoryItemChange(index, 'allocationMode', e.target.value)}
                          className="input"
                        >
                          <option value="TOTAL">Total (divide among animals)</option>
                          <option value="PER_ANIMAL">Per Animal (multiply by count)</option>
                        </select>
                      </div>
                    </div>

                    {/* Show calculation preview if animals are selected */}
                    {totalAnimalsSelected > 0 && item.quantity && (
                      <div className="mt-3 p-2 bg-blue-50 rounded text-sm text-blue-700">
                        {item.allocationMode === 'TOTAL' ? (
                          <>
                            <strong>{item.quantity} {item.uom}</strong> total ÷ {totalAnimalsSelected} animals = <strong>{(parseFloat(item.quantity) / totalAnimalsSelected).toFixed(2)} {item.uom}</strong> per animal
                          </>
                        ) : (
                          <>
                            <strong>{item.quantity} {item.uom}</strong> per animal × {totalAnimalsSelected} animals = <strong>{(parseFloat(item.quantity) * totalAnimalsSelected).toFixed(2)} {item.uom}</strong> total
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {form.inventoryItems.length === 0 && (
              <div className="text-sm text-gray-500 py-4 text-center border border-dashed border-gray-300 rounded-lg">
                No inventory items added yet
              </div>
            )}
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
