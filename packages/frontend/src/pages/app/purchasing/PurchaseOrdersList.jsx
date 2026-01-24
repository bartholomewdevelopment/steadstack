import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSite } from '../../../contexts/SiteContext';
import { purchasingApi } from '../../../services/api';
import PurchasingNav from '../../../components/purchasing/PurchasingNav';

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-700',
  OPEN: 'bg-cyan-100 text-cyan-700',
  PARTIALLY_RECEIVED: 'bg-yellow-100 text-yellow-700',
  RECEIVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-purple-100 text-purple-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const statusLabels = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  OPEN: 'Open',
  PARTIALLY_RECEIVED: 'Partial Receipt',
  RECEIVED: 'Received',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

export default function PurchaseOrdersList() {
  const { currentSite } = useSite();
  const [searchParams, setSearchParams] = useSearchParams();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const currentStatus = searchParams.get('status') || '';
  const currentVendor = searchParams.get('vendorId') || '';

  useEffect(() => {
    if (currentSite?.id) {
      fetchData();
    }
  }, [currentSite, currentStatus, currentVendor]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = { siteId: currentSite.id };
      if (currentStatus) params.status = currentStatus;
      if (currentVendor) params.vendorId = currentVendor;

      const [posRes, vendorsRes] = await Promise.all([
        purchasingApi.getPurchaseOrders(params),
        purchasingApi.getVendors(),
      ]);

      setPurchaseOrders(posRes.data?.purchaseOrders || []);
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

  if (!currentSite?.id) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Select a site to view purchase orders.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PurchasingNav />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-600">Manage vendor purchase orders</p>
        </div>
        <Link to="/app/purchasing/purchase-orders/new" className="btn-primary">
          + New PO
        </Link>
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
              <option value="SENT">Sent</option>
              <option value="OPEN">Open</option>
              <option value="PARTIALLY_RECEIVED">Partial Receipt</option>
              <option value="RECEIVED">Received</option>
              <option value="CLOSED">Closed</option>
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
        </div>
      </div>

      {/* Purchase Orders List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading purchase orders...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600">{error}</p>
          <button onClick={fetchData} className="mt-2 text-red-700 underline">
            Try again
          </button>
        </div>
      ) : purchaseOrders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">📦</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No purchase orders found</h3>
          <p className="text-gray-500 mb-4">
            {currentStatus || currentVendor ? 'Try adjusting your filters' : 'Create your first purchase order'}
          </p>
          <Link to="/app/purchasing/purchase-orders/new" className="btn-primary">
            + New PO
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PO #
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
                    Order Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expected
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {purchaseOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{po.poNumber}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {getVendorName(po.vendorId)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[po.status]}`}>
                        {statusLabels[po.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {formatCurrency(po.totals?.total)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(po.orderDate)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(po.expectedDate)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/app/purchasing/purchase-orders/${po.id}`}
                        className="text-red-600 hover:text-red-700 font-medium text-sm"
                      >
                        View
                      </Link>
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
