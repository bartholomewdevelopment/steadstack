import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSite } from '../../../contexts/SiteContext';
import { AssetStatusBadge } from '../../../components/assets';
import { assetsApi } from '../../../services/api';
import { HelpTooltip } from '../../../components/ui/Tooltip';

const assetTypes = [
  { type: 'ANIMAL', icon: '🐄', label: 'Livestock', path: '/app/assets/animals', color: 'bg-green-50 border-green-200' },
  { type: 'LAND', icon: '🏞️', label: 'Land', path: '/app/assets/land', color: 'bg-blue-50 border-blue-200' },
  { type: 'BUILDING', icon: '🏚️', label: 'Buildings', path: '/app/assets/buildings', color: 'bg-amber-50 border-amber-200' },
  { type: 'VEHICLE', icon: '🚜', label: 'Vehicles', path: '/app/assets/vehicles', color: 'bg-purple-50 border-purple-200' },
  { type: 'EQUIPMENT', icon: '⚙️', label: 'Equipment', path: '/app/assets/equipment', color: 'bg-orange-50 border-orange-200' },
  { type: 'INFRASTRUCTURE', icon: '🚰', label: 'Infrastructure', path: '/app/assets/infrastructure', color: 'bg-cyan-50 border-cyan-200' },
  { type: 'TOOL', icon: '🔧', label: 'Tools', path: '/app/assets/tools', color: 'bg-gray-50 border-gray-200' },
  { type: 'OTHER', icon: '📦', label: 'Other', path: '/app/assets/other', color: 'bg-slate-50 border-slate-200' },
];

export default function AssetsOverview() {
  const { currentSite } = useSite();
  const [counts, setCounts] = useState({});
  const [recentAssets, setRecentAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchData();
  }, [currentSite]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = currentSite?.id ? { siteId: currentSite.id } : {};

      const [countsRes, recentRes] = await Promise.all([
        assetsApi.getCounts(params),
        assetsApi.getRecent({ ...params, limit: 5 }),
      ]);

      setCounts(countsRes.data?.counts || countsRes.counts || {});
      setRecentAssets(recentRes.data?.assets || recentRes.assets || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const params = currentSite?.id ? { siteId: currentSite.id } : {};
      const response = await assetsApi.search({ ...params, query, limit: 10 });
      setSearchResults(response.data?.assets || response.assets || []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  const getAssetLink = (asset) => {
    const typeRoutes = {
      ANIMAL: '/app/assets/animals',
      VEHICLE: '/app/assets/vehicles',
      LAND: '/app/assets/land',
      BUILDING: '/app/assets/buildings',
      EQUIPMENT: '/app/assets/equipment',
      INFRASTRUCTURE: '/app/assets/infrastructure',
      TOOL: '/app/assets/tools',
      OTHER: '/app/assets/other',
    };
    return `${typeRoutes[asset.assetType] || '/app/assets'}/${asset.id}`;
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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Assets Overview</h1>
            <HelpTooltip content="Assets are valuable items your farm owns: livestock, vehicles, equipment, land, and buildings. Track their value and condition here." position="right" />
          </div>
          <p className="text-gray-600">
            {currentSite?.name ? `Manage assets at ${currentSite.name}` : 'Manage all your farm assets'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/app/assets/animals/new" className="btn-primary">
            + Add Livestock
          </Link>
          <Link to="/app/assets/vehicles/new" className="btn-secondary">
            + Add Vehicle
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search all assets by name, tag, or ID..."
            className="input py-3 pl-10"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-500 border-t-transparent"></div>
            </div>
          )}
        </div>

        {/* Search Results */}
        {searchQuery && searchResults.length > 0 && (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Search Results</h3>
            <div className="space-y-2">
              {searchResults.map((asset) => (
                <Link
                  key={asset.id}
                  to={getAssetLink(asset)}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {assetTypes.find((t) => t.type === asset.assetType)?.icon || '📦'}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{asset.name}</p>
                      <p className="text-sm text-gray-500">
                        {asset.identifier && <span className="font-mono">{asset.identifier}</span>}
                        {asset.identifier && ' • '}
                        {asset.assetType}
                      </p>
                    </div>
                  </div>
                  <AssetStatusBadge status={asset.status} />
                </Link>
              ))}
            </div>
          </div>
        )}

        {searchQuery && !searching && searchResults.length === 0 && (
          <p className="mt-4 text-center text-gray-500">No assets found matching "{searchQuery}"</p>
        )}
      </div>

      {/* Asset Type Cards */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading assets...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600">{error}</p>
          <button onClick={fetchData} className="mt-2 text-red-700 underline">
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {assetTypes.map((type) => {
              const count = counts[type.type] || { total: 0, active: 0, inactive: 0 };
              return (
                <Link
                  key={type.type}
                  to={type.path}
                  className={`p-4 rounded-xl border ${type.color} hover:shadow-md transition-shadow`}
                >
                  <div className="text-3xl mb-2">{type.icon}</div>
                  <h3 className="font-semibold text-gray-900">{type.label}</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{count.total || 0}</p>
                  {count.inactive > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      {count.inactive} inactive
                    </p>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Recently Updated */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recently Updated</h2>
            </div>
            {recentAssets.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No assets recorded yet. Start by adding an animal or vehicle.
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {recentAssets.map((asset) => (
                  <Link
                    key={asset.id}
                    to={getAssetLink(asset)}
                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">
                        {assetTypes.find((t) => t.type === asset.assetType)?.icon || '📦'}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">{asset.name}</p>
                        <p className="text-sm text-gray-500">
                          {asset.identifier && <span className="font-mono mr-2">{asset.identifier}</span>}
                          {asset.siteName || 'All Sites'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">{formatDate(asset.updatedAt)}</span>
                      <AssetStatusBadge status={asset.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
