import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LandNav } from '../../../../../components/land';
import { landTractsApi, sitesApi } from '../../../../../services/api';
import { useSite } from '../../../../../contexts/SiteContext';
import { formatAcres } from '../../../../../utils/geometry';

const landTypes = [
  { value: '', label: 'All Types' },
  { value: 'PARCEL', label: 'Parcel' },
  { value: 'FIELD', label: 'Field' },
  { value: 'PASTURE', label: 'Pasture' },
  { value: 'INFRASTRUCTURE', label: 'Infrastructure' },
  { value: 'OTHER', label: 'Other' },
];

const typeColors = {
  PARCEL: 'bg-blue-100 text-blue-800',
  FIELD: 'bg-yellow-100 text-yellow-800',
  PASTURE: 'bg-green-100 text-green-800',
  INFRASTRUCTURE: 'bg-gray-100 text-gray-800',
  OTHER: 'bg-purple-100 text-purple-800',
};

export default function LandTractsList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { sites } = useSite();

  const [tracts, setTracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  // Filters
  const [siteFilter, setSiteFilter] = useState(searchParams.get('siteId') || '');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '');
  const [statusFilter, setStatusFilter] = useState('active');

  const sitesWithBoundary = sites?.filter(s => s.boundaryGeometry) || [];

  useEffect(() => {
    fetchTracts();
  }, [siteFilter, typeFilter, statusFilter]);

  const fetchTracts = async () => {
    try {
      setLoading(true);
      const params = { status: statusFilter };
      if (siteFilter) params.siteId = siteFilter;
      if (typeFilter) params.type = typeFilter;

      const res = await landTractsApi.list(params);
      setTracts(res.data?.tracts || []);
      setPagination(res.data?.pagination || { page: 1, pages: 1, total: 0 });
    } catch (error) {
      console.error('Error fetching land tracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSiteChange = (value) => {
    setSiteFilter(value);
    const params = new URLSearchParams(searchParams);
    if (value) params.set('siteId', value);
    else params.delete('siteId');
    setSearchParams(params);
  };

  const getSiteName = (siteId) => {
    const site = sites?.find(s => s.id === siteId);
    return site?.name || 'Unknown Site';
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Land Tracts</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your parcels, fields, pastures, and other land areas
            </p>
          </div>
          <Link
            to="/app/assets/land/tracts/new"
            className={`inline-flex items-center px-4 py-2 rounded-md shadow-sm text-sm font-medium ${
              sitesWithBoundary.length === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'border border-transparent text-white bg-green-600 hover:bg-green-700'
            }`}
            onClick={(e) => {
              if (sitesWithBoundary.length === 0) e.preventDefault();
            }}
            title={sitesWithBoundary.length === 0 ? 'Create a site with a boundary first' : ''}
          >
            + Add Land Tract
          </Link>
        </div>
      </div>

      <LandNav />

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Site</label>
          <select
            value={siteFilter}
            onChange={(e) => handleSiteChange(e.target.value)}
            className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
          >
            <option value="">All Sites</option>
            {sites?.map(site => (
              <option key={site.id} value={site.id}>
                {site.name} {!site.boundaryGeometry && '(no boundary)'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
          >
            {landTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {sitesWithBoundary.length === 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-yellow-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-yellow-800">No Sites With Boundaries</h3>
              <p className="mt-1 text-sm text-yellow-700">
                You need to create a site and draw its boundary before you can add land tracts.
              </p>
              <Link
                to="/app/assets/land/sites/new"
                className="mt-2 inline-flex text-sm font-medium text-yellow-800 hover:text-yellow-900"
              >
                Create a Site →
              </Link>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      ) : tracts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Land Tracts Found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {siteFilter || typeFilter
              ? 'No tracts match your filters.'
              : 'Get started by creating your first land tract.'}
          </p>
          {!siteFilter && !typeFilter && sitesWithBoundary.length > 0 && (
            <div className="mt-6">
              <Link
                to="/app/assets/land/tracts/new"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                + Create Land Tract
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Site
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acreage
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tracts.map((tract) => (
                <tr key={tract.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{tract.name}</div>
                      {tract.code && (
                        <div className="text-xs text-gray-500 font-mono">{tract.code}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getSiteName(tract.siteId)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColors[tract.type] || typeColors.OTHER}`}>
                      {tract.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatAcres(tract.areaAcres)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      to={`/app/assets/land/tracts/${tract.id}`}
                      className="text-green-600 hover:text-green-900"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {tracts.length} of {pagination.total} tracts
              </p>
              <div className="flex gap-2">
                <button
                  disabled={pagination.page === 1}
                  className="px-3 py-1 text-sm border rounded-md disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-1 text-sm border rounded-md disabled:opacity-50"
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
