import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { accountingApi } from '../../../services/api';

export default function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    customerId: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [{ description: '', quantity: 1, unitPrice: '' }],
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filterStatus, filterCustomer]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterCustomer) params.customerId = filterCustomer;

      const [invoicesRes, customersRes] = await Promise.all([
        accountingApi.getInvoices(params),
        accountingApi.getCustomers(),
      ]);

      setInvoices(invoicesRes.invoices || []);
      setCustomers(customersRes.customers || []);
    } catch (err) {
      setError(err.message);
      setInvoices([]);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const invoiceData = {
        ...newInvoice,
        items: newInvoice.items.map(item => ({
          ...item,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
        })),
      };
      const result = await accountingApi.createInvoice(invoiceData);
      setShowCreateModal(false);
      navigate(`/app/accounting/invoices/${result.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addLineItem = () => {
    setNewInvoice({
      ...newInvoice,
      items: [...newInvoice.items, { description: '', quantity: 1, unitPrice: '' }],
    });
  };

  const updateLineItem = (index, field, value) => {
    const items = [...newInvoice.items];
    items[index][field] = value;
    setNewInvoice({ ...newInvoice, items });
  };

  const removeLineItem = (index) => {
    if (newInvoice.items.length > 1) {
      const items = newInvoice.items.filter((_, i) => i !== index);
      setNewInvoice({ ...newInvoice, items });
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const calculateTotal = () => {
    return newInvoice.items.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
    }, 0);
  };

  // Stats
  const openTotal = invoices.filter(i => i.status === 'open').reduce((sum, i) => sum + i.balanceDue, 0);
  const overdueTotal = invoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + i.balanceDue, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600">Create and manage customer invoices</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          + Create Invoice
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Invoices</p>
          <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Open</p>
          <p className="text-2xl font-bold text-yellow-600">{formatCurrency(openTotal)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Overdue</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(overdueTotal)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Paid This Month</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(
              invoices
                .filter(i => i.status === 'paid' && new Date(i.paidDate).getMonth() === new Date().getMonth())
                .reduce((sum, i) => sum + i.totalAmount, 0)
            )}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input py-2 min-w-[140px]"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="open">Open</option>
              <option value="overdue">Overdue</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <select
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              className="input py-2 min-w-[180px]"
            >
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading...</p>
        </div>
      ) : error ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <p className="text-yellow-700">Invoice module is being set up. Create your first invoice to get started.</p>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary mt-4">Create Invoice</button>
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">$</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
          <p className="text-gray-500 mb-4">Create your first invoice to get started</p>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">+ Create Invoice</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link to={`/app/accounting/invoices/${invoice.id}`} className="text-primary-600 hover:text-primary-700 font-medium">
                      {invoice.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-900">{invoice.customerName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(invoice.invoiceDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">{formatCurrency(invoice.totalAmount)}</td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">{formatCurrency(invoice.balanceDue)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                      invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                      invoice.status === 'overdue' ? 'bg-red-100 text-red-700' :
                      invoice.status === 'open' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link to={`/app/accounting/invoices/${invoice.id}`} className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Invoice</h2>
            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                  <select
                    value={newInvoice.customerId}
                    onChange={(e) => setNewInvoice({ ...newInvoice, customerId: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="">Select customer...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date *</label>
                  <input
                    type="date"
                    value={newInvoice.invoiceDate}
                    onChange={(e) => setNewInvoice({ ...newInvoice, invoiceDate: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
                  <input
                    type="date"
                    value={newInvoice.dueDate}
                    onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                    className="input"
                    required
                  />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Line Items</label>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 w-24">Qty</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 w-32">Unit Price</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 w-32">Total</th>
                        <th className="px-4 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {newInvoice.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                              className="input py-1"
                              placeholder="Description"
                              required
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              step="1"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                              className="input py-1 text-center"
                              required
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => updateLineItem(index, 'unitPrice', e.target.value)}
                              className="input py-1 text-right"
                              placeholder="0.00"
                              required
                            />
                          </td>
                          <td className="px-4 py-2 text-right font-medium text-gray-900">
                            {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0))}
                          </td>
                          <td className="px-4 py-2">
                            {newInvoice.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeLineItem(index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                X
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="mt-2 text-sm text-primary-600 hover:text-primary-700"
                >
                  + Add Line Item
                </button>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center py-3 border-t border-gray-200">
                <span className="font-medium text-gray-700">Total:</span>
                <span className="text-xl font-bold text-gray-900">{formatCurrency(calculateTotal())}</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={newInvoice.notes}
                  onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
                  className="input"
                  rows={2}
                  placeholder="Optional notes..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? 'Creating...' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
