import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSite } from '../../../contexts/SiteContext';
import { purchasingApi } from '../../../services/api';
import PurchasingNav from '../../../components/purchasing/PurchasingNav';

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  PARTIALLY_PAID: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-green-100 text-green-700',
  VOID: 'bg-red-100 text-red-700',
};

const statusLabels = {
  DRAFT: 'Draft',
  APPROVED: 'Approved',
  PARTIALLY_PAID: 'Partial Payment',
  PAID: 'Paid',
  VOID: 'Void',
};

const matchStatusColors = {
  UNMATCHED: 'text-gray-500',
  PARTIAL: 'text-yellow-600',
  MATCHED: 'text-green-600',
  DISCREPANCY: 'text-red-600',
};

export default function VendorBillsList() {
  const { currentSite } = useSite();
  const [searchParams, setSearchParams] = useSearchParams();
  const [bills, setBills] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const currentStatus = searchParams.get('status') || '';
  const currentVendor = searchParams.get('vendorId') || '';
  const unpaidOnly = searchParams.get('unpaidOnly') === 'true';

  useEffect(() => {
    if (currentSite?.id) {
      fetchData();
    }
  }, [currentSite, currentStatus, currentVendor, unpaidOnly]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = { siteId: currentSite.id };
      if (currentStatus) params.status = currentStatus;
      if (currentVendor) params.vendorId = currentVendor;
      if (unpaidOnly) params.unpaidOnly = true;

      const [billsRes, vendorsRes] = await Promise.all([
        purchasingApi.getBills(params),
        purchasingApi.getVendors(),
      ]);

      setBills(billsRes.data?.bills || []);
      setVendors(vendorsRes.data?.vendors || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setSearchParams(params);
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const getVendorName = (vendorId) => {
    const vendor = vendors.find(v => v.id === vendorId);
    return vendor?.name || 'Unknown Vendor';
  };

  const isOverdue = (bill) => {
    if (!bill.dueDate || bill.status === 'PAID' || bill.status === 'VOID') return false;
    const dueDate = bill.dueDate.toDate ? bill.dueDate.toDate() : new Date(bill.dueDate);
    return dueDate < new Date();
  };

  if (!currentSite?.id) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Select a site to view vendor bills.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PurchasingNav />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Bills</h1>
          <p className="text-gray-600">Manage accounts payable</p>
        </div>
        <div className="flex gap-3">
          <Link to="/app/purchasing/ap-aging" className="btn-secondary">
            AP Aging Report
          </Link>
          <Link to="/app/purchasing/bills/new" className="btn-primary">
            + New Bill
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Total Bills</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{bills.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Unpaid</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {bills.filter(b => b.status === 'APPROVED' || b.status === 'PARTIALLY_PAID').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Total Outstanding</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(bills.reduce((sum, b) => sum + (b.totals?.amountDue || 0), 0))}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-medium text-red-500">Overdue</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {bills.filter(isOverdue).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={currentStatus}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="input py-2 min-w-[160px]"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="APPROVED">Approved</option>
              <option value="PARTIALLY_PAID">Partial Payment</option>
              <option value="PAID">Paid</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
            <select
              value={currentVendor}
              onChange={(e) => handleFilterChange('vendorId', e.target.value)}
              className="input py-2 min-w-[180px]"
            >
              <option value="">All Vendors</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={unpaidOnly}
                onChange={(e) => handleFilterChange('unpaidOnly', e.target.checked ? 'true' : '')}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm text-gray-700">Unpaid only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Bills List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading bills...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600">{error}</p>
          <button onClick={fetchData} className="mt-2 text-red-700 underline">
            Try again
          </button>
        </div>
      ) : bills.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">📄</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No bills found</h3>
          <p className="text-gray-500 mb-4">
            {currentStatus || currentVendor ? 'Try adjusting your filters' : 'Enter your first vendor bill'}
          </p>
          <Link to="/app/purchasing/bills/new" className="btn-primary">
            + New Bill
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bill #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount Due
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Match
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {bills.map((bill) => (
                  <tr key={bill.id} className={`hover:bg-gray-50 ${isOverdue(bill) ? 'bg-red-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{bill.billNumber}</p>
                        <p className="text-xs text-gray-500">{bill.internalNumber}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {getVendorName(bill.vendorId)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[bill.status]}`}>
                        {statusLabels[bill.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {formatCurrency(bill.totals?.total)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {formatCurrency(bill.totals?.amountDue)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm ${isOverdue(bill) ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        {formatDate(bill.dueDate)}
                        {isOverdue(bill) && <span className="ml-1">(Overdue)</span>}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium ${matchStatusColors[bill.match?.matchStatus] || 'text-gray-500'}`}>
                        {bill.match?.matchStatus || 'UNMATCHED'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Link
                        to={`/app/purchasing/bills/${bill.id}`}
                        className="text-red-600 hover:text-red-700 font-medium text-sm"
                      >
                        View
                      </Link>
                      {(bill.status === 'APPROVED' || bill.status === 'PARTIALLY_PAID') && (
                        <Link
                          to={`/app/purchasing/payments/new?billId=${bill.id}`}
                          className="text-green-600 hover:text-green-700 font-medium text-sm"
                        >
                          Pay
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
