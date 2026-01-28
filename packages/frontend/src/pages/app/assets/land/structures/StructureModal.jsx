import { useState, useEffect } from 'react';
import { structuresApi } from '../../../../../services/api';

const structureTypes = [
  { value: 'BARN', label: 'Barn' },
  { value: 'SHOP', label: 'Shop' },
  { value: 'SHED', label: 'Shed' },
  { value: 'GARAGE', label: 'Garage' },
  { value: 'GREENHOUSE', label: 'Greenhouse' },
  { value: 'COOP', label: 'Coop' },
  { value: 'HOUSE', label: 'House' },
  { value: 'CONTAINER', label: 'Container' },
  { value: 'OTHER', label: 'Other' },
];

export default function StructureModal({ isOpen, onClose, onSave, landTractId, structure }) {
  const isEditing = Boolean(structure);

  const [form, setForm] = useState({
    name: '',
    type: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (structure) {
      setForm({
        name: structure.name || '',
        type: structure.type || '',
        description: structure.description || '',
      });
    } else {
      setForm({
        name: '',
        type: '',
        description: '',
      });
    }
    setError('');
  }, [structure, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }

    try {
      setSaving(true);

      const data = {
        name: form.name.trim(),
        type: form.type || null,
        description: form.description.trim() || null,
      };

      if (isEditing) {
        await structuresApi.update(structure.id, data);
      } else {
        data.landTractId = landTractId;
        await structuresApi.create(data);
      }

      onSave();
      onClose();
    } catch (err) {
      console.error('Error saving structure:', err);
      setError(err.message || 'Failed to save structure');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Structure' : 'Add Structure'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Main Barn, Equipment Shed"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
              maxLength={100}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Select type (optional)</option>
              {structureTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional description..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
              maxLength={500}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Structure'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
