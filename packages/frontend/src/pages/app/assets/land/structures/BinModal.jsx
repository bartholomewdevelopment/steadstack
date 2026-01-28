import { useState, useEffect } from 'react';
import { binsApi } from '../../../../../services/api';

const BIN_TYPES = [
  { value: 'SHELF', label: 'Shelf' },
  { value: 'DRAWER', label: 'Drawer' },
  { value: 'TOTE', label: 'Tote' },
  { value: 'PALLET', label: 'Pallet' },
  { value: 'RACK', label: 'Rack' },
  { value: 'HOOK', label: 'Hook' },
  { value: 'FLOOR', label: 'Floor' },
  { value: 'CABINET', label: 'Cabinet' },
  { value: 'TOOLBOX', label: 'Toolbox' },
  { value: 'MOBILE', label: 'Mobile' },
  { value: 'OTHER', label: 'Other' },
];

export default function BinModal({ isOpen, onClose, onSave, structureId, areas = [], bin }) {
  const isEditing = Boolean(bin);

  const [form, setForm] = useState({
    name: '',
    code: '',
    type: '',
    areaId: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [codeAvailable, setCodeAvailable] = useState(null);
  const [checkingCode, setCheckingCode] = useState(false);

  useEffect(() => {
    if (bin) {
      setForm({
        name: bin.name || '',
        code: bin.code || '',
        type: bin.type || '',
        areaId: bin.areaId || '',
        notes: bin.notes || '',
      });
      setCodeAvailable(null);
    } else {
      setForm({
        name: '',
        code: '',
        type: '',
        areaId: '',
        notes: '',
      });
      setCodeAvailable(null);
    }
    setError('');
  }, [bin, isOpen]);

  // Debounced code availability check
  useEffect(() => {
    if (!form.code || form.code.length < 2) {
      setCodeAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setCheckingCode(true);
        const res = await binsApi.checkCode({
          code: form.code,
          excludeBinId: bin?.id || undefined,
        });
        setCodeAvailable(res.data?.isAvailable);
      } catch (err) {
        console.error('Error checking code:', err);
        setCodeAvailable(null);
      } finally {
        setCheckingCode(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [form.code, bin?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }

    if (!form.code.trim() || form.code.trim().length < 2) {
      setError('Code is required (at least 2 characters)');
      return;
    }

    if (codeAvailable === false) {
      setError('This code is already in use');
      return;
    }

    try {
      setSaving(true);

      const data = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        type: form.type || null,
        areaId: form.areaId || null,
        notes: form.notes.trim() || null,
      };

      if (isEditing) {
        await binsApi.update(bin.id, data);
      } else {
        await binsApi.create(structureId, data);
      }

      onSave();
      onClose();
    } catch (err) {
      console.error('Error saving bin:', err);
      setError(err.response?.data?.message || err.message || 'Failed to save bin');
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
            {isEditing ? 'Edit Bin' : 'Add Bin'}
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Top Shelf, Drawer 1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                maxLength={100}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., BARN-A-01"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 uppercase ${
                    codeAvailable === false
                      ? 'border-red-300 bg-red-50'
                      : codeAvailable === true
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-300'
                  }`}
                  maxLength={30}
                />
                {checkingCode && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-500 border-t-transparent"></div>
                  </div>
                )}
                {!checkingCode && codeAvailable === true && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {!checkingCode && codeAvailable === false && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">Unique, printable code (e.g., BARN-A-01)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Select type...</option>
                {BIN_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Area
              </label>
              <select
                value={form.areaId}
                onChange={(e) => setForm({ ...form, areaId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Structure-level (no area)</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">Optional: group bin under an area</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional notes about this bin..."
              rows={2}
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
              disabled={saving || codeAvailable === false}
              className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Bin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
