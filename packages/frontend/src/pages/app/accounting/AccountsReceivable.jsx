import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { accountingApi } from '../../../services/api';
import { HelpTooltip } from '../../../components/ui/Tooltip';

const agingBuckets = [
  { key: 'current', label: 'Current', color: 'bg-green-100 text-green-700' },
  { key: 'days30', label: '1-30 Days', color: 'bg-yellow-100 text-yellow-700' },
  { key: 'days60', label: '31-60 Days', color: 'bg-orange-100 text-orange-700' },
  { key: 'days90', label: '61-90 Days', color: 'bg-red-100 text-red-700' },
  { key: 'over90', label: '90+ Days', color: 'bg-red-200 text-red-800' },
];

export default function AccountsReceivable() {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [aging, setAging] = useState({ current: 0, days30: 0, days60: 0, days90: 0, over90: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('open');
  const [filterCustomer, setFilterCustomer] = useState('');

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

      const [invoicesRes, customersRes, agingRes] = await Promise.all([
        accountingApi.getInvoices(params),
        accountingApi.getCustomers(),
        accountingApi.getARaging(),
      ]);

      setInvoices(invoicesRes.invoices || []);
      setCustomers(customersRes.customers || []);
      setAging(agingRes.aging || { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 });
    } catch (err) {
      setError(err.message);
      // Set mock data for development
      setInvoices([]);
      setCustomers([]);
      setAging({ current: 0, days30: 0, days60: 0, days90: 0, over90: 0 });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const totalAR = Object.values(aging).reduce((sum, val) => sum + val, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Accounts Receivable</h1>
            <HelpTooltip content="A/R tracks money customers owe you. Create invoices, track payments, and monitor aging to manage cash flow." position="right" />
          </div>
          <p className="text-gray-600">Track customer invoices and payments</p>
        </div>
        <div className="flex gap-3">
          <Link to="/app/accounting/customers/new" className="btn-secondary">
            + Add Customer
          </Link>
          <Link to="/app/accounting/invoices/new" className="btn-primary">
            + Create Invoice
          </Link>
        </div>
      </div>

      {/* Aging Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-900">Aging Summary</h2>
            <HelpTooltip content="Aging shows how long invoices have been outstanding. Older receivables are harder to collect - aim to keep most in 'Current'." position="right" />
          </div>
          <span className="text-2xl font-bold text-gray-900">{formatCurrency(totalAR)}</span>
        </div>
        <div className="grid grid-cols-5 gap-4">
          {agingBuckets.map((bucket) => (
            <div key={bucket.key} className="text-center">
              <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${bucket.color}`}>
                {bucket.label}
              </span>
              <p className="mt-2 text-xl font-semibold text-gray-900">{formatCurrency(aging[bucket.key])}</p>
              <p className="text-sm text-gray-500">
                {totalAR > 0 ? Math.round((aging[bucket.key] / totalAR) * 100) : 0}%
              </p>
            </div>
          ))}
        </div>
        {/* Visual bar */}
        <div className="mt-4 h-3 bg-gray-100 rounded-full overflow-hidden flex">
          {agingBuckets.map((bucket, idx) => {
            const percent = totalAR > 0 ? (aging[bucket.key] / totalAR) * 100 : 0;
            const colors = ['bg-green-400', 'bg-yellow-400', 'bg-orange-400', 'bg-red-400', 'bg-red-600'];
            return percent > 0 ? (
              <div key={bucket.key} className={`${colors[idx]} h-full`} style={{ width: `${percent}%` }} />
            ) : null;
          })}
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
              <option value="open">Open</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="">All</option>
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

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/app/accounting/invoices" className="bg-white rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors">
          <div className="text-2xl mb-2">$</div>
          <h3 className="font-medium text-gray-900">Invoices</h3>
          <p className="text-sm text-gray-500">View all invoices</p>
        </Link>
        <Link to="/app/accounting/payments/receive" className="bg-white rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors">
          <div className="text-2xl mb-2">+</div>
          <h3 className="font-medium text-gray-900">Receive Payment</h3>
          <p className="text-sm text-gray-500">Record customer payment</p>
        </Link>
        <Link to="/app/accounting/customers" className="bg-white rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors">
          <div className="text-2xl mb-2">@</div>
          <h3 className="font-medium text-gray-900">Customers</h3>
          <p className="text-sm text-gray-500">Manage customers</p>
        </Link>
        <Link to="/app/accounting/reports/ar-aging" className="bg-white rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors">
          <div className="text-2xl mb-2">#</div>
          <h3 className="font-medium text-gray-900">Aging Report</h3>
          <p className="text-sm text-gray-500">Detailed aging analysis</p>
        </Link>
      </div>

      {/* Invoices List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading...</p>
        </div>
      ) : error ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <p className="text-yellow-700">A/R module is being set up. Create customers and invoices to get started.</p>
          <div className="flex justify-center gap-3 mt-4">
            <Link to="/app/accounting/customers/new" className="btn-secondary">Add Customer</Link>
            <Link to="/app/accounting/invoices/new" className="btn-primary">Create Invoice</Link>
          </div>
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">$</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
          <p className="text-gray-500 mb-4">Create your first invoice to start tracking receivables</p>
          <Link to="/app/accounting/invoices/new" className="btn-primary">+ Create Invoice</Link>
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
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {invoice.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
