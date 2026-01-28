import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { accountingApi } from '../../../services/api';
import { HelpTooltip } from '../../../components/ui/Tooltip';
import AccountingNav from '../../../components/accounting/AccountingNav';

const agingBuckets = [
  { key: 'current', label: 'Current', color: 'bg-green-100 text-green-700' },
  { key: 'days30', label: '1-30 Days', color: 'bg-yellow-100 text-yellow-700' },
  { key: 'days60', label: '31-60 Days', color: 'bg-orange-100 text-orange-700' },
  { key: 'days90', label: '61-90 Days', color: 'bg-red-100 text-red-700' },
  { key: 'over90', label: '90+ Days', color: 'bg-red-200 text-red-800' },
];

export default function AccountsPayable() {
  const [bills, setBills] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [aging, setAging] = useState({ current: 0, days30: 0, days60: 0, days90: 0, over90: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('open');
  const [filterVendor, setFilterVendor] = useState('');

  useEffect(() => {
    fetchData();
  }, [filterStatus, filterVendor]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterVendor) params.vendorId = filterVendor;

      const [billsRes, vendorsRes, agingRes] = await Promise.all([
        accountingApi.getBills(params),
        accountingApi.getVendors(),
        accountingApi.getAPaging(),
      ]);

      setBills(billsRes.bills || []);
      setVendors(vendorsRes.vendors || []);
      setAging(agingRes.aging || { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 });
    } catch (err) {
      setError(err.message);
      setBills([]);
      setVendors([]);
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

  const totalAP = Object.values(aging).reduce((sum, val) => sum + val, 0);

  return (
    <div>
      <AccountingNav />
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Accounts Payable</h1>
            <HelpTooltip content="A/P tracks money you owe vendors. Enter bills, schedule payments, and avoid late fees by monitoring due dates." position="right" />
          </div>
          <p className="text-gray-600">Track vendor bills and payments</p>
        </div>
        <div className="flex gap-3">
          <Link to="/app/accounting/vendors/new" className="btn-secondary">
            + Add Vendor
          </Link>
          <Link to="/app/accounting/bills/new" className="btn-primary">
            + Enter Bill
          </Link>
        </div>
      </div>

      {/* Aging Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-900">Aging Summary</h2>
            <HelpTooltip content="Aging shows how long bills have been outstanding. Pay attention to bills approaching due dates to avoid late fees." position="right" />
          </div>
          <span className="text-2xl font-bold text-red-600">{formatCurrency(totalAP)}</span>
        </div>
        <div className="grid grid-cols-5 gap-4">
          {agingBuckets.map((bucket) => (
            <div key={bucket.key} className="text-center">
              <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${bucket.color}`}>
                {bucket.label}
              </span>
              <p className="mt-2 text-xl font-semibold text-gray-900">{formatCurrency(aging[bucket.key])}</p>
              <p className="text-sm text-gray-500">
                {totalAP > 0 ? Math.round((aging[bucket.key] / totalAP) * 100) : 0}%
              </p>
            </div>
          ))}
        </div>
        {/* Visual bar */}
        <div className="mt-4 h-3 bg-gray-100 rounded-full overflow-hidden flex">
          {agingBuckets.map((bucket, idx) => {
            const percent = totalAP > 0 ? (aging[bucket.key] / totalAP) * 100 : 0;
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
            <select
              value={filterVendor}
              onChange={(e) => setFilterVendor(e.target.value)}
              className="input py-2 min-w-[180px]"
            >
              <option value="">All Vendors</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/app/accounting/bills" className="bg-white rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors">
          <div className="text-2xl mb-2">$</div>
          <h3 className="font-medium text-gray-900">Bills</h3>
          <p className="text-sm text-gray-500">View all bills</p>
        </Link>
        <Link to="/app/accounting/checks/new" className="bg-white rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors">
          <div className="text-2xl mb-2">-</div>
          <h3 className="font-medium text-gray-900">Pay Bills</h3>
          <p className="text-sm text-gray-500">Write checks</p>
        </Link>
        <Link to="/app/accounting/vendors" className="bg-white rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors">
          <div className="text-2xl mb-2">@</div>
          <h3 className="font-medium text-gray-900">Vendors</h3>
          <p className="text-sm text-gray-500">Manage vendors</p>
        </Link>
        <Link to="/app/accounting/reports/ap-aging" className="bg-white rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors">
          <div className="text-2xl mb-2">#</div>
          <h3 className="font-medium text-gray-900">Aging Report</h3>
          <p className="text-sm text-gray-500">Detailed aging analysis</p>
        </Link>
      </div>

      {/* Bills List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading...</p>
        </div>
      ) : error ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <p className="text-yellow-700">A/P module is being set up. Add vendors and enter bills to get started.</p>
          <div className="flex justify-center gap-3 mt-4">
            <Link to="/app/accounting/vendors/new" className="btn-secondary">Add Vendor</Link>
            <Link to="/app/accounting/bills/new" className="btn-primary">Enter Bill</Link>
          </div>
        </div>
      ) : bills.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">$</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No bills found</h3>
          <p className="text-gray-500 mb-4">Enter your first bill to start tracking payables</p>
          <Link to="/app/accounting/bills/new" className="btn-primary">+ Enter Bill</Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bill #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {bills.map((bill) => (
                <tr key={bill.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link to={`/app/accounting/bills/${bill.id}`} className="text-primary-600 hover:text-primary-700 font-medium">
                      {bill.billNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-900">{bill.vendorName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(bill.billDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(bill.dueDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">{formatCurrency(bill.totalAmount)}</td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">{formatCurrency(bill.balanceDue)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                      bill.status === 'paid' ? 'bg-green-100 text-green-700' :
                      bill.status === 'overdue' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {bill.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}
