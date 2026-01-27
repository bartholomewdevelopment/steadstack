import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { purchasingApi, contactsApi } from '../../../services/api';

export default function VendorBillForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const receiptId = searchParams.get('receiptId');

  const [vendors, setVendors] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    vendorId: '',
    vendorInvoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    receiptId: receiptId || '',
    lineItems: [],
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (form.receiptId && receipts.length > 0) {
      loadReceiptLines(form.receiptId);
    }
  }, [form.receiptId, receipts]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [vendorsRes, receiptsRes] = await Promise.all([
        contactsApi.list({ type: 'vendor', activeOnly: 'true' }),
        purchasingApi.getReceipts({ status: 'POSTED' }), // Only posted receipts can be billed
      ]);
      // Map contacts to vendor format
      const vendorContacts = vendorsRes.data?.contacts || [];
      setVendors(vendorContacts.map(c => ({ id: c.id, name: c.name, email: c.email })));
      setReceipts(receiptsRes.data?.receipts || []);

      // If receiptId was passed, load that receipt's data
      if (receiptId) {
        const receipt = (receiptsRes.data?.receipts || []).find((r) => r.id === receiptId);
        if (receipt) {
          setForm((prev) => ({
            ...prev,
            vendorId: receipt.vendorId?.id || receipt.vendorId || '',
            receiptId: receiptId,
          }));
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadReceiptLines = (receiptIdToLoad) => {
    const receipt = receipts.find((r) => r.id === receiptIdToLoad);
    if (receipt) {
      setForm((prev) => ({
        ...prev,
        vendorId: receipt.vendorId?.id || receipt.vendorId || prev.vendorId,
        lineItems: receipt.lineItems?.map((line) => ({
          lineNumber: line.lineNumber,
          description: line.description || `Line ${line.lineNumber}`,
          qty: line.receivedQty,
          unitPrice: line.unitCost || 0,
          inventoryItemId: line.inventoryItemId,
        })) || [],
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLineChange = (index, field, value) => {
    setForm((prev) => {
      const newLines = [...prev.lineItems];
      newLines[index] = { ...newLines[index], [field]: value };
      return { ...prev, lineItems: newLines };
    });
  };

  const calculateTotal = () => {
    return form.lineItems.reduce((sum, line) => sum + (line.qty * line.unitPrice), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.vendorId) {
      setError('Please select a vendor');
      return;
    }
    if (!form.vendorInvoiceNumber) {
      setError('Vendor invoice number is required');
      return;
    }
    if (form.lineItems.length === 0) {
      setError('Please add at least one line item');
      return;
    }

    setSaving(true);
    try {
      const data = {
        vendorId: form.vendorId,
        vendorInvoiceNumber: form.vendorInvoiceNumber,
        invoiceDate: form.invoiceDate,
        dueDate: form.dueDate || undefined,
        receiptId: form.receiptId || undefined,
        lineItems: form.lineItems.map((line) => ({
          lineNumber: line.lineNumber,
          description: line.description,
          qty: parseFloat(line.qty),
          unitPrice: parseFloat(line.unitPrice),
          inventoryItemId: line.inventoryItemId,
        })),
        notes: form.notes || undefined,
      };

      const response = await purchasingApi.createBill(data);
      const billId = response.data?.bill?.id;

      if (billId) {
        navigate(`/app/purchasing/bills/${billId}`);
      } else {
        navigate('/app/purchasing/bills');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addLine = () => {
    setForm((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        {
          lineNumber: prev.lineItems.length + 1,
          description: '',
          qty: 1,
          unitPrice: 0,
        },
      ],
    }));
  };

  const removeLine = (index) => {
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index).map((line, i) => ({
        ...line,
        lineNumber: i + 1,
      })),
    }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

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
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/app/purchasing/bills"
          className="text-gray-500 hover:text-gray-700 text-sm mb-2 inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Bills
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Enter Vendor Bill</h1>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vendor & Invoice Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Information</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vendor <span className="text-red-500">*</span>
              </label>
              <select
                name="vendorId"
                value={form.vendorId}
                onChange={handleChange}
                required
                className="input"
              >
                <option value="">Select vendor...</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vendor Invoice # <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="vendorInvoiceNumber"
                value={form.vendorInvoiceNumber}
                onChange={handleChange}
                required
                className="input"
                placeholder="INV-12345"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="invoiceDate"
                value={form.invoiceDate}
                onChange={handleChange}
                required
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                name="dueDate"
                value={form.dueDate}
                onChange={handleChange}
                className="input"
              />
            </div>
          </div>

          {/* Link to Receipt */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Link to Receipt (Optional)
            </label>
            <select
              name="receiptId"
              value={form.receiptId}
              onChange={handleChange}
              className="input"
            >
              <option value="">No linked receipt - Manual entry</option>
              {receipts.map((receipt) => (
                <option key={receipt.id} value={receipt.id}>
                  {receipt.receiptNumber} - {receipt.vendorId?.name || 'Vendor'} ({receipt.lineItems?.length || 0} lines)
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Linking to a receipt will auto-fill line items
            </p>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Line Items</h2>
            <button
              type="button"
              onClick={addLine}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              + Add Line
            </button>
          </div>

          {form.lineItems.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500 mb-2">No line items</p>
              <button
                type="button"
                onClick={addLine}
                className="text-red-600 hover:text-red-700 font-medium"
              >
                Add your first line
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {form.lineItems.map((line, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    <span className="text-sm text-gray-400 font-medium mt-2">#{line.lineNumber}</span>
                    <div className="flex-1 grid md:grid-cols-4 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">Description</label>
                        <input
                          type="text"
                          value={line.description}
                          onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                          className="input py-2"
                          placeholder="Item description"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Qty</label>
                        <input
                          type="number"
                          value={line.qty}
                          onChange={(e) => handleLineChange(index, 'qty', e.target.value)}
                          className="input py-2"
                          min="0"
                          step="any"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Unit Price</label>
                        <input
                          type="number"
                          value={line.unitPrice}
                          onChange={(e) => handleLineChange(index, 'unitPrice', e.target.value)}
                          className="input py-2"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        {formatCurrency(line.qty * line.unitPrice)}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Total */}
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(calculateTotal())}</p>
                </div>
              </div>
            </div>
          )}
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
            placeholder="Additional notes..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate('/app/purchasing/bills')}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 btn-primary py-3"
          >
            {saving ? 'Saving...' : 'Create Bill'}
          </button>
        </div>
      </form>
    </div>
  );
}
