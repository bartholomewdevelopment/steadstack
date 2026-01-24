import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { purchasingApi } from '../../../services/api';
import PurchasingNav from '../../../components/purchasing/PurchasingNav';

const paymentMethods = [
  { value: 'CHECK', label: 'Check' },
  { value: 'ACH', label: 'ACH Transfer' },
  { value: 'WIRE', label: 'Wire Transfer' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'CASH', label: 'Cash' },
];

export default function PaymentForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const billIdParam = searchParams.get('billId');

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    billId: billIdParam || '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'CHECK',
    amount: '',
    reference: '',
    notes: '',
  });

  const [selectedBill, setSelectedBill] = useState(null);

  useEffect(() => {
    fetchBills();
  }, []);

  useEffect(() => {
    if (form.billId && bills.length > 0) {
      const bill = bills.find((b) => b.id === form.billId);
      setSelectedBill(bill || null);
      if (bill && !form.amount) {
        // Auto-fill with balance due
        const total = (bill.lineItems || []).reduce((sum, l) => sum + (l.qty * l.unitPrice), 0);
        const paid = bill.paidAmount || 0;
        setForm((prev) => ({ ...prev, amount: (total - paid).toFixed(2) }));
      }
    }
  }, [form.billId, bills]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      // Get bills that can be paid (approved or partially paid)
      const response = await purchasingApi.getBills({ status: 'APPROVED,PARTIALLY_PAID' });
      setBills(response.data?.bills || []);

      // If billId was passed, select it
      if (billIdParam) {
        const bill = (response.data?.bills || []).find((b) => b.id === billIdParam);
        if (bill) {
          setSelectedBill(bill);
          const total = (bill.lineItems || []).reduce((sum, l) => sum + (l.qty * l.unitPrice), 0);
          const paid = bill.paidAmount || 0;
          setForm((prev) => ({
            ...prev,
            billId: billIdParam,
            amount: (total - paid).toFixed(2),
          }));
        }
      }
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

    if (!form.billId) {
      setError('Please select a bill to pay');
      return;
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setError('Please enter a valid payment amount');
      return;
    }

    setSaving(true);
    try {
      await purchasingApi.createPayment({
        billId: form.billId,
        paymentDate: form.paymentDate,
        paymentMethod: form.paymentMethod,
        amount: parseFloat(form.amount),
        reference: form.reference || undefined,
        notes: form.notes || undefined,
      });

      // Go back to the bill detail page
      navigate(`/app/purchasing/bills/${form.billId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const formatDate = (dateVal) => {
    if (!dateVal) return '-';
    let date;
    if (dateVal.toDate) {
      date = dateVal.toDate();
    } else if (dateVal._seconds) {
      date = new Date(dateVal._seconds * 1000);
    } else {
      date = new Date(dateVal);
    }
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getBillBalance = (bill) => {
    const total = (bill.lineItems || []).reduce((sum, l) => sum + (l.qty * l.unitPrice), 0);
    const paid = bill.paidAmount || 0;
    return total - paid;
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
    <div className="max-w-2xl mx-auto">
      <PurchasingNav />
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Record Payment</h1>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Bill Selection */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Bill</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bill to Pay <span className="text-red-500">*</span>
            </label>
            <select
              name="billId"
              value={form.billId}
              onChange={handleChange}
              required
              className="input"
            >
              <option value="">Select a bill...</option>
              {bills.map((bill) => (
                <option key={bill.id} value={bill.id}>
                  {bill.billNumber} - {bill.vendorId?.name || 'Vendor'} - Balance: {formatCurrency(getBillBalance(bill))}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Bill Summary */}
          {selectedBill && (
            <div className="mt-4 bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Vendor</p>
                  <p className="font-medium text-gray-900">{selectedBill.vendorId?.name || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Vendor Invoice #</p>
                  <p className="font-medium text-gray-900">{selectedBill.vendorInvoiceNumber}</p>
                </div>
                <div>
                  <p className="text-gray-500">Due Date</p>
                  <p className="font-medium text-gray-900">{formatDate(selectedBill.dueDate)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Balance Due</p>
                  <p className="font-bold text-red-600">{formatCurrency(getBillBalance(selectedBill))}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Payment Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="paymentDate"
                value={form.paymentDate}
                onChange={handleChange}
                required
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                name="paymentMethod"
                value={form.paymentMethod}
                onChange={handleChange}
                required
                className="input"
              >
                {paymentMethods.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  name="amount"
                  value={form.amount}
                  onChange={handleChange}
                  required
                  className="input pl-7"
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  max={selectedBill ? getBillBalance(selectedBill) : undefined}
                />
              </div>
              {selectedBill && parseFloat(form.amount) > getBillBalance(selectedBill) && (
                <p className="mt-1 text-xs text-red-600">
                  Amount exceeds balance due of {formatCurrency(getBillBalance(selectedBill))}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference / Check #
              </label>
              <input
                type="text"
                name="reference"
                value={form.reference}
                onChange={handleChange}
                className="input"
                placeholder="Check number or reference"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={2}
              className="input"
              placeholder="Optional payment notes..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate(form.billId ? `/app/purchasing/bills/${form.billId}` : '/app/purchasing/bills')}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !form.billId || !form.amount}
            className="flex-1 btn-primary py-3"
          >
            {saving ? 'Recording...' : `Record Payment of ${formatCurrency(form.amount || 0)}`}
          </button>
        </div>
      </form>
    </div>
  );
}
