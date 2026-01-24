import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { purchasingApi } from '../../../services/api';

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  PARTIALLY_PAID: 'bg-blue-100 text-blue-700',
  PAID: 'bg-green-100 text-green-700',
  VOIDED: 'bg-red-100 text-red-700',
};

export default function VendorBillDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [billRes, paymentsRes] = await Promise.all([
        purchasingApi.getBill(id),
        purchasingApi.getPayments({ billId: id }),
      ]);
      setBill(billRes.data?.bill);
      setPayments(paymentsRes.data?.payments || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await purchasingApi.approveBill(id);
      await fetchData();
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

  const calculateTotal = () => {
    return (bill?.lineItems || []).reduce((sum, line) => sum + (line.qty * line.unitPrice), 0);
  };

  const calculatePaid = () => {
    return payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  };

  const isOverdue = () => {
    if (!bill?.dueDate || ['PAID', 'VOIDED'].includes(bill.status)) return false;
    const due = bill.dueDate.toDate ? bill.dueDate.toDate() : new Date(bill.dueDate);
    return due < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading bill...</p>
        </div>
      </div>
    );
  }

  if (error && !bill) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md mx-auto">
          <p className="text-red-600">{error}</p>
          <Link to="/app/purchasing/bills" className="mt-4 inline-block text-red-600 hover:text-red-700">
            Back to Bills
          </Link>
        </div>
      </div>
    );
  }

  if (!bill) return null;

  const total = calculateTotal();
  const paid = calculatePaid();
  const balance = total - paid;
  const canPay = ['APPROVED', 'PARTIALLY_PAID'].includes(bill.status) && balance > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            to="/app/purchasing/bills"
            className="text-gray-500 hover:text-gray-700 text-sm mb-2 inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Bills
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{bill.billNumber}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${statusColors[bill.status]}`}>
              {bill.status.replace(/_/g, ' ')}
            </span>
            {isOverdue() && (
              <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-red-100 text-red-700">
                OVERDUE
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {bill.status === 'PENDING_APPROVAL' && (
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="btn-primary"
            >
              {actionLoading ? 'Approving...' : 'Approve Bill'}
            </button>
          )}
          {canPay && (
            <Link
              to={`/app/purchasing/payments/new?billId=${id}`}
              className="btn-primary"
            >
              Record Payment
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Vendor</p>
          <p className="text-lg font-medium text-gray-900">{bill.vendorId?.name || 'Unknown'}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Vendor Invoice #</p>
          <p className="text-lg font-medium text-gray-900">{bill.vendorInvoiceNumber}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Invoice Date</p>
          <p className="text-lg font-medium text-gray-900">{formatDate(bill.invoiceDate)}</p>
        </div>
        <div className={`bg-white rounded-xl border p-4 ${isOverdue() ? 'border-red-300' : 'border-gray-200'}`}>
          <p className="text-sm text-gray-500">Due Date</p>
          <p className={`text-lg font-medium ${isOverdue() ? 'text-red-600' : 'text-gray-900'}`}>
            {formatDate(bill.dueDate)}
          </p>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-sm text-gray-500">Bill Total</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Amount Paid</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(paid)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Balance Due</p>
            <p className={`text-2xl font-bold ${balance > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {formatCurrency(balance)}
            </p>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Line Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {bill.lineItems?.map((line, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 text-sm text-gray-500">{line.lineNumber || index + 1}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{line.description}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">{line.qty}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(line.unitPrice)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                    {formatCurrency(line.qty * line.unitPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan="4" className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                  Total:
                </td>
                <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                  {formatCurrency(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Payments History */}
      {payments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {payments.map((payment) => (
              <div key={payment.id} className="px-6 py-4 flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">{payment.paymentNumber}</p>
                  <p className="text-sm text-gray-500">
                    {formatDate(payment.paymentDate)} via {payment.paymentMethod || 'Unknown'}
                  </p>
                  {payment.reference && (
                    <p className="text-sm text-gray-400">Ref: {payment.reference}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">{formatCurrency(payment.amount)}</p>
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                    payment.status === 'CLEARED' ? 'bg-green-100 text-green-700' :
                    payment.status === 'POSTED' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {payment.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {bill.notes && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Notes</h2>
          <p className="text-gray-700">{bill.notes}</p>
        </div>
      )}

      {/* Related Documents */}
      {(bill.receiptId || bill.purchaseOrderId) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Related Documents</h2>
          <div className="flex gap-4">
            {bill.purchaseOrderId && (
              <Link
                to={`/app/purchasing/purchase-orders/${bill.purchaseOrderId}`}
                className="text-red-600 hover:text-red-700"
              >
                View Purchase Order
              </Link>
            )}
            {bill.receiptId && (
              <span className="text-gray-500">
                Linked to Receipt: {bill.receiptId}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
