import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AssetStatusBadge } from '../../../../components/assets';
import { vehiclesApi } from '../../../../services/api';

const vehicleTypeIcons = {
  TRUCK: '🚚',
  TRACTOR: '🚜',
  ATV: '🏍️',
  UTV: '🛻',
  TRAILER: '🚛',
  IMPLEMENT: '🔩',
  OTHER: '🚗',
};

export default function VehicleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDisposeModal, setShowDisposeModal] = useState(false);
  const [disposeStatus, setDisposeStatus] = useState('SOLD');
  const [disposeNotes, setDisposeNotes] = useState('');
  const [disposing, setDisposing] = useState(false);

  useEffect(() => {
    fetchVehicle();
  }, [id]);

  const fetchVehicle = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await vehiclesApi.get(id);
      setVehicle(response.data?.vehicle || response.vehicle || response);
      setAsset(response.data?.asset || response.asset || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDispose = async () => {
    try {
      setDisposing(true);
      await vehiclesApi.updateStatus(id, {
        status: disposeStatus,
        disposedAt: new Date().toISOString(),
        disposalNotes: disposeNotes,
      });
      setShowDisposeModal(false);
      fetchVehicle();
    } catch (err) {
      setError(err.message);
    } finally {
      setDisposing(false);
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
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
                <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading vehicle...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600">{error}</p>
          <Link to="/app/assets/vehicles" className="mt-2 text-red-700 underline">
            Back to Vehicles
          </Link>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="space-y-6">
                <div className="text-center py-12">
          <p className="text-gray-500">Vehicle not found</p>
          <Link to="/app/assets/vehicles" className="text-primary-600 hover:underline">
            Back to Vehicles
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link to="/app/assets/vehicles" className="mt-1 text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-4xl">{vehicleTypeIcons[vehicle.vehicleType] || '🚗'}</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                {vehicle.plateNumber && (
                  <span className="font-mono text-gray-600">{vehicle.plateNumber}</span>
                )}
                <span className="text-gray-400">•</span>
                <span className="text-gray-600">{vehicle.vehicleType?.replace(/_/g, ' ')}</span>
                <span className="text-gray-400">•</span>
                <AssetStatusBadge status={asset.status || 'ACTIVE'} />
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/app/assets/vehicles/${id}/edit`} className="btn-secondary">
            Edit
          </Link>
          {asset.status === 'ACTIVE' && (
            <button onClick={() => setShowDisposeModal(true)} className="btn-secondary text-red-600 hover:text-red-700">
              Dispose
            </button>
          )}
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Vehicle Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Information</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-gray-500">Make</dt>
              <dd className="font-medium text-gray-900">{vehicle.make}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Model</dt>
              <dd className="font-medium text-gray-900">{vehicle.model}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Year</dt>
              <dd className="font-medium text-gray-900">{vehicle.year || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Color</dt>
              <dd className="font-medium text-gray-900">{vehicle.color || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Type</dt>
              <dd className="font-medium text-gray-900">{vehicle.vehicleType?.replace(/_/g, ' ')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Fuel Type</dt>
              <dd className="font-medium text-gray-900">{vehicle.fuelType || '-'}</dd>
            </div>
          </dl>
        </div>

        {/* Identification */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Identification</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-gray-500">VIN</dt>
              <dd className="font-mono text-gray-900">{vehicle.vin || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">License Plate</dt>
              <dd className="font-mono text-gray-900">{vehicle.plateNumber || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Site</dt>
              <dd className="font-medium text-gray-900">{vehicle.siteName || '-'}</dd>
            </div>
          </dl>
        </div>

        {/* Usage */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-gray-500">Odometer</dt>
              <dd className="font-medium text-gray-900">
                {vehicle.odometer?.value
                  ? `${vehicle.odometer.value.toLocaleString()} ${vehicle.odometer.unit?.toLowerCase() || 'mi'}`
                  : '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Engine Hours</dt>
              <dd className="font-medium text-gray-900">
                {vehicle.engineHours?.value ? `${vehicle.engineHours.value.toLocaleString()} hrs` : '-'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Financial */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-gray-500">Acquisition Date</dt>
              <dd className="font-medium text-gray-900">{formatDate(asset.acquiredAt)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Acquisition Cost</dt>
              <dd className="font-medium text-gray-900">{formatCurrency(asset.acquisitionCost)}</dd>
            </div>
            {asset.currentValue && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Current Value</dt>
                <dd className="font-medium text-gray-900">{formatCurrency(asset.currentValue)}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Insurance & Registration */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Insurance & Registration</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-gray-500">Insurance Policy</dt>
              <dd className="font-medium text-gray-900">{vehicle.insurancePolicy || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Insurance Expiry</dt>
              <dd className="font-medium text-gray-900">{formatDate(vehicle.insuranceExpiry)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Registration Expiry</dt>
              <dd className="font-medium text-gray-900">{formatDate(vehicle.registrationExpiry)}</dd>
            </div>
          </dl>
        </div>

        {/* Notes */}
        {asset.notes && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{asset.notes}</p>
          </div>
        )}
      </div>

      {/* Dispose Modal */}
      {showDisposeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Dispose Vehicle</h2>
            <p className="text-gray-600 mb-4">
              This will change the status of the vehicle. The record will be preserved.
            </p>
            <div className="space-y-4">
              <div>
                <label className="label">New Status</label>
                <select
                  value={disposeStatus}
                  onChange={(e) => setDisposeStatus(e.target.value)}
                  className="input"
                >
                  <option value="SOLD">Sold</option>
                  <option value="RETIRED">Retired</option>
                  <option value="LOST">Lost/Stolen</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea
                  value={disposeNotes}
                  onChange={(e) => setDisposeNotes(e.target.value)}
                  rows={3}
                  placeholder="Optional notes about the disposal..."
                  className="input"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowDisposeModal(false)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleDispose}
                disabled={disposing}
                className="btn-primary bg-red-600 hover:bg-red-700"
              >
                {disposing ? 'Processing...' : 'Confirm Disposal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
