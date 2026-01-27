import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { inventoryApi, contactsApi } from '../../../services/api';

export default function InventoryForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [vendors, setVendors] = useState([]);

  const [form, setForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    category: 'SUPPLIES',
    subcategory: '',
    unit: 'units',
    defaultUnitCost: '',
    reorderPoint: '',
    reorderQuantity: '',
    preferredVendor: '',
    notes: '',
  });

  useEffect(() => {
    fetchOptions();
    if (isEditing) {
      fetchItem();
    }
  }, [id]);

  const fetchOptions = async () => {
    try {
      const [categoriesRes, unitsRes, vendorsRes] = await Promise.all([
        inventoryApi.getCategories(),
        inventoryApi.getUnits(),
        contactsApi.list({ type: 'vendor', activeOnly: 'true' }),
      ]);
      setCategories(categoriesRes.data?.categories || categoriesRes.categories || []);
      setUnits(unitsRes.data?.units || unitsRes.units || []);
      // Sort vendors alphabetically
      const vendorContacts = vendorsRes.data?.contacts || [];
      setVendors(vendorContacts.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error('Error fetching options:', err);
    }
  };

  const fetchItem = async () => {
    try {
      setLoading(true);
      const response = await inventoryApi.get(id);
      const item = response.data?.item || response.item;

      setForm({
        name: item.name || '',
        sku: item.sku || '',
        barcode: item.barcode || '',
        category: item.category || 'SUPPLIES',
        subcategory: item.subcategory || '',
        unit: item.unit || 'units',
        // Map backend field names to form field names
        defaultUnitCost: item.defaultCostPerUnit || item.defaultUnitCost || '',
        reorderPoint: item.reorderPoint || '',
        reorderQuantity: item.reorderQty || item.reorderQuantity || '',
        preferredVendor: item.preferredVendor || '',
        notes: item.notes || '',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);

    try {
      // Map form fields to backend expected fields
      const data = {
        name: form.name,
        sku: form.sku || undefined,
        barcode: form.barcode || undefined,
        category: form.category,
        subcategory: form.subcategory || undefined,
        unit: form.unit,
        defaultCostPerUnit: form.defaultUnitCost ? parseFloat(form.defaultUnitCost) : 0,
        reorderPoint: form.reorderPoint ? parseInt(form.reorderPoint) : 0,
        reorderQty: form.reorderQuantity ? parseInt(form.reorderQuantity) : 0,
        preferredVendor: form.preferredVendor || undefined,
        notes: form.notes || undefined,
      };

      // Remove undefined values
      Object.keys(data).forEach((key) => {
        if (data[key] === undefined) delete data[key];
      });

      if (isEditing) {
        await inventoryApi.update(id, data);
      } else {
        await inventoryApi.create(data);
      }

      navigate('/app/inventory');
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
          <p className="mt-2 text-gray-500">Loading item...</p>
        </div>
      </div>
    );
  }

  // Group units by type
  const unitsByType = units.reduce((acc, unit) => {
    if (!acc[unit.type]) acc[unit.type] = [];
    acc[unit.type].push(unit);
    return acc;
  }, {});

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/app/inventory"
          className="text-gray-500 hover:text-gray-700 text-sm mb-2 inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Inventory
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Item' : 'Add Inventory Item'}
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

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="input"
                placeholder="e.g., Cattle Feed - 50lb Bag"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                <input
                  type="text"
                  name="sku"
                  value={form.sku}
                  onChange={handleChange}
                  className="input"
                  placeholder="Optional stock code"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
                <input
                  type="text"
                  name="barcode"
                  value={form.barcode}
                  onChange={handleChange}
                  className="input"
                  placeholder="UPC or EAN"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  required
                  className="input"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory</label>
                <input
                  type="text"
                  name="subcategory"
                  value={form.subcategory}
                  onChange={handleChange}
                  className="input"
                  placeholder="Optional subcategory"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Units & Pricing */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Units & Pricing</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit of Measure <span className="text-red-500">*</span>
              </label>
              <select
                name="unit"
                value={form.unit}
                onChange={handleChange}
                required
                className="input"
              >
                {Object.entries(unitsByType).map(([type, typeUnits]) => (
                  <optgroup key={type} label={type.charAt(0).toUpperCase() + type.slice(1)}>
                    {typeUnits.map((unit) => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Unit Cost ($)
              </label>
              <input
                type="number"
                name="defaultUnitCost"
                value={form.defaultUnitCost}
                onChange={handleChange}
                className="input"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Reorder Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Reorder Settings</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Point</label>
              <input
                type="number"
                name="reorderPoint"
                value={form.reorderPoint}
                onChange={handleChange}
                className="input"
                placeholder="Minimum quantity before reorder"
                min="0"
              />
              <p className="mt-1 text-xs text-gray-500">Alert when quantity falls below this level</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Quantity</label>
              <input
                type="number"
                name="reorderQuantity"
                value={form.reorderQuantity}
                onChange={handleChange}
                className="input"
                placeholder="How much to reorder"
                min="0"
              />
              <p className="mt-1 text-xs text-gray-500">Suggested quantity to order</p>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Vendor</label>
            <select
              name="preferredVendor"
              value={form.preferredVendor}
              onChange={handleChange}
              className="input"
            >
              <option value="">-- Select Vendor --</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">Will auto-fill in requisitions</p>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>

          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={3}
            className="input"
            placeholder="Additional notes about this item..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate('/app/inventory')}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button type="submit" disabled={saving} className="flex-1 btn-primary py-3">
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </form>
    </div>
  );
}
