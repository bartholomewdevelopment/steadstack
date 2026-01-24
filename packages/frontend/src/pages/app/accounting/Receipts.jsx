import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { accountingApi } from '../../../services/api';

export default function Receipts() {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [newReceipt, setNewReceipt] = useState({
    customerId: '',
    receiptType: 'payment',
    amount: '',
    paymentMethod: 'cash',
    referenceNumber: '',
    memo: '',
    receiptDate: new Date().toISOString().split('T')[0],
  });
  const [customers, setCustomers] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filterType]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (filterType) params.type = filterType;

      const [receiptsRes, customersRes] = await Promise.all([
        accountingApi.getReceipts(params),
        accountingApi.getCustomers(),
      ]);

      setReceipts(receiptsRes.receipts || []);
      setCustomers(customersRes.customers || []);
    } catch (err) {
      setError(err.message);
      setReceipts([]);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReceipt = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await accountingApi.createReceipt({
        ...newReceipt,
        amount: parseFloat(newReceipt.amount),
      });
      setShowReceiptModal(false);
      setNewReceipt({
        customerId: '',
        receiptType: 'payment',
        amount: '',
        paymentMethod: 'cash',
        referenceNumber: '',
        memo: '',
        receiptDate: new Date().toISOString().split('T')[0],
      });
      fetchData();
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

  const todayTotal = receipts
    .filter(r => new Date(r.receiptDate).toDateString() === new Date().toDateString())
    .reduce((sum, r) => sum + r.amount, 0);

  const weekTotal = receipts
    .filter(r => {
      const receiptDate = new Date(r.receiptDate);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return receiptDate >= weekAgo;
    })
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Receipts / Cashier</h1>
          <p className="text-gray-600">Record cash receipts and customer payments</p>
        </div>
        <button onClick={() => setShowReceiptModal(true)} className="btn-primary">
          + New Receipt
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Today</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(todayTotal)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">This Week</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(weekTotal)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Receipts</p>
          <p className="text-2xl font-bold text-gray-900">{receipts.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Pending Deposit</p>
          <p className="text-2xl font-bold text-yellow-600">
            {formatCurrency(receipts.filter(r => !r.depositId).reduce((sum, r) => sum + r.amount, 0))}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => setShowReceiptModal(true)}
          className="bg-white rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors text-left"
        >
          <div className="text-2xl mb-2">+</div>
          <h3 className="font-medium text-gray-900">Cash Sale</h3>
          <p className="text-sm text-gray-500">Record a cash sale</p>
        </button>
        <button
          onClick={() => {
            setNewReceipt({...newReceipt, paymentMethod: 'check'});
            setShowReceiptModal(true);
          }}
          className="bg-white rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors text-left"
        >
          <div className="text-2xl mb-2">-</div>
          <h3 className="font-medium text-gray-900">Check Received</h3>
          <p className="text-sm text-gray-500">Record a check payment</p>
        </button>
        <Link to="/app/accounting/deposits/new" className="bg-white rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors">
          <div className="text-2xl mb-2">$</div>
          <h3 className="font-medium text-gray-900">Make Deposit</h3>
          <p className="text-sm text-gray-500">Create bank deposit</p>
        </Link>
        <Link to="/app/accounting/reports/receipts" className="bg-white rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors">
          <div className="text-2xl mb-2">#</div>
          <h3 className="font-medium text-gray-900">Daily Report</h3>
          <p className="text-sm text-gray-500">Cash drawer report</p>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input py-2 min-w-[150px]"
            >
              <option value="">All Methods</option>
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="card">Card</option>
              <option value="ach">ACH</option>
            </select>
          </div>
        </div>
      </div>

      {/* Receipts List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading...</p>
        </div>
      ) : error ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <p className="text-yellow-700">Receipts module is being set up. Record your first receipt to get started.</p>
          <button onClick={() => setShowReceiptModal(true)} className="btn-primary mt-4">New Receipt</button>
        </div>
      ) : receipts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">$</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No receipts found</h3>
          <p className="text-gray-500 mb-4">Record your first cash receipt to get started</p>
          <button onClick={() => setShowReceiptModal(true)} className="btn-primary">+ New Receipt</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receipt #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deposited</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {receipts.map((receipt) => (
                <tr key={receipt.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono font-medium text-gray-900">{receipt.receiptNumber}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(receipt.receiptDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-gray-900">{receipt.customerName || 'Walk-in'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                      receipt.paymentMethod === 'cash' ? 'bg-green-100 text-green-700' :
                      receipt.paymentMethod === 'check' ? 'bg-blue-100 text-blue-700' :
                      receipt.paymentMethod === 'card' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {receipt.paymentMethod}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-green-600">{formatCurrency(receipt.amount)}</td>
                  <td className="px-6 py-4">
                    {receipt.depositId ? (
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-700">
                        Yes
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-700">
                        Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Receipt Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">New Receipt</h2>
            <form onSubmit={handleCreateReceipt} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                <select
                  value={newReceipt.customerId}
                  onChange={(e) => setNewReceipt({ ...newReceipt, customerId: e.target.value })}
                  className="input"
                >
                  <option value="">Walk-in Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newReceipt.amount}
                    onChange={(e) => setNewReceipt({ ...newReceipt, amount: e.target.value })}
                    className="input"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={newReceipt.receiptDate}
                    onChange={(e) => setNewReceipt({ ...newReceipt, receiptDate: e.target.value })}
                    className="input"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
                  <select
                    value={newReceipt.paymentMethod}
                    onChange={(e) => setNewReceipt({ ...newReceipt, paymentMethod: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                    <option value="card">Card</option>
                    <option value="ach">ACH</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference #</label>
                  <input
                    type="text"
                    value={newReceipt.referenceNumber}
                    onChange={(e) => setNewReceipt({ ...newReceipt, referenceNumber: e.target.value })}
                    className="input"
                    placeholder="Check # or Auth code"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Memo</label>
                <input
                  type="text"
                  value={newReceipt.memo}
                  onChange={(e) => setNewReceipt({ ...newReceipt, memo: e.target.value })}
                  className="input"
                  placeholder="Optional memo"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? 'Saving...' : 'Create Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
