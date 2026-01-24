import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSite } from '../../../contexts/SiteContext';
import { purchasingApi } from '../../../services/api';
import PurchasingNav from '../../../components/purchasing/PurchasingNav';

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  CONVERTED: 'bg-blue-100 text-blue-700',
};

const statusLabels = {
  DRAFT: 'Draft',
  SUBMITTED: 'Pending Approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CONVERTED: 'Converted to PO',
};

export default function RequisitionsList() {
  const { currentSite } = useSite();
  const [searchParams, setSearchParams] = useSearchParams();
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const currentStatus = searchParams.get('status') || '';

  useEffect(() => {
    if (currentSite?.id) {
      fetchRequisitions();
    }
  }, [currentSite, currentStatus]);

  const fetchRequisitions = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = { siteId: currentSite.id };
      if (currentStatus) params.status = currentStatus;

      const response = await purchasingApi.getRequisitions(params);
      setRequisitions(response.data?.requisitions || []);
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

  if (!currentSite?.id) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Select a site to view requisitions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PurchasingNav />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Requisitions</h1>
          <p className="text-gray-600">Request items for purchase</p>
        </div>
        <Link to="/app/purchasing/requisitions/new" className="btn-primary">
          + New Requisition
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
              <option value="SUBMITTED">Pending Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CONVERTED">Converted</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requisitions List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading requisitions...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600">{error}</p>
          <button onClick={fetchRequisitions} className="mt-2 text-red-700 underline">
            Try again
          </button>
        </div>
      ) : requisitions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">📋</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No requisitions found</h3>
          <p className="text-gray-500 mb-4">
            {currentStatus ? 'Try adjusting your filters' : 'Create your first purchase requisition'}
          </p>
          <Link to="/app/purchasing/requisitions/new" className="btn-primary">
            + New Requisition
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requisition #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Needed By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {requisitions.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{req.reqNumber}</p>
                        {req.source === 'AUTO_REORDER' && (
                          <span className="text-xs text-blue-600">Auto-generated</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[req.status]}`}>
                        {statusLabels[req.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {req.lineItems?.length || 0} item(s)
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatDate(req.neededByDate)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(req.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/app/purchasing/requisitions/${req.id}`}
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
