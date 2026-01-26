import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { animalsApi, sitesApi } from '../../../services/api';

export default function AnimalForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [groups, setGroups] = useState([]);
  const [sites, setSites] = useState([]);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', type: 'herd', species: 'cattle' });
  const [savingGroup, setSavingGroup] = useState(false);

  const [form, setForm] = useState({
    tagNumber: '',
    name: '',
    species: 'cattle',
    breed: '',
    gender: 'female',
    dateOfBirth: '',
    acquisitionDate: new Date().toISOString().split('T')[0],
    siteId: '',
    groupId: '',
    color: '',
    markings: '',
    weight: { value: '', unit: 'lbs' },
    registrationNumber: '',
    electronicId: '',
    acquisition: {
      method: 'purchased',
      source: '',
      cost: '',
      notes: '',
    },
    notes: '',
  });

  useEffect(() => {
    fetchOptions();
    if (isEditing) {
      fetchAnimal();
    }
  }, [id]);

  const fetchOptions = async () => {
    try {
      const [groupsRes, sitesRes] = await Promise.all([
        animalsApi.listGroups({}),
        sitesApi.list(),
      ]);
      setGroups(groupsRes.data?.groups || []);
      setSites(sitesRes.data?.sites || []);
    } catch (err) {
      console.error('Error fetching options:', err);
    }
  };

  // Helper to convert date to YYYY-MM-DD format for input fields
  const formatDateForInput = (dateValue) => {
    if (!dateValue) return '';
    // Handle Firestore Timestamp objects
    if (dateValue.toDate) {
      return dateValue.toDate().toISOString().split('T')[0];
    }
    // Handle Date objects
    if (dateValue instanceof Date) {
      return dateValue.toISOString().split('T')[0];
    }
    // Handle ISO string
    if (typeof dateValue === 'string') {
      return dateValue.split('T')[0];
    }
    // Handle seconds/nanoseconds format from Firestore
    if (dateValue._seconds) {
      return new Date(dateValue._seconds * 1000).toISOString().split('T')[0];
    }
    return '';
  };

  const fetchAnimal = async () => {
    try {
      setLoading(true);
      const response = await animalsApi.get(id);
      const animal = response.data?.animal || response.animal || response.data;

      setForm({
        tagNumber: animal.tagNumber || '',
        name: animal.name || '',
        species: animal.species || 'cattle',
        breed: animal.breed || '',
        gender: animal.gender || 'female',
        dateOfBirth: formatDateForInput(animal.dateOfBirth),
        acquisitionDate: formatDateForInput(animal.acquisitionDate),
        siteId: animal.siteId?.id || animal.siteId || '',
        groupId: animal.groupId?.id || animal.groupId || '',
        color: animal.color || '',
        markings: animal.markings || '',
        weight: animal.weight || { value: '', unit: 'lbs' },
        registrationNumber: animal.registrationNumber || '',
        electronicId: animal.electronicId || '',
        acquisition: animal.acquisition || {
          method: 'purchased',
          source: '',
          cost: '',
          notes: '',
        },
        notes: animal.notes || '',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroup.name.trim() || !form.siteId) {
      setError('Please enter a group name and select a site first');
      return;
    }

    setSavingGroup(true);
    try {
      const response = await animalsApi.createGroup({
        siteId: form.siteId,
        name: newGroup.name,
        type: newGroup.type,
        species: newGroup.species || form.species,
      });

      const createdGroup = response.data?.group;
      if (createdGroup) {
        setGroups((prev) => [...prev, createdGroup]);
        setForm((prev) => ({ ...prev, groupId: createdGroup.id }));
      }

      setShowAddGroup(false);
      setNewGroup({ name: '', type: 'herd', species: 'cattle' });
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingGroup(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith('weight.')) {
      const field = name.split('.')[1];
      setForm((prev) => ({
        ...prev,
        weight: { ...prev.weight, [field]: field === 'value' ? value : value },
      }));
    } else if (name.startsWith('acquisition.')) {
      const field = name.split('.')[1];
      setForm((prev) => ({
        ...prev,
        acquisition: { ...prev.acquisition, [field]: value },
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      // Clean up the form data
      const data = {
        ...form,
        weight: form.weight.value
          ? { value: parseFloat(form.weight.value), unit: form.weight.unit }
          : undefined,
        acquisition: {
          ...form.acquisition,
          cost: form.acquisition.cost ? parseFloat(form.acquisition.cost) : undefined,
        },
        groupId: form.groupId || null,
        siteId: form.siteId || undefined,
      };

      // Remove empty strings
      Object.keys(data).forEach((key) => {
        if (data[key] === '') delete data[key];
      });

      if (isEditing) {
        await animalsApi.update(id, data);
      } else {
        await animalsApi.create(data);
      }

      navigate('/app/animals');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading animal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/app/animals"
          className="text-gray-500 hover:text-gray-700 text-sm mb-2 inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Livestock
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Animal' : 'Add Animal'}
        </h1>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tag Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="tagNumber"
                value={form.tagNumber}
                onChange={handleChange}
                required
                className="input"
                placeholder="e.g., 001, A-123"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="input"
                placeholder="Optional name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Species <span className="text-red-500">*</span>
              </label>
              <select
                name="species"
                value={form.species}
                onChange={handleChange}
                required
                className="input"
              >
                <option value="cattle">Cattle</option>
                <option value="sheep">Sheep</option>
                <option value="goat">Goat</option>
                <option value="pig">Pig</option>
                <option value="horse">Horse</option>
                <option value="poultry">Poultry</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Breed</label>
              <input
                type="text"
                name="breed"
                value={form.breed}
                onChange={handleChange}
                className="input"
                placeholder="e.g., Angus, Hereford"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender <span className="text-red-500">*</span>
              </label>
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                required
                className="input"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="castrated">Castrated</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input
                type="date"
                name="dateOfBirth"
                value={form.dateOfBirth}
                onChange={handleChange}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Location</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Site <span className="text-red-500">*</span>
              </label>
              <select
                name="siteId"
                value={form.siteId}
                onChange={handleChange}
                required
                className="input"
              >
                <option value="">Select site...</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Group / Herd</label>
                <button
                  type="button"
                  onClick={() => setShowAddGroup(!showAddGroup)}
                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  {showAddGroup ? 'Cancel' : '+ Add Group'}
                </button>
              </div>
              {showAddGroup ? (
                <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <input
                    type="text"
                    value={newGroup.name}
                    onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                    placeholder="Group name"
                    className="input text-sm"
                  />
                  <div className="flex gap-2">
                    <select
                      value={newGroup.type}
                      onChange={(e) => setNewGroup({ ...newGroup, type: e.target.value })}
                      className="input text-sm flex-1"
                    >
                      <option value="herd">Herd</option>
                      <option value="flock">Flock</option>
                      <option value="pen">Pen</option>
                      <option value="pasture">Pasture</option>
                      <option value="barn">Barn</option>
                      <option value="coop">Coop</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleCreateGroup}
                      disabled={savingGroup || !form.siteId}
                      className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {savingGroup ? 'Saving...' : 'Add'}
                    </button>
                  </div>
                  {!form.siteId && (
                    <p className="text-xs text-amber-600">Select a site first to create a group</p>
                  )}
                </div>
              ) : (
                <select
                  name="groupId"
                  value={form.groupId}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="">No group</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.type})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Physical Attributes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Physical Attributes</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <input
                type="text"
                name="color"
                value={form.color}
                onChange={handleChange}
                className="input"
                placeholder="e.g., Black, Red"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Markings</label>
              <input
                type="text"
                name="markings"
                value={form.markings}
                onChange={handleChange}
                className="input"
                placeholder="e.g., White face, star"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  name="weight.value"
                  value={form.weight.value}
                  onChange={handleChange}
                  className="input flex-1"
                  placeholder="Weight"
                />
                <select
                  name="weight.unit"
                  value={form.weight.unit}
                  onChange={handleChange}
                  className="input w-24"
                >
                  <option value="lbs">lbs</option>
                  <option value="kg">kg</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Identification */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Identification</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Registration Number
              </label>
              <input
                type="text"
                name="registrationNumber"
                value={form.registrationNumber}
                onChange={handleChange}
                className="input"
                placeholder="Breed registry number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Electronic ID (EID)
              </label>
              <input
                type="text"
                name="electronicId"
                value={form.electronicId}
                onChange={handleChange}
                className="input"
                placeholder="RFID tag number"
              />
            </div>
          </div>
        </div>

        {/* Acquisition */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Acquisition</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Acquisition Date
              </label>
              <input
                type="date"
                name="acquisitionDate"
                value={form.acquisitionDate}
                onChange={handleChange}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Acquisition Method
              </label>
              <select
                name="acquisition.method"
                value={form.acquisition.method}
                onChange={handleChange}
                className="input"
              >
                <option value="born">Born on farm</option>
                <option value="purchased">Purchased</option>
                <option value="transferred_in">Transferred in</option>
                <option value="gift">Gift</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <input
                type="text"
                name="acquisition.source"
                value={form.acquisition.source}
                onChange={handleChange}
                className="input"
                placeholder="Where acquired from"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost ($)</label>
              <input
                type="number"
                name="acquisition.cost"
                value={form.acquisition.cost}
                onChange={handleChange}
                className="input"
                placeholder="Purchase price"
                step="0.01"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>

          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={4}
            className="input"
            placeholder="Additional notes about this animal..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate('/app/animals')}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 btn-primary py-3"
          >
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Animal'}
          </button>
        </div>
      </form>
    </div>
  );
}
