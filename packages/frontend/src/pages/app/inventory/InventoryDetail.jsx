import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { inventoryApi, binsApi } from '../../../services/api';

const categoryIcons = {
  FEED: '🌾',
  MEDICINE: '💊',
  SUPPLIES: '📦',
  EQUIPMENT_PARTS: '🔧',
  SEED: '🌱',
  FERTILIZER: '🧪',
  CHEMICAL: '🧪',
  FUEL: '⛽',
  OTHER: '📋',
};

export default function InventoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [siteInventory, setSiteInventory] = useState([]);
  const [movements, setMovements] = useState([]);
  const [bin, setBin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemRes, movementsRes] = await Promise.all([
        inventoryApi.get(id),
        inventoryApi.getMovements({ itemId: id, limit: 20 }),
      ]);

      const itemData = itemRes.data?.item || itemRes.item;
      setItem(itemData);
      setSiteInventory(itemRes.data?.siteInventory || itemRes.siteInventory || []);
      setMovements(movementsRes.data?.movements || movementsRes.movements || []);

      // Fetch bin if item has binId
      if (itemData?.binId) {
        try {
          const binRes = await binsApi.get(itemData.binId);
          setBin(binRes.data?.bin || null);
        } catch (err) {
          console.error('Error fetching bin:', err);
          setBin(null);
        }
      } else {
        setBin(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this inventory item? This cannot be undone if there is no movement history.')) {
      return;
    }

    setDeleting(true);
    try {
      await inventoryApi.delete(id);
      navigate('/app/inventory');
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const formatDate = (dateVal) => {
    if (!dateVal) return 'N/A';
    let date;
    if (dateVal.toDate) {
      date = dateVal.toDate();
    } else if (dateVal._seconds) {
      date = new Date(dateVal._seconds * 1000);
    } else {
      date = new Date(dateVal);
    }
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateVal) => {
    if (!dateVal) return 'N/A';
    let date;
    if (dateVal.toDate) {
      date = dateVal.toDate();
    } else if (dateVal._seconds) {
      date = new Date(dateVal._seconds * 1000);
    } else {
      date = new Date(dateVal);
    }
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Calculate total quantity across all sites
  const totalQuantity = siteInventory.reduce((sum, si) => sum + (si.quantity || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading item...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md mx-auto">
          <p className="text-red-600">{error}</p>
          <Link to="/app/inventory" className="mt-4 inline-block text-red-600 hover:text-red-700">
            Back to Inventory
          </Link>
        </div>
      </div>
    );
  }

  if (!item) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            to="/app/inventory"
            className="text-gray-500 hover:text-gray-700 text-sm mb-2 inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Inventory
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">
              {categoryIcons[item.category] || categoryIcons.OTHER}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                {item.sku && <span className="text-sm text-gray-500">SKU: {item.sku}</span>}
                <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full capitalize">
                  {item.category}
                </span>
                {!item.active && (
                  <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                    Inactive
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Link
            to={`/app/inventory/${id}/edit`}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Edit
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Cards */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-500">Total On Hand</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {totalQuantity} <span className="text-sm font-normal text-gray-500">{item.unit}</span>
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-500">Unit Cost</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(item.defaultCostPerUnit)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-500">Reorder Point</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {item.reorderPoint > 0 ? (
                  <>
                    {item.reorderPoint} <span className="text-sm font-normal text-gray-500">{item.unit}</span>
                  </>
                ) : (
                  <span className="text-sm font-normal text-gray-400">Not set</span>
                )}
              </p>
            </div>
          </div>

          {/* Site Inventory */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Inventory by Site</h2>
            {siteInventory.length === 0 ? (
              <p className="text-gray-500">No site inventory records yet. Inventory levels update when events are posted.</p>
            ) : (
              <div className="space-y-3">
                {siteInventory.map((si) => (
                  <div
                    key={si.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      si.isBelowReorderPoint ? 'bg-red-50' : 'bg-gray-50'
                    }`}
                  >
                    <div>
                      <p className="font-medium text-gray-900">{si.siteId?.name || 'Unknown Site'}</p>
                      {si.isBelowReorderPoint && (
                        <p className="text-xs text-red-600 mt-0.5">Below reorder point</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {si.quantity} {item.unit}
                      </p>
                      {si.averageCost > 0 && (
                        <p className="text-xs text-gray-500">
                          Avg: {formatCurrency(si.averageCost)}/{item.unit}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Movement History */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Movements</h2>
            {movements.length === 0 ? (
              <p className="text-gray-500">No movements recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {movements.map((movement) => (
                  <div key={movement.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 capitalize">{movement.movementType}</p>
                      <p className="text-sm text-gray-500">
                        {movement.siteId?.name || 'Unknown site'}
                      </p>
                      {movement.eventId && (
                        <Link
                          to={`/app/events/${movement.eventId.id || movement.eventId}`}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          {movement.eventId.type}: {movement.eventId.description?.slice(0, 30)}...
                        </Link>
                      )}
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold ${
                          movement.quantity > 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {movement.quantity > 0 ? '+' : ''}
                        {movement.quantity} {item.unit}
                      </p>
                      <p className="text-xs text-gray-500">{formatDateTime(movement.movementDate)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Details</h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Category</dt>
                <dd className="text-gray-900 capitalize">{item.category}</dd>
              </div>
              {item.subcategory && (
                <div>
                  <dt className="text-gray-500">Subcategory</dt>
                  <dd className="text-gray-900">{item.subcategory}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">Unit of Measure</dt>
                <dd className="text-gray-900">{item.unit}</dd>
              </div>
              {item.barcode && (
                <div>
                  <dt className="text-gray-500">Barcode</dt>
                  <dd className="text-gray-900 font-mono">{item.barcode}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Storage Location */}
          {bin && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Storage Location</h3>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div>
                  <p className="font-mono text-sm bg-gray-200 px-2 py-0.5 rounded inline-block">
                    {bin.code}
                  </p>
                  <p className="text-sm text-gray-900 mt-0.5">{bin.name}</p>
                  {bin.type && (
                    <p className="text-xs text-gray-500">{bin.type}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Reorder Info */}
          {(item.reorderPoint > 0 || item.preferredVendor) && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Reorder Info</h3>
              <dl className="space-y-3 text-sm">
                {item.reorderPoint > 0 && (
                  <div>
                    <dt className="text-gray-500">Reorder Point</dt>
                    <dd className="text-gray-900">
                      {item.reorderPoint} {item.unit}
                    </dd>
                  </div>
                )}
                {item.reorderQty > 0 && (
                  <div>
                    <dt className="text-gray-500">Reorder Quantity</dt>
                    <dd className="text-gray-900">
                      {item.reorderQty} {item.unit}
                    </dd>
                  </div>
                )}
                {item.preferredVendor && (
                  <div>
                    <dt className="text-gray-500">Preferred Vendor</dt>
                    <dd className="text-gray-900">{item.preferredVendor}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Notes */}
          {item.notes && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Notes</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.notes}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Record Info</h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Created</dt>
                <dd className="text-gray-900">{formatDate(item.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Last Updated</dt>
                <dd className="text-gray-900">{formatDate(item.updatedAt)}</dd>
              </div>
            </dl>
          </div>

          {/* Danger Zone */}
          {item.active && (
            <div className="bg-white rounded-xl border border-red-200 p-6">
              <h3 className="font-semibold text-red-700 mb-4">Danger Zone</h3>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Item'}
              </button>
              <p className="mt-2 text-xs text-gray-500">
                Items with movement history will be deactivated instead of deleted.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
