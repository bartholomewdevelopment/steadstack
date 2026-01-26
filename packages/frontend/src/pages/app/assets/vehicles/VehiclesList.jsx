import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSite } from '../../../../contexts/SiteContext';
import { AssetStatusBadge, AssetFilters } from '../../../../components/assets';
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

export default function VehiclesList() {
  const { currentSite } = useSite();
  const [searchParams, setSearchParams] = useSearchParams();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const currentStatus = searchParams.get('status') || 'ACTIVE';
  const currentSearch = searchParams.get('search') || '';
  const currentPage = parseInt(searchParams.get('page') || '1');

  useEffect(() => {
    fetchVehicles();
  }, [currentSite, currentStatus, currentSearch, currentPage]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        limit: 20,
      };
      if (currentSite?.id) params.siteId = currentSite.id;
      if (currentStatus) params.status = currentStatus;
      if (currentSearch) params.search = currentSearch;

      const response = await vehiclesApi.list(params);
      setVehicles(response.data?.vehicles || response.vehicles || []);
      setPagination(response.data?.pagination || response.pagination || { page: 1, pages: 1, total: 0 });
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
    params.set('page', '1');
    setSearchParams(params);
  };

  const formatOdometer = (vehicle) => {
    if (!vehicle.odometer?.value) return '-';
    return `${vehicle.odometer.value.toLocaleString()} ${vehicle.odometer.unit?.toLowerCase() || 'mi'}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehicles</h1>
          <p className="text-gray-600">Trucks, tractors, ATVs, and other vehicles</p>
        </div>
        <Link to="/app/assets/vehicles/new" className="btn-primary inline-flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Vehicle
        </Link>
      </div>

      {/* Filters */}
      <AssetFilters
        status={currentStatus}
        onStatusChange={(value) => handleFilterChange('status', value)}
        search={currentSearch}
        onSearchChange={(value) => handleFilterChange('search', value)}
      />

      {/* Vehicles List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading vehicles...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600">{error}</p>
          <button onClick={fetchVehicles} className="mt-2 text-red-700 underline">
            Try again
          </button>
        </div>
      ) : vehicles.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">🚜</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No vehicles found</h3>
          <p className="text-gray-500 mb-4">
            {currentSearch || currentStatus !== 'ACTIVE'
              ? 'Try adjusting your filters'
              : 'Add your first vehicle to get started'}
          </p>
          <Link to="/app/assets/vehicles/new" className="btn-primary">
            + Add Vehicle
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plate/VIN
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Odometer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Site
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {vehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{vehicleTypeIcons[vehicle.vehicleType] || '🚗'}</span>
                        <div>
                          <Link
                            to={`/app/assets/vehicles/${vehicle.id}`}
                            className="font-medium text-gray-900 hover:text-primary-600"
                          >
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </Link>
                          {vehicle.color && (
                            <p className="text-sm text-gray-500">{vehicle.color}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {vehicle.vehicleType?.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        {vehicle.plateNumber && (
                          <p className="font-mono text-sm text-gray-900">{vehicle.plateNumber}</p>
                        )}
                        {vehicle.vin && (
                          <p className="font-mono text-xs text-gray-500">{vehicle.vin.slice(-8)}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatOdometer(vehicle)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {vehicle.siteName || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <AssetStatusBadge status={vehicle.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/app/assets/vehicles/${vehicle.id}`}
                          className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                        >
                          View
                        </Link>
                        <Link
                          to={`/app/assets/vehicles/${vehicle.id}/edit`}
                          className="text-gray-600 hover:text-gray-700 font-medium text-sm"
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.pages} ({pagination.total} vehicles)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleFilterChange('page', String(currentPage - 1))}
                  disabled={currentPage <= 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => handleFilterChange('page', String(currentPage + 1))}
                  disabled={currentPage >= pagination.pages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
