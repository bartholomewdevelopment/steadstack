import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapsProvider, SiteMap } from '../../../../../components/maps';
import { landTractsApi, sitesApi, structuresApi } from '../../../../../services/api';
import { useSite } from '../../../../../contexts/SiteContext';
import { formatAcres } from '../../../../../utils/geometry';
import StructureModal from '../structures/StructureModal';

const typeColors = {
  PARCEL: 'bg-blue-100 text-blue-800',
  FIELD: 'bg-yellow-100 text-yellow-800',
  PASTURE: 'bg-green-100 text-green-800',
  INFRASTRUCTURE: 'bg-gray-100 text-gray-800',
  OTHER: 'bg-purple-100 text-purple-800',
};

const structureTypeColors = {
  BARN: 'bg-amber-100 text-amber-800',
  SHOP: 'bg-blue-100 text-blue-800',
  SHED: 'bg-gray-100 text-gray-800',
  GARAGE: 'bg-slate-100 text-slate-800',
  GREENHOUSE: 'bg-green-100 text-green-800',
  COOP: 'bg-orange-100 text-orange-800',
  HOUSE: 'bg-purple-100 text-purple-800',
  CONTAINER: 'bg-cyan-100 text-cyan-800',
  OTHER: 'bg-pink-100 text-pink-800',
};

export default function LandTractDetail() {
  const { tractId } = useParams();
  const navigate = useNavigate();
  const { sites } = useSite();

  const [tract, setTract] = useState(null);
  const [site, setSite] = useState(null);
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState('');
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [editingStructure, setEditingStructure] = useState(null);

  useEffect(() => {
    fetchData();
  }, [tractId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await landTractsApi.get(tractId);
      const tractData = res.data?.tract;
      setTract(tractData);

      // Fetch site and structures in parallel
      const promises = [];
      if (tractData?.siteId) {
        promises.push(sitesApi.get(tractData.siteId));
      }
      promises.push(structuresApi.list({ landTractId: tractId }));

      const results = await Promise.all(promises);

      if (tractData?.siteId) {
        setSite(results[0].data?.site);
        setStructures(results[1].data?.structures || []);
      } else {
        setStructures(results[0].data?.structures || []);
      }
    } catch (error) {
      console.error('Error fetching land tract:', error);
      setError('Failed to load land tract');
    } finally {
      setLoading(false);
    }
  };

  const fetchStructures = async () => {
    try {
      const res = await structuresApi.list({ landTractId: tractId });
      setStructures(res.data?.structures || []);
    } catch (error) {
      console.error('Error fetching structures:', error);
    }
  };

  const handleStructureSaved = () => {
    fetchStructures();
    setEditingStructure(null);
  };

  const handleEditStructure = (structure) => {
    setEditingStructure(structure);
    setShowStructureModal(true);
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

        {/* Structures Section */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Structures</h2>
            <button
              onClick={() => {
                setEditingStructure(null);
                setShowStructureModal(true);
              }}
              className="text-sm text-green-600 hover:text-green-700 font-medium"
            >
              + Add Structure
            </button>
          </div>
          <div className="p-4">
            {structures.length === 0 ? (
              <div className="text-center py-8">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                <p className="mt-2 text-sm text-gray-500">No structures defined for this land tract.</p>
                <button
                  onClick={() => {
                    setEditingStructure(null);
                    setShowStructureModal(true);
                  }}
                  className="mt-3 text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  Add your first structure
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {structures.map((structure) => (
                  <div
                    key={structure.id}
                    className="py-3 flex items-center justify-between hover:bg-gray-50 -mx-4 px-4"
                  >
                    <Link
                      to={`/app/assets/land/structures/${structure.id}`}
                      className="flex items-center gap-3 flex-1"
                    >
                      <span className="font-medium text-gray-900">{structure.name}</span>
                      {structure.type && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            structureTypeColors[structure.type] || structureTypeColors.OTHER
                          }`}
                        >
                          {structure.type}
                        </span>
                      )}
                    </Link>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleEditStructure(structure);
                      }}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
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

      {/* Structure Modal */}
      <StructureModal
        isOpen={showStructureModal}
        onClose={() => {
          setShowStructureModal(false);
          setEditingStructure(null);
        }}
        onSave={handleStructureSaved}
        landTractId={tractId}
        structure={editingStructure}
      />
    </div>
  );
}
