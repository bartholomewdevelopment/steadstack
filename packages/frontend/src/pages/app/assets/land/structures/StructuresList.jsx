import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { structuresApi, landTractsApi, binsApi } from '../../../../../services/api';
import { useSite } from '../../../../../contexts/SiteContext';
import StructureModal from './StructureModal';

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

const structureTypeIcons = {
  BARN: '🏚️',
  SHOP: '🏭',
  SHED: '🛖',
  GARAGE: '🚗',
  GREENHOUSE: '🌿',
  COOP: '🐔',
  HOUSE: '🏠',
  CONTAINER: '📦',
  OTHER: '🏗️',
};

export default function StructuresList() {
  const { currentSite } = useSite();
  const [structures, setStructures] = useState([]);
  const [landTracts, setLandTracts] = useState([]);
  const [landTractMap, setLandTractMap] = useState({});
  const [areasCounts, setAreasCounts] = useState({});
  const [binsCounts, setBinsCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [showLandTractSelector, setShowLandTractSelector] = useState(false);
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [selectedLandTractId, setSelectedLandTractId] = useState(null);

  useEffect(() => {
    fetchData();
  }, [currentSite]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch structures and land tracts in parallel
      const [structuresRes, tractsRes] = await Promise.all([
        structuresApi.list(),
        landTractsApi.list({ limit: 100 }),
      ]);

      const structuresList = structuresRes.data?.structures || [];
      const tractsList = tractsRes.data?.tracts || [];

      setStructures(structuresList);
      setLandTracts(tractsList);

      // Build land tract lookup map
      const tractMap = {};
      tractsList.forEach(tract => {
        tractMap[tract.id] = tract;
      });
      setLandTractMap(tractMap);

      // Fetch areas and bins counts for each structure
      const areaCounts = {};
      const binCounts = {};
      await Promise.all(
        structuresList.map(async (structure) => {
          try {
            const [areasRes, binsRes] = await Promise.all([
              structuresApi.listAreas(structure.id),
              binsApi.listByStructure(structure.id),
            ]);
            areaCounts[structure.id] = areasRes.data?.areas?.length || 0;
            binCounts[structure.id] = binsRes.data?.bins?.length || 0;
          } catch (err) {
            console.error(`Failed to fetch areas/bins for structure ${structure.id}:`, err);
            areaCounts[structure.id] = 0;
            binCounts[structure.id] = 0;
          }
        })
      );
      setAreasCounts(areaCounts);
      setBinsCounts(binCounts);
    } catch (err) {
      console.error('Error fetching structures:', err);
      setError('Failed to load structures');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClick = () => {
    if (landTracts.length === 0) {
      setError('You need to create a Land Tract first before adding structures.');
      return;
    }
    if (landTracts.length === 1) {
      // If only one land tract, skip the selector
      setSelectedLandTractId(landTracts[0].id);
      setShowStructureModal(true);
    } else {
      setShowLandTractSelector(true);
    }
  };

  const handleLandTractSelect = (tractId) => {
    setSelectedLandTractId(tractId);
    setShowLandTractSelector(false);
    setShowStructureModal(true);
  };

  const handleStructureSaved = () => {
    fetchData();
    setSelectedLandTractId(null);
  };

  // Group structures by land tract
  const structuresByTract = structures.reduce((acc, structure) => {
    const tractId = structure.landTractId || 'unassigned';
    if (!acc[tractId]) {
      acc[tractId] = [];
    }
    acc[tractId].push(structure);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Structures</h1>
          <p className="text-gray-600">
            Buildings, barns, sheds, and other structures on your land
          </p>
        </div>
        <button
          onClick={handleAddClick}
          className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Structure
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {structures.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
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
          <h3 className="mt-4 text-lg font-medium text-gray-900">No structures yet</h3>
          <p className="mt-2 text-gray-500">
            Get started by adding your first structure.
          </p>
          {landTracts.length > 0 ? (
            <button
              onClick={handleAddClick}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              Add Your First Structure
            </button>
          ) : (
            <Link
              to="/app/assets/land/tracts"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              Create a Land Tract First
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(structuresByTract).map(([tractId, tractStructures]) => {
            const tract = landTractMap[tractId];
            return (
              <div key={tractId}>
                {/* Land Tract Header */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">🏞️</span>
                  {tract ? (
                    <Link
                      to={`/app/assets/land/tracts/${tractId}`}
                      className="text-lg font-semibold text-gray-900 hover:text-green-600"
                    >
                      {tract.name}
                    </Link>
                  ) : (
                    <span className="text-lg font-semibold text-gray-500">Unassigned</span>
                  )}
                  <span className="text-sm text-gray-500">
                    ({tractStructures.length} structure{tractStructures.length !== 1 ? 's' : ''})
                  </span>
                </div>

                {/* Structure Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tractStructures.map((structure) => {
                    const areasCount = areasCounts[structure.id] || 0;
                    const binsCount = binsCounts[structure.id] || 0;
                    return (
                      <Link
                        key={structure.id}
                        to={`/app/assets/land/structures/${structure.id}`}
                        className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-green-300 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">
                              {structureTypeIcons[structure.type] || '🏗️'}
                            </span>
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {structure.name}
                              </h3>
                              {structure.type && (
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${
                                    structureTypeColors[structure.type] || structureTypeColors.OTHER
                                  }`}
                                >
                                  {structure.type}
                                </span>
                              )}
                            </div>
                          </div>
                          <svg
                            className="w-5 h-5 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M8.25 4.5l7.5 7.5-7.5 7.5"
                            />
                          </svg>
                        </div>

                        {structure.description && (
                          <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                            {structure.description}
                          </p>
                        )}

                        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                            </svg>
                            {areasCount} area{areasCount !== 1 ? 's' : ''}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                            </svg>
                            {binsCount} bin{binsCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </Link>
                    );
                  })}

                  {/* Add Structure Card for this tract */}
                  <button
                    onClick={() => {
                      setSelectedLandTractId(tractId);
                      setShowStructureModal(true);
                    }}
                    className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-4 hover:border-green-400 hover:bg-green-50 transition-all flex items-center justify-center min-h-[120px]"
                  >
                    <div className="text-center">
                      <svg
                        className="mx-auto w-8 h-8 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      <span className="mt-2 block text-sm font-medium text-gray-600">
                        Add Structure
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Land Tract Selector Modal */}
      {showLandTractSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Select Land Tract
              </h2>
              <button
                onClick={() => setShowLandTractSelector(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Choose which land tract this structure will be located on:
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {landTracts.map((tract) => (
                <button
                  key={tract.id}
                  onClick={() => handleLandTractSelect(tract.id)}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-all flex items-center gap-3"
                >
                  <span className="text-xl">🏞️</span>
                  <div>
                    <p className="font-medium text-gray-900">{tract.name}</p>
                    {tract.acres && (
                      <p className="text-sm text-gray-500">{tract.acres} acres</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Structure Modal */}
      {showStructureModal && selectedLandTractId && (
        <StructureModal
          isOpen={showStructureModal}
          onClose={() => {
            setShowStructureModal(false);
            setSelectedLandTractId(null);
          }}
          onSave={handleStructureSaved}
          landTractId={selectedLandTractId}
          structure={null}
        />
      )}
    </div>
  );
}
