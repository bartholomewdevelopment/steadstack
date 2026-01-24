import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { eventsApi } from '../../../services/api';

const eventTypeColors = {
  feeding: 'bg-green-100 text-green-800',
  treatment: 'bg-red-100 text-red-800',
  purchase: 'bg-blue-100 text-blue-800',
  sale: 'bg-purple-100 text-purple-800',
  transfer: 'bg-yellow-100 text-yellow-800',
  adjustment: 'bg-gray-100 text-gray-800',
  maintenance: 'bg-orange-100 text-orange-800',
  labor: 'bg-indigo-100 text-indigo-800',
  breeding: 'bg-pink-100 text-pink-800',
  birth: 'bg-emerald-100 text-emerald-800',
  death: 'bg-slate-100 text-slate-800',
  harvest: 'bg-amber-100 text-amber-800',
  custom: 'bg-cyan-100 text-cyan-800',
};

const statusColors = {
  draft: 'bg-gray-100 text-gray-600',
  pending: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await eventsApi.get(id);
      setEvent(response.event);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!confirm('Post this event to inventory and accounting?')) return;

    setActionLoading(true);
    try {
      await eventsApi.post(id);
      fetchEvent();
    } catch (err) {
      alert('Failed to post: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleVoid = async () => {
    if (!confirm('Void this event? This will reverse all inventory and accounting entries.')) return;

    setActionLoading(true);
    try {
      await eventsApi.void(id);
      fetchEvent();
    } catch (err) {
      alert('Failed to void: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this event? This cannot be undone.')) return;

    setActionLoading(true);
    try {
      await eventsApi.delete(id);
      navigate('/app/events');
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
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
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
        <p className="mt-2 text-gray-500">Loading event...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md mx-auto">
          <p className="text-red-600">{error}</p>
          <Link to="/app/events" className="mt-4 inline-block text-primary-600 hover:text-primary-700">
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Event not found.</p>
        <Link to="/app/events" className="mt-4 inline-block text-primary-600 hover:text-primary-700">
          Back to Events
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link to="/app/events" className="text-gray-500 hover:text-gray-700 text-sm mb-2 inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Events
          </Link>
          <h1 className="text-2xl font-display font-bold text-gray-900">{event.description}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${eventTypeColors[event.type] || 'bg-gray-100 text-gray-800'}`}>
              {event.type}
            </span>
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${statusColors[event.status]}`}>
              {event.status}
            </span>
            {event.posted && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Posted
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {!event.posted && event.status !== 'cancelled' && (
            <button
              onClick={handlePost}
              disabled={actionLoading}
              className="btn-primary text-sm"
            >
              Post to Ledger
            </button>
          )}
          {event.posted && event.status !== 'cancelled' && (
            <button
              onClick={handleVoid}
              disabled={actionLoading}
              className="btn-secondary text-sm text-red-600 hover:text-red-700"
            >
              Void Event
            </button>
          )}
          {!event.posted && (
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="btn-secondary text-sm text-red-600 hover:text-red-700"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Details</h2>

          <dl className="grid md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Event Date</dt>
              <dd className="mt-1 text-gray-900">{formatDate(event.eventDate)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Site</dt>
              <dd className="mt-1 text-gray-900">{event.siteId?.name || 'Unknown'}</dd>
            </div>
            {event.notes && (
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="mt-1 text-gray-900">{event.notes}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Financial Summary */}
        {(event.totalCost > 0 || event.totalRevenue > 0) && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h2>

            <div className="grid md:grid-cols-2 gap-4">
              {event.totalCost > 0 && (
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600 font-medium">Total Cost</p>
                  <p className="text-2xl font-bold text-red-700">{formatCurrency(event.totalCost)}</p>
                </div>
              )}
              {event.totalRevenue > 0 && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-700">{formatCurrency(event.totalRevenue)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Inventory Used */}
        {event.inventoryUsed && event.inventoryUsed.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Inventory Used</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-500">Item</th>
                    <th className="px-4 py-2 text-right text-gray-500">Quantity</th>
                    <th className="px-4 py-2 text-right text-gray-500">Unit Cost</th>
                    <th className="px-4 py-2 text-right text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {event.inventoryUsed.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-gray-900">{item.itemName}</td>
                      <td className="px-4 py-3 text-right text-gray-900">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {formatCurrency(item.unitCost)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatCurrency(item.totalCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Inventory Received */}
        {event.inventoryReceived && event.inventoryReceived.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Inventory Received</h2>

            {event.vendor?.name && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Vendor: <span className="text-gray-900 font-medium">{event.vendor.name}</span></p>
                {event.vendor.invoiceNumber && (
                  <p className="text-sm text-gray-500">Invoice: <span className="text-gray-900">{event.vendor.invoiceNumber}</span></p>
                )}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-500">Item</th>
                    <th className="px-4 py-2 text-right text-gray-500">Quantity</th>
                    <th className="px-4 py-2 text-right text-gray-500">Unit Cost</th>
                    <th className="px-4 py-2 text-right text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {event.inventoryReceived.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-gray-900">{item.itemName}</td>
                      <td className="px-4 py-3 text-right text-gray-900">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {formatCurrency(item.unitCost)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatCurrency(item.totalCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Labor */}
        {event.labor && event.labor.hours > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Labor</h2>

            <dl className="grid md:grid-cols-3 gap-4">
              {event.labor.workerName && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Worker</dt>
                  <dd className="mt-1 text-gray-900">{event.labor.workerName}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Hours</dt>
                <dd className="mt-1 text-gray-900">{event.labor.hours}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Rate</dt>
                <dd className="mt-1 text-gray-900">{formatCurrency(event.labor.rate)}/hr</dd>
              </div>
            </dl>
          </div>
        )}

        {/* Ledger Entries */}
        {event.ledgerEntries && event.ledgerEntries.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Accounting Entries</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-500">Account</th>
                    <th className="px-4 py-2 text-left text-gray-500">Description</th>
                    <th className="px-4 py-2 text-right text-gray-500">Debit</th>
                    <th className="px-4 py-2 text-right text-gray-500">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {event.ledgerEntries.map((entry, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-gray-900">
                        {entry.accountCode} - {entry.accountName}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{entry.description}</td>
                      <td className="px-4 py-3 text-right text-gray-900">
                        {entry.debit > 0 ? formatCurrency(entry.debit) : ''}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Inventory Movements */}
        {event.inventoryMovements && event.inventoryMovements.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Inventory Movements</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-500">Item</th>
                    <th className="px-4 py-2 text-left text-gray-500">Type</th>
                    <th className="px-4 py-2 text-right text-gray-500">Quantity</th>
                    <th className="px-4 py-2 text-right text-gray-500">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {event.inventoryMovements.map((movement, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-gray-900">{movement.itemName}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          movement.movementType === 'in' || movement.movementType === 'transfer_in'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {movement.movementType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900">
                        {movement.quantity} {movement.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900">
                        {formatCurrency(movement.totalCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Audit Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Audit Trail</h2>

          <dl className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-gray-900">
                {formatDateTime(event.createdAt)}
                {event.createdBy && ` by ${event.createdBy.displayName || event.createdBy.email}`}
              </dd>
            </div>
            {event.updatedAt !== event.createdAt && (
              <div>
                <dt className="font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-gray-900">
                  {formatDateTime(event.updatedAt)}
                  {event.updatedBy && ` by ${event.updatedBy.displayName || event.updatedBy.email}`}
                </dd>
              </div>
            )}
            {event.posted && event.postedAt && (
              <div>
                <dt className="font-medium text-gray-500">Posted</dt>
                <dd className="mt-1 text-gray-900">{formatDateTime(event.postedAt)}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}
