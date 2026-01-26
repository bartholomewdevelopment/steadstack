import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapsProvider, PolygonDrawer, SiteMap } from '../../../../../components/maps';
import { sitesApi, landTractsApi } from '../../../../../services/api';
import { useSite } from '../../../../../contexts/SiteContext';
import { calculateCentroid, formatAcres } from '../../../../../utils/geometry';

export default function SiteDetail() {
  const { siteId } = useParams();
  const navigate = useNavigate();
  const { refreshSites } = useSite();

  const [site, setSite] = useState(null);
  const [landTracts, setLandTracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Edit state
  const [editedBoundary, setEditedBoundary] = useState(null);
  const [editedArea, setEditedArea] = useState({ sqMeters: 0, acres: 0 });

  useEffect(() => {
    fetchData();
  }, [siteId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [siteRes, tractsRes] = await Promise.all([
        sitesApi.get(siteId),
        landTractsApi.list({ siteId, status: 'active' }),
      ]);
      setSite(siteRes.data?.site);
      setLandTracts(tractsRes.data?.tracts || []);

      if (siteRes.data?.site?.boundaryGeometry) {
        setEditedBoundary(siteRes.data.site.boundaryGeometry);
        setEditedArea({
          sqMeters: siteRes.data.site.boundaryAreaSqMeters || 0,
          acres: siteRes.data.site.boundaryAreaAcres || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching site:', error);
      setError('Failed to load site');
    } finally {
      setLoading(false);
    }
  };

  const handleGeometryChange = (geometry) => {
    setEditedBoundary(geometry);
  };

  const handleAreaChange = (area) => {
    setEditedArea(area);
  };

  const handleSaveBoundary = async () => {
    try {
      setSaving(true);
      setError('');

      const centroid = editedBoundary ? calculateCentroid(editedBoundary) : null;

      await sitesApi.update(siteId, {
        boundaryGeometry: editedBoundary,
        boundaryAreaSqMeters: editedArea.sqMeters,
        boundaryAreaAcres: editedArea.acres,
        boundaryCentroid: centroid,
      });

      await refreshSites();
      await fetchData();
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving boundary:', error);
      setError('Failed to save boundary');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm('Are you sure you want to archive this site? This will also archive all land tracts within it.')) {
      return;
    }

    try {
      setSaving(true);
      await sitesApi.delete(siteId);
      await refreshSites();
      navigate('/app/assets/land/sites');
    } catch (error) {
      console.error('Error archiving site:', error);
      setError('Failed to archive site');
    } finally {
      setSaving(false);
    }
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

  if (!site) {
    return (
      <div>
                <div className="bg-white rounded-lg shadow p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900">Site Not Found</h3>
          <Link
            to="/app/assets/land/sites"
            className="mt-4 inline-flex items-center text-green-600 hover:text-green-700"
          >
            ← Back to Sites
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
          to="/app/assets/land/sites"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back to Sites
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{site.name}</h1>
          <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
            {site.code && <span className="font-mono">{site.code}</span>}
            <span className="capitalize">{site.type || 'Farm'}</span>
            {site.boundaryAreaAcres && (
              <span>{formatAcres(site.boundaryAreaAcres)}</span>
            )}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
              site.status === 'active' ? 'bg-green-100 text-green-800' :
              site.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {site.status || 'active'}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditing && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                {site.boundaryGeometry ? 'Edit Boundary' : 'Draw Boundary'}
              </button>
              <button
                onClick={handleArchive}
                disabled={saving}
                className="px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
              >
                Archive
              </button>
            </>
          )}
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
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditing ? 'Edit Boundary' : 'Site Map'}
            </h2>
            {isEditing && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedBoundary(site.boundaryGeometry);
                    setEditedArea({
                      sqMeters: site.boundaryAreaSqMeters || 0,
                      acres: site.boundaryAreaAcres || 0,
                    });
                  }}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBoundary}
                  disabled={saving}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Boundary'}
                </button>
              </div>
            )}
          </div>
          <div className="p-4" style={{ height: '500px' }}>
            <MapsProvider>
              {isEditing ? (
                <PolygonDrawer
                  center={mapCenter}
                  initialGeometry={editedBoundary}
                  onGeometryChange={handleGeometryChange}
                  onAreaChange={handleAreaChange}
                />
              ) : site.boundaryGeometry ? (
                <SiteMap
                  siteGeometry={site.boundaryGeometry}
                  landTracts={landTracts}
                  center={mapCenter}
                  onLandClick={(tract) => navigate(`/app/assets/land/tracts/${tract.id}`)}
                  height="100%"
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No Boundary Set</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Draw a boundary to enable land tract management
                    </p>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                    >
                      Draw Boundary
                    </button>
                  </div>
                </div>
              )}
            </MapsProvider>
          </div>
          {isEditing && (
            <div className="px-4 pb-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">
                  {editedBoundary ? 'Boundary Status: Set' : 'Boundary Status: Not Set'}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {formatAcres(editedArea.acres)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Site Details */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Details</h2>
            </div>
            <div className="p-4 space-y-4">
              {site.address && (site.address.street || site.address.city) && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase">Address</h4>
                  <p className="mt-1 text-sm text-gray-900">
                    {site.address.street && <span>{site.address.street}<br /></span>}
                    {site.address.city && <span>{site.address.city}, </span>}
                    {site.address.state && <span>{site.address.state} </span>}
                    {site.address.zipCode && <span>{site.address.zipCode}</span>}
                  </p>
                </div>
              )}
              {site.coordinates && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase">Coordinates</h4>
                  <p className="mt-1 text-sm text-gray-900 font-mono">
                    {site.coordinates.latitude}, {site.coordinates.longitude}
                  </p>
                </div>
              )}
              {site.description && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase">Description</h4>
                  <p className="mt-1 text-sm text-gray-900">{site.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Land Tracts */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Land Tracts ({landTracts.length})
              </h2>
              {site.boundaryGeometry && (
                <Link
                  to={`/app/assets/land/tracts/new?siteId=${siteId}`}
                  className="text-sm text-green-600 hover:text-green-700"
                >
                  + Add
                </Link>
              )}
            </div>
            <div className="divide-y divide-gray-100">
              {landTracts.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  {site.boundaryGeometry
                    ? 'No land tracts yet'
                    : 'Draw a site boundary first'}
                </div>
              ) : (
                landTracts.map((tract) => (
                  <Link
                    key={tract.id}
                    to={`/app/assets/land/tracts/${tract.id}`}
                    className="block p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{tract.name}</p>
                        <p className="text-xs text-gray-500">{tract.type}</p>
                      </div>
                      <span className="text-sm text-gray-600">
                        {formatAcres(tract.areaAcres)}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
