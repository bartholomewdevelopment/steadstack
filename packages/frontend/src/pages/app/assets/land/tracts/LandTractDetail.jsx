import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapsProvider, SiteMap } from '../../../../../components/maps';
import { landTractsApi, sitesApi } from '../../../../../services/api';
import { useSite } from '../../../../../contexts/SiteContext';
import { formatAcres } from '../../../../../utils/geometry';

const typeColors = {
  PARCEL: 'bg-blue-100 text-blue-800',
  FIELD: 'bg-yellow-100 text-yellow-800',
  PASTURE: 'bg-green-100 text-green-800',
  INFRASTRUCTURE: 'bg-gray-100 text-gray-800',
  OTHER: 'bg-purple-100 text-purple-800',
};

export default function LandTractDetail() {
  const { tractId } = useParams();
  const navigate = useNavigate();
  const { sites } = useSite();

  const [tract, setTract] = useState(null);
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [tractId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await landTractsApi.get(tractId);
      const tractData = res.data?.tract;
      setTract(tractData);

      if (tractData?.siteId) {
        const siteRes = await sitesApi.get(tractData.siteId);
        setSite(siteRes.data?.site);
      }
    } catch (error) {
      console.error('Error fetching land tract:', error);
      setError('Failed to load land tract');
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm('Are you sure you want to archive this land tract?')) {
      return;
    }

    try {
      setArchiving(true);
      await landTractsApi.updateStatus(tractId, { status: 'archived' });
      navigate('/app/assets/land/tracts');
    } catch (error) {
      console.error('Error archiving tract:', error);
      setError('Failed to archive land tract');
    } finally {
      setArchiving(false);
    }
  };

  const getSiteName = () => {
    if (site) return site.name;
    const s = sites?.find(s => s.id === tract?.siteId);
    return s?.name || 'Unknown Site';
  };

  const mapCenter = site?.coordinates
    ? { lat: site.coordinates.latitude, lng: site.coordinates.longitude }
    : null;

  if (loading) {
    return (
      <div>
                <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  if (!tract) {
    return (
      <div>
                <div className="bg-white rounded-lg shadow p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900">Land Tract Not Found</h3>
          <Link
            to="/app/assets/land/tracts"
            className="mt-4 inline-flex items-center text-green-600 hover:text-green-700"
          >
            ← Back to Land Tracts
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link
          to="/app/assets/land/tracts"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back to Land Tracts
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{tract.name}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColors[tract.type] || typeColors.OTHER}`}>
              {tract.type}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
            {tract.code && <span className="font-mono">{tract.code}</span>}
            <Link
              to={`/app/assets/land/sites/${tract.siteId}`}
              className="text-green-600 hover:text-green-700"
            >
              {getSiteName()}
            </Link>
            <span>{formatAcres(tract.areaAcres)}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
              tract.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {tract.status}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/app/assets/land/tracts/${tractId}/edit`}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Edit
          </Link>
          <button
            onClick={handleArchive}
            disabled={archiving}
            className="px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
          >
            {archiving ? 'Archiving...' : 'Archive'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Location</h2>
          </div>
          <div className="p-4" style={{ height: '400px' }}>
            <MapsProvider>
              {tract.geometry ? (
                <SiteMap
                  siteGeometry={site?.boundaryGeometry}
                  landTracts={[tract]}
                  center={tract.centroid || mapCenter}
                  selectedLandId={tract.id}
                  showLabels={false}
                  height="100%"
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No map data available</p>
                </div>
              )}
            </MapsProvider>
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Details */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Details</h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase">Area</h4>
                <p className="mt-1 text-sm text-gray-900">{formatAcres(tract.areaAcres)}</p>
                {tract.areaSqMeters && (
                  <p className="text-xs text-gray-500">
                    {tract.areaSqMeters.toLocaleString()} sq meters
                  </p>
                )}
              </div>

              {tract.centroid && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase">Center Point</h4>
                  <p className="mt-1 text-sm text-gray-900 font-mono">
                    {tract.centroid.lat}, {tract.centroid.lng}
                  </p>
                </div>
              )}

              {tract.notes && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase">Notes</h4>
                  <p className="mt-1 text-sm text-gray-900">{tract.notes}</p>
                </div>
              )}

              {tract.tags && tract.tags.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase">Tags</h4>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {tract.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Soil Information */}
          {tract.soil && (tract.soil.type || tract.soil.ph || tract.soil.notes) && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Soil Information</h2>
              </div>
              <div className="p-4 space-y-4">
                {tract.soil.type && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 uppercase">Soil Type</h4>
                    <p className="mt-1 text-sm text-gray-900">{tract.soil.type}</p>
                  </div>
                )}
                {tract.soil.ph && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 uppercase">pH Level</h4>
                    <p className="mt-1 text-sm text-gray-900">{tract.soil.ph}</p>
                  </div>
                )}
                {tract.soil.notes && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 uppercase">Notes</h4>
                    <p className="mt-1 text-sm text-gray-900">{tract.soil.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Metadata</h2>
            </div>
            <div className="p-4 space-y-4">
              {tract.createdAt && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase">Created</h4>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(tract.createdAt._seconds ? tract.createdAt._seconds * 1000 : tract.createdAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              {tract.updatedAt && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase">Last Updated</h4>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(tract.updatedAt._seconds ? tract.updatedAt._seconds * 1000 : tract.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
