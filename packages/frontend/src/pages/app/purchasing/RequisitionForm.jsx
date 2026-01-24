import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useSite } from '../../../contexts/SiteContext';
import { purchasingApi, inventoryApi } from '../../../services/api';

export default function RequisitionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentSite } = useSite();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [vendors, setVendors] = useState([]);

  const [form, setForm] = useState({
    neededByDate: '',
    notes: '',
    lineItems: [{ itemId: '', description: '', qty: '', uom: 'units', estimatedUnitPrice: '', preferredVendorId: '' }],
  });

  useEffect(() => {
    fetchOptions();
    if (isEditing) {
      fetchRequisition();
    }
  }, [id]);

  const fetchOptions = async () => {
    try {
      const [itemsRes, vendorsRes] = await Promise.all([
        inventoryApi.list({ activeOnly: true }),
        purchasingApi.getVendors(),
      ]);
      setInventoryItems(itemsRes.data?.items || []);
      setVendors(vendorsRes.data?.vendors || []);
    } catch (err) {
      console.error('Error fetching options:', err);
    }
  };

  const fetchRequisition = async () => {
    try {
      setLoading(true);
      const response = await purchasingApi.getRequisition(id);
      const req = response.data?.requisition;
      if (req) {
        setForm({
          neededByDate: req.neededByDate ? new Date(req.neededByDate).toISOString().split('T')[0] : '',
          notes: req.notes || '',
          lineItems: req.lineItems.length > 0 ? req.lineItems : [{ itemId: '', description: '', qty: '', uom: 'units', estimatedUnitPrice: '', preferredVendorId: '' }],
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLineChange = (index, field, value) => {
    const newLines = [...form.lineItems];
    newLines[index] = { ...newLines[index], [field]: value };

    // Auto-fill description and unit when item is selected
    if (field === 'itemId' && value) {
      const item = inventoryItems.find(i => i.id === value);
      if (item) {
        newLines[index].description = item.name;
        newLines[index].uom = item.unit || 'units';
        if (item.defaultCostPerUnit) {
          newLines[index].estimatedUnitPrice = item.defaultCostPerUnit;
        }
        if (item.preferredVendorId) {
          newLines[index].preferredVendorId = item.preferredVendorId;
        }
      }
    }

    setForm({ ...form, lineItems: newLines });
  };

  const addLine = () => {
    setForm({
      ...form,
      lineItems: [...form.lineItems, { itemId: '', description: '', qty: '', uom: 'units', estimatedUnitPrice: '', preferredVendorId: '' }],
    });
  };

  const removeLine = (index) => {
    if (form.lineItems.length > 1) {
      setForm({
        ...form,
        lineItems: form.lineItems.filter((_, i) => i !== index),
      });
    }
  };

  const handleSubmit = async (e, submitAfterSave = false) => {
    e.preventDefault();
    setError(null);

    // Validate
    const validLines = form.lineItems.filter(line => line.itemId && line.qty > 0);
    if (validLines.length === 0) {
      setError('At least one line item with an item and quantity is required');
      return;
    }

    setSaving(true);

    try {
      const data = {
        siteId: currentSite.id,
        neededByDate: form.neededByDate || null,
        notes: form.notes || null,
        lineItems: validLines.map(line => ({
          itemId: line.itemId,
          description: line.description,
          qty: parseFloat(line.qty),
          uom: line.uom,
          estimatedUnitPrice: line.estimatedUnitPrice ? parseFloat(line.estimatedUnitPrice) : null,
          preferredVendorId: line.preferredVendorId || null,
        })),
      };

      let reqId = id;
      if (isEditing) {
        // Update not implemented in MVP - would need updateRequisition API
        setError('Editing requisitions is not yet supported');
        return;
      } else {
        const response = await purchasingApi.createRequisition(data);
        reqId = response.data?.requisition?.id;
      }

      if (submitAfterSave && reqId) {
        await purchasingApi.submitRequisition(reqId);
      }

      navigate('/app/purchasing/requisitions');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!currentSite?.id) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Select a site to create a requisition.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/app/purchasing/requisitions"
          className="text-gray-500 hover:text-gray-700 text-sm mb-2 inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Requisitions
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Requisition' : 'New Purchase Requisition'}
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Request Details</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Needed By Date
              </label>
              <input
                type="date"
                value={form.neededByDate}
                onChange={(e) => setForm({ ...form, neededByDate: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="input"
                placeholder="Optional notes"
              />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Items Requested</h2>
            <button type="button" onClick={addLine} className="text-sm text-red-600 hover:text-red-700 font-medium">
              + Add Item
            </button>
          </div>

          <div className="space-y-4">
            {form.lineItems.map((line, index) => (
              <div key={index} className="grid grid-cols-12 gap-3 items-start p-3 bg-gray-50 rounded-lg">
                <div className="col-span-4">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Item</label>
                  <select
                    value={line.itemId}
                    onChange={(e) => handleLineChange(index, 'itemId', e.target.value)}
                    className="input py-2 text-sm"
                  >
                    <option value="">Select item...</option>
                    {inventoryItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Qty</label>
                  <input
                    type="number"
                    value={line.qty}
                    onChange={(e) => handleLineChange(index, 'qty', e.target.value)}
                    className="input py-2 text-sm"
                    placeholder="0"
                    min="0"
                    step="any"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Unit</label>
                  <input
                    type="text"
                    value={line.uom}
                    onChange={(e) => handleLineChange(index, 'uom', e.target.value)}
                    className="input py-2 text-sm"
                    placeholder="units"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Vendor (optional)</label>
                  <select
                    value={line.preferredVendorId}
                    onChange={(e) => handleLineChange(index, 'preferredVendorId', e.target.value)}
                    className="input py-2 text-sm"
                  >
                    <option value="">Any vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-1 flex items-end">
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    disabled={form.lineItems.length === 1}
                    className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate('/app/purchasing/requisitions')}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
          >
            {saving ? 'Saving...' : 'Save as Draft'}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={(e) => handleSubmit(e, true)}
            className="flex-1 btn-primary py-3"
          >
            {saving ? 'Submitting...' : 'Save & Submit'}
          </button>
        </div>
      </form>
    </div>
  );
}
