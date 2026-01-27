import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { purchasingApi, contactsApi } from '../../../services/api';

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  CONVERTED: 'bg-blue-100 text-blue-700',
};

export default function RequisitionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [requisition, setRequisition] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reqRes, vendorsRes] = await Promise.all([
        purchasingApi.getRequisition(id),
        contactsApi.list({ type: 'vendor', activeOnly: 'true' }),
      ]);
      setRequisition(reqRes.data?.requisition);
      // Map contacts to vendor format
      const vendorContacts = vendorsRes.data?.contacts || [];
      setVendors(vendorContacts.map(c => ({ id: c.id, name: c.name, email: c.email })));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setActionLoading(true);
    try {
      await purchasingApi.submitRequisition(id);
      await fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await purchasingApi.approveRequisition(id);
      await fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setError('Rejection reason is required');
      return;
    }
    setActionLoading(true);
    try {
      await purchasingApi.rejectRequisition(id, rejectReason);
      setShowRejectModal(false);
      await fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvert = async () => {
    if (!selectedVendor) {
      setError('Please select a vendor');
      return;
    }
    setActionLoading(true);
    try {
      const response = await purchasingApi.convertRequisition(id, selectedVendor);
      const poId = response.data?.purchaseOrder?.id;
      if (poId) {
        navigate(`/app/purchasing/purchase-orders/${poId}`);
      } else {
        navigate('/app/purchasing/purchase-orders');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading requisition...</p>
        </div>
      </div>
    );
  }

  if (error && !requisition) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md mx-auto">
          <p className="text-red-600">{error}</p>
          <Link to="/app/purchasing/requisitions" className="mt-4 inline-block text-red-600 hover:text-red-700">
            Back to Requisitions
          </Link>
        </div>
      </div>
    );
  }

  if (!requisition) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            to="/app/purchasing/requisitions"
            className="text-gray-500 hover:text-gray-700 text-sm mb-2 inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Requisitions
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{requisition.reqNumber}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${statusColors[requisition.status]}`}>
              {requisition.status}
            </span>
            {requisition.source === 'AUTO_REORDER' && (
              <span className="text-sm text-blue-600">Auto-generated from reorder point</span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {requisition.status === 'DRAFT' && (
            <button
              onClick={handleSubmit}
              disabled={actionLoading}
              className="btn-primary"
            >
              {actionLoading ? 'Submitting...' : 'Submit for Approval'}
            </button>
          )}
          {requisition.status === 'SUBMITTED' && (
            <>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50"
              >
                Reject
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="btn-primary"
              >
                {actionLoading ? 'Approving...' : 'Approve'}
              </button>
            </>
          )}
          {requisition.status === 'APPROVED' && (
            <button
              onClick={() => setShowConvertModal(true)}
              disabled={actionLoading}
              className="btn-primary"
            >
              Convert to PO
            </button>
          )}
          {requisition.convertedToPoId && (
            <Link
              to={`/app/purchasing/purchase-orders/${requisition.convertedToPoId}`}
              className="btn-secondary"
            >
              View PO
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Details */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Needed By</p>
          <p className="text-lg font-medium text-gray-900">{formatDate(requisition.neededByDate)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Created</p>
          <p className="text-lg font-medium text-gray-900">{formatDate(requisition.createdAt)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Items</p>
          <p className="text-lg font-medium text-gray-900">{requisition.lineItems?.length || 0}</p>
        </div>
      </div>

      {/* Approval Info */}
      {(requisition.approval?.approvedAt || requisition.approval?.rejectedAt) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Approval History</h2>
          {requisition.approval.approvedAt && (
            <p className="text-sm text-green-600">
              Approved on {formatDate(requisition.approval.approvedAt)}
            </p>
          )}
          {requisition.approval.rejectedAt && (
            <div>
              <p className="text-sm text-red-600">
                Rejected on {formatDate(requisition.approval.rejectedAt)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Reason: {requisition.approval.rejectedReason}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Line Items */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Requested Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Est. Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {requisition.lineItems?.map((line, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 text-sm text-gray-500">{index + 1}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{line.description}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">{line.qty}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{line.uom}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">
                    {line.estimatedUnitPrice ? formatCurrency(line.estimatedUnitPrice) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes */}
      {requisition.notes && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Notes</h2>
          <p className="text-gray-700">{requisition.notes}</p>
        </div>
      )}

      {/* Convert to PO Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Convert to Purchase Order</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Vendor</label>
              <select
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                className="input"
              >
                <option value="">Choose a vendor...</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConvertModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConvert}
                disabled={actionLoading || !selectedVendor}
                className="flex-1 btn-primary"
              >
                {actionLoading ? 'Creating...' : 'Create PO'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Requisition</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Rejection</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="input"
                rows={3}
                placeholder="Enter reason..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
