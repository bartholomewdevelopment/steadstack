import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { structuresApi, areasApi, binsApi, landTractsApi } from '../../../../../services/api';
import StructureModal from './StructureModal';
import AreaModal from './AreaModal';
import BinModal from './BinModal';

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

export default function StructureDetail() {
  const { structureId } = useParams();
  const navigate = useNavigate();

  const [structure, setStructure] = useState(null);
  const [landTract, setLandTract] = useState(null);
  const [areas, setAreas] = useState([]);
  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  // Modal states
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [showBinModal, setShowBinModal] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [editingBin, setEditingBin] = useState(null);

  useEffect(() => {
    fetchData();
  }, [structureId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await structuresApi.get(structureId);
      const structureData = res.data?.structure;
      setStructure(structureData);

      // Fetch land tract, areas, and bins in parallel
      const [tractRes, areasRes, binsRes] = await Promise.all([
        landTractsApi.get(structureData.landTractId),
        structuresApi.listAreas(structureId),
        binsApi.listByStructure(structureId),
      ]);

      setLandTract(tractRes.data?.tract);
      setAreas(areasRes.data?.areas || []);
      setBins(binsRes.data?.bins || []);
    } catch (error) {
      console.error('Error fetching structure:', error);
      setError('Failed to load structure');
    } finally {
      setLoading(false);
    }
  };

  const fetchAreas = async () => {
    try {
      const res = await structuresApi.listAreas(structureId);
      setAreas(res.data?.areas || []);
    } catch (error) {
      console.error('Error fetching areas:', error);
    }
  };

  const handleStructureSaved = () => {
    fetchData();
  };

  const handleAreaSaved = () => {
    fetchAreas();
    setEditingArea(null);
  };

  const handleEditArea = (area) => {
    setEditingArea(area);
    setShowAreaModal(true);
  };

  const handleDeleteArea = async (area) => {
    if (!confirm(`Are you sure you want to delete "${area.name}"?`)) {
      return;
    }

    try {
      await areasApi.delete(area.id);
      fetchAreas();
      fetchBins(); // Refresh bins in case any were cascade deleted
    } catch (error) {
      console.error('Error deleting area:', error);
      setError('Failed to delete area');
    }
  };

  const fetchBins = async () => {
    try {
      const res = await binsApi.listByStructure(structureId);
      setBins(res.data?.bins || []);
    } catch (error) {
      console.error('Error fetching bins:', error);
    }
  };

  const handleBinSaved = () => {
    fetchBins();
    setEditingBin(null);
  };

  const handleEditBin = (bin) => {
    setEditingBin(bin);
    setShowBinModal(true);
  };

  const handleDeleteBin = async (bin) => {
    if (!confirm(`Are you sure you want to delete bin "${bin.name}" (${bin.code})?`)) {
      return;
    }

    try {
      await binsApi.delete(bin.id);
      fetchBins();
    } catch (error) {
      console.error('Error deleting bin:', error);
      setError('Failed to delete bin');
    }
  };

  const handleDeleteStructure = async () => {
    const areaCount = areas.length;
    const message = areaCount > 0
      ? `Are you sure you want to delete this structure? This will also delete ${areaCount} area${areaCount > 1 ? 's' : ''}.`
      : 'Are you sure you want to delete this structure?';

    if (!confirm(message)) {
      return;
    }

    try {
      setDeleting(true);
      await structuresApi.delete(structureId);
      navigate('/app/assets/structures');
    } catch (error) {
      console.error('Error deleting structure:', error);
      setError('Failed to delete structure');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  if (!structure) {
    return (
      <div>
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900">Structure Not Found</h3>
          <Link
            to="/app/assets/structures"
            className="mt-4 inline-flex items-center text-green-600 hover:text-green-700"
          >
            &larr; Back to Structures
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
          to="/app/assets/structures"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Back to Structures
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{structure.name}</h1>
            {structure.type && (
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  structureTypeColors[structure.type] || structureTypeColors.OTHER
                }`}
              >
                {structure.type}
              </span>
            )}
          </div>
          {landTract && (
            <p className="mt-1 text-sm text-gray-500">
              Located on{' '}
              <Link
                to={`/app/assets/land/tracts/${structure.landTractId}`}
                className="text-green-600 hover:text-green-700"
              >
                {landTract.name}
              </Link>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowStructureModal(true)}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Edit
          </button>
          <button
            onClick={handleDeleteStructure}
            disabled={deleting}
            className="px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details Card */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Details</h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase">Name</h4>
                <p className="mt-1 text-sm text-gray-900">{structure.name}</p>
              </div>

              {structure.type && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase">Type</h4>
                  <p className="mt-1 text-sm text-gray-900">{structure.type}</p>
                </div>
              )}

              {structure.description && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase">Description</h4>
                  <p className="mt-1 text-sm text-gray-900">{structure.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Areas Section */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Areas</h2>
              <button
                onClick={() => {
                  setEditingArea(null);
                  setShowAreaModal(true);
                }}
                className="text-sm text-green-600 hover:text-green-700 font-medium"
              >
                + Add Area
              </button>
            </div>
            <div className="p-4">
              {areas.length === 0 ? (
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
                      d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                    />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">No areas defined for this structure.</p>
                  <button
                    onClick={() => {
                      setEditingArea(null);
                      setShowAreaModal(true);
                    }}
                    className="mt-3 text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    Add your first area
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {areas.map((area) => (
                    <div
                      key={area.id}
                      className="py-3 flex items-center justify-between hover:bg-gray-50 -mx-4 px-4"
                    >
                      <div className="flex-1">
                        <span className="font-medium text-gray-900">{area.name}</span>
                        {area.description && (
                          <p className="text-sm text-gray-500 mt-0.5">{area.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditArea(area)}
                          className="text-gray-400 hover:text-gray-600 p-1"
                          title="Edit"
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
                        <button
                          onClick={() => handleDeleteArea(area)}
                          className="text-gray-400 hover:text-red-600 p-1"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bins Section */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Storage Bins</h2>
              <button
                onClick={() => {
                  setEditingBin(null);
                  setShowBinModal(true);
                }}
                className="text-sm text-green-600 hover:text-green-700 font-medium"
              >
                + Add Bin
              </button>
            </div>
            <div className="p-4">
              {bins.length === 0 ? (
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
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">No storage bins defined for this structure.</p>
                  <p className="text-xs text-gray-400 mt-1">Bins are specific storage locations like shelves, drawers, hooks, etc.</p>
                  <button
                    onClick={() => {
                      setEditingBin(null);
                      setShowBinModal(true);
                    }}
                    className="mt-3 text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    Add your first bin
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {bins.map((bin) => {
                    const areaName = areas.find(a => a.id === bin.areaId)?.name;
                    return (
                      <div
                        key={bin.id}
                        className="py-3 flex items-center justify-between hover:bg-gray-50 -mx-4 px-4"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm bg-gray-100 px-2 py-0.5 rounded">
                              {bin.code}
                            </span>
                            <span className="font-medium text-gray-900">{bin.name}</span>
                            {bin.type && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                {bin.type}
                              </span>
                            )}
                          </div>
                          {(areaName || bin.notes) && (
                            <p className="text-sm text-gray-500 mt-0.5">
                              {areaName && <span>in {areaName}</span>}
                              {areaName && bin.notes && <span> - </span>}
                              {bin.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditBin(bin)}
                            className="text-gray-400 hover:text-gray-600 p-1"
                            title="Edit"
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
                          <button
                            onClick={() => handleDeleteBin(bin)}
                            className="text-gray-400 hover:text-red-600 p-1"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Metadata */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Metadata</h2>
            </div>
            <div className="p-4 space-y-4">
              {structure.createdAt && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase">Created</h4>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(
                      structure.createdAt._seconds
                        ? structure.createdAt._seconds * 1000
                        : structure.createdAt
                    ).toLocaleDateString()}
                  </p>
                </div>
              )}
              {structure.updatedAt && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase">Last Updated</h4>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(
                      structure.updatedAt._seconds
                        ? structure.updatedAt._seconds * 1000
                        : structure.updatedAt
                    ).toLocaleDateString()}
                  </p>
                </div>
              )}
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase">Areas</h4>
                <p className="mt-1 text-sm text-gray-900">{areas.length}</p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase">Storage Bins</h4>
                <p className="mt-1 text-sm text-gray-900">{bins.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Structure Modal */}
      <StructureModal
        isOpen={showStructureModal}
        onClose={() => setShowStructureModal(false)}
        onSave={handleStructureSaved}
        landTractId={structure.landTractId}
        structure={structure}
      />

      {/* Area Modal */}
      <AreaModal
        isOpen={showAreaModal}
        onClose={() => {
          setShowAreaModal(false);
          setEditingArea(null);
        }}
        onSave={handleAreaSaved}
        structureId={structureId}
        area={editingArea}
      />

      {/* Bin Modal */}
      <BinModal
        isOpen={showBinModal}
        onClose={() => {
          setShowBinModal(false);
          setEditingBin(null);
        }}
        onSave={handleBinSaved}
        structureId={structureId}
        areas={areas}
        bin={editingBin}
      />
    </div>
  );
}
