import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { purchasingApi } from '../../../services/api';

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-700',
  ACKNOWLEDGED: 'bg-purple-100 text-purple-700',
  PARTIALLY_RECEIVED: 'bg-yellow-100 text-yellow-700',
  RECEIVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function PurchaseOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [po, setPO] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [reprocessLoading, setReprocessLoading] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveLines, setReceiveLines] = useState([]);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendMethod, setSendMethod] = useState('');
  const [sendNotes, setSendNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [poRes, receiptsRes] = await Promise.all([
        purchasingApi.getPurchaseOrder(id),
        purchasingApi.getReceipts({ poId: id }),
      ]);
      setPO(poRes.data?.purchaseOrder);
      setVendor(poRes.data?.vendor);
      setReceipts(receiptsRes.data?.receipts || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!sendMethod) {
      setError('Please select how you are sending this PO');
      return;
    }
    setActionLoading(true);
    try {
      await purchasingApi.sendPurchaseOrder(id, sendMethod, sendNotes || null);
      setShowSendModal(false);
      setSendMethod('');
      setSendNotes('');
      await fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openReceiveModal = () => {
    // Initialize receive lines from PO lines with remaining quantities
    const lines = po.lineItems.map((line, index) => {
      // Use qtyReceived from PO line (updated when receipts are posted)
      const receivedQty = line.qtyReceived || 0;
      const remainingQty = line.qtyOrdered - receivedQty;

      return {
        lineNumber: index + 1,
        inventoryItemId: line.itemId,
        description: line.description,
        orderedQty: line.qtyOrdered,
        receivedQty: receivedQty,
        remainingQty: remainingQty,
        receiveQty: remainingQty > 0 ? remainingQty : 0,
        uom: line.uom,
        unitPrice: line.unitPrice,
      };
    });
    setReceiveLines(lines);
    setShowReceiveModal(true);
  };

  const handleReceive = async () => {
    const linesToReceive = receiveLines.filter((l) => l.receiveQty > 0);
    if (linesToReceive.length === 0) {
      setError('Please enter quantities to receive');
      return;
    }

    setActionLoading(true);
    try {
      // Create the receipt
      const receiptRes = await purchasingApi.createReceipt({
        poId: id,
        siteId: po.siteId,
        lines: linesToReceive.map((l) => ({
          poLineNumber: l.lineNumber,
          itemId: l.inventoryItemId,
          qtyReceived: l.receiveQty,
          unitCost: l.unitPrice,
        })),
      });

      // Auto-post to update inventory
      if (receiptRes.data?.receipt?.id) {
        const postRes = await purchasingApi.postReceipt(receiptRes.data.receipt.id);
        if (postRes?.partial) {
          setError(
            postRes?.message ||
              'Receipt posted but inventory update failed. Please reprocess the receipt.'
          );
        }
      }

      setShowReceiveModal(false);
      await fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReprocessFailedReceipts = async () => {
    setReprocessLoading(true);
    setError(null);
    try {
      const res = await purchasingApi.reprocessFailedReceipts();
      if (res?.data?.message) {
        setError(res.data.message);
      }
      await fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setReprocessLoading(false);
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

  const calculateTotal = () => {
    return (po?.lineItems || []).reduce((sum, line) => sum + (line.qtyOrdered * line.unitPrice), 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading purchase order...</p>
        </div>
      </div>
    );
  }

  if (error && !po) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md mx-auto">
          <p className="text-red-600">{error}</p>
          <Link to="/app/purchasing/purchase-orders" className="mt-4 inline-block text-red-600 hover:text-red-700">
            Back to Purchase Orders
          </Link>
        </div>
      </div>
    );
  }

  if (!po) return null;

  const canReceive = ['SENT', 'ACKNOWLEDGED', 'PARTIALLY_RECEIVED'].includes(po.status);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            to="/app/purchasing/purchase-orders"
            className="text-gray-500 hover:text-gray-700 text-sm mb-2 inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Purchase Orders
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{po.poNumber}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${statusColors[po.status]}`}>
              {po.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {po.status === 'DRAFT' && (
            <button
              onClick={() => setShowSendModal(true)}
              disabled={actionLoading}
              className="btn-primary"
            >
              Send to Vendor
            </button>
          )}
          {canReceive && (
            <button
              onClick={openReceiveModal}
              disabled={actionLoading}
              className="btn-primary"
            >
              Receive Goods
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Vendor</p>
          <p className="text-lg font-medium text-gray-900">{vendor?.name || 'Unknown'}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Order Date</p>
          <p className="text-lg font-medium text-gray-900">{formatDate(po.orderDate)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Expected Delivery</p>
          <p className="text-lg font-medium text-gray-900">{formatDate(po.expectedDeliveryDate)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(calculateTotal())}</p>
        </div>
        {po.sendMethod && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Sent Via</p>
            <p className="text-lg font-medium text-gray-900">
              {po.sendMethod === 'EMAIL' ? `Email${po.sentVia?.emailSentTo ? ` (${po.sentVia.emailSentTo})` : ''}` :
               po.sendMethod === 'PHONE' ? 'Phone Call' :
               po.sendMethod === 'WALKIN' ? 'Walk-in / In-store' : 'Online Order'}
            </p>
            {po.sentVia?.notes && <p className="text-sm text-gray-500 mt-1">{po.sentVia.notes}</p>}
          </div>
        )}
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Order Lines</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Line Total</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {po.lineItems?.map((line, index) => {
                // Use qtyReceived from PO line (updated when receipts are posted)
                const receivedQty = line.qtyReceived || 0;
                return (
                  <tr key={index}>
                    <td className="px-6 py-4 text-sm text-gray-500">{index + 1}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{line.description}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">{line.qtyOrdered}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{line.uom}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(line.unitPrice)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">
                      {formatCurrency(line.qtyOrdered * line.unitPrice)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <span className={receivedQty >= line.qtyOrdered ? 'text-green-600 font-medium' : 'text-gray-900'}>
                        {receivedQty} / {line.qtyOrdered}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan="5" className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                  Total:
                </td>
                <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                  {formatCurrency(calculateTotal())}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Receipts History */}
      {receipts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Receiving History</h2>
            <button
              type="button"
              onClick={handleReprocessFailedReceipts}
              disabled={reprocessLoading}
              className="btn-secondary"
            >
              {reprocessLoading ? 'Reprocessing...' : 'Reprocess Failed Receipts'}
            </button>
          </div>
          <div className="divide-y divide-gray-200">
            {receipts.map((receipt) => (
              <div key={receipt.id} className="px-6 py-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">{receipt.receiptNumber}</p>
                    <p className="text-sm text-gray-500">
                      Received {formatDate(receipt.receivedDate)} at {receipt.siteId?.name || 'Site'}
                    </p>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    receipt.status === 'POSTED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {receipt.status}
                  </span>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  {receipt.lineItems?.map((line, i) => (
                    <span key={i} className="mr-4">
                      Line {line.lineNumber}: {line.qtyReceived} received
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {po.notes && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Notes</h2>
          <p className="text-gray-700">{po.notes}</p>
        </div>
      )}

      {/* Related Links */}
      {po.requisitionId && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Related Documents</h2>
          <Link
            to={`/app/purchasing/requisitions/${po.requisitionId}`}
            className="text-red-600 hover:text-red-700"
          >
            View Original Requisition
          </Link>
        </div>
      )}

      {/* Receive Modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Receive Goods</h3>

            <div className="space-y-4">
              {receiveLines.map((line, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{line.description}</p>
                      <p className="text-sm text-gray-500">
                        Ordered: {line.orderedQty} | Received: {line.receivedQty} | Remaining: {line.remainingQty}
                      </p>
                    </div>
                  </div>
                  {line.remainingQty > 0 ? (
                    <div className="flex items-center gap-4">
                      <label className="text-sm text-gray-600">Receive Qty:</label>
                      <input
                        type="number"
                        value={line.receiveQty}
                        onChange={(e) => {
                          const newLines = [...receiveLines];
                          newLines[index].receiveQty = Math.max(0, Math.min(line.remainingQty, parseInt(e.target.value) || 0));
                          setReceiveLines(newLines);
                        }}
                        className="input w-24"
                        min="0"
                        max={line.remainingQty}
                      />
                      <span className="text-sm text-gray-500">{line.uom}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-green-600">Fully received</p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowReceiveModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReceive}
                disabled={actionLoading || receiveLines.every((l) => l.receiveQty === 0)}
                className="flex-1 btn-primary"
              >
                {actionLoading ? 'Receiving...' : 'Confirm Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Method Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Send to Vendor</h3>
            <p className="text-gray-600 mb-4">How are you sending this purchase order?</p>

            <div className="space-y-3 mb-4">
              {[
                { value: 'EMAIL', label: 'Email', desc: 'Send via email (requires vendor email)' },
                { value: 'PHONE', label: 'Phone Call', desc: 'Called or will call the vendor' },
                { value: 'WALKIN', label: 'Walk-in / In-store', desc: 'Purchased in person at vendor location' },
                { value: 'ONLINE', label: 'Online Order', desc: 'Placed order on vendor website' },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                    sendMethod === opt.value ? 'border-red-500 bg-red-50' : 'border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="sendMethod"
                    value={opt.value}
                    checked={sendMethod === opt.value}
                    onChange={(e) => setSendMethod(e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{opt.label}</p>
                    <p className="text-sm text-gray-500">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <input
                type="text"
                value={sendNotes}
                onChange={(e) => setSendNotes(e.target.value)}
                className="input"
                placeholder="e.g., Order confirmation #12345"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSendModal(false);
                  setSendMethod('');
                  setSendNotes('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={actionLoading || !sendMethod}
                className="flex-1 btn-primary"
              >
                {actionLoading ? 'Sending...' : 'Mark as Sent'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
