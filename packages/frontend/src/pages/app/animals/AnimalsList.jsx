import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSite } from '../../../contexts/SiteContext';
import { animalsApi, sitesApi } from '../../../services/api';
import { HelpTooltip } from '../../../components/ui/Tooltip';

const speciesIcons = {
  // Large livestock
  cattle: '🐄',
  horse: '🐴',
  donkey: '🫏',
  mule: '🫏',
  // Small livestock
  sheep: '🐑',
  goat: '🐐',
  pig: '🐷',
  llama: '🦙',
  alpaca: '🦙',
  // Poultry
  chicken: '🐔',
  turkey: '🦃',
  duck: '🦆',
  goose: '🦢',
  guinea_fowl: '🐔',
  quail: '🐦',
  // Other
  rabbit: '🐰',
  bee: '🐝',
  other: '🐾',
};

const statusColors = {
  active: 'bg-green-100 text-green-700',
  sold: 'bg-blue-100 text-blue-700',
  deceased: 'bg-gray-100 text-gray-700',
  transferred: 'bg-yellow-100 text-yellow-700',
  culled: 'bg-red-100 text-red-700',
};

export default function AnimalsList() {
  const { currentSite } = useSite();
  const [searchParams, setSearchParams] = useSearchParams();
  const [animals, setAnimals] = useState([]);
  const [groups, setGroups] = useState([]);
  const [sites, setSites] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  // Filters from URL
  const currentStatus = searchParams.get('status') || 'active';
  const currentSpecies = searchParams.get('species') || '';
  const currentGroup = searchParams.get('groupId') || '';
  const currentSiteFilter = searchParams.get('siteId') || '';
  const currentSearch = searchParams.get('search') || '';
  const currentPage = parseInt(searchParams.get('page') || '1');

  useEffect(() => {
    if (currentSite?.id) {
      fetchData();
    }
  }, [currentSite, currentStatus, currentSpecies, currentGroup, currentSiteFilter, currentSearch, currentPage]);

  const fetchData = async () => {
    if (!currentSite?.id) return;

    try {
      setLoading(true);
      setError(null);

      const params = { page: currentPage, limit: 20, siteId: currentSite.id };
      if (currentStatus) params.status = currentStatus;
      if (currentSpecies) params.species = currentSpecies;
      if (currentGroup) params.groupId = currentGroup;
      if (currentSiteFilter) params.siteId = currentSiteFilter;
      if (currentSearch) params.search = currentSearch;

      const [animalsRes, groupsRes, sitesRes, statsRes] = await Promise.all([
        animalsApi.list(params),
        animalsApi.listGroups({ siteId: currentSite.id }),
        sitesApi.list(),
        animalsApi.getStats({ siteId: currentSite.id }),
      ]);

      setAnimals(animalsRes.data?.animals || []);
      setPagination(animalsRes.data?.pagination || { page: 1, pages: 1, total: 0 });
      setGroups(groupsRes.data?.groups || []);
      setSites(sitesRes.data?.sites || []);
      setStats(statsRes.data?.stats || null);
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

  const formatAge = (animal) => {
    if (!animal.age) return 'Unknown';
    const { years, months } = animal.age;
    if (years > 0) {
      return `${years}y ${months}m`;
    }
    return `${months}m`;
  };

  if (!currentSite?.id) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Select a site to view animals.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Livestock</h1>
            <HelpTooltip content="Track individual animals with tags, health records, and breeding history. Filter by status to see active, sold, or deceased animals." position="right" />
          </div>
          <p className="text-gray-600">Manage your livestock</p>
        </div>
        <Link to="/app/animals/new" className="btn-primary">
          + Add Livestock
        </Link>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-medium text-gray-500">Total Active</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalActive}</p>
          </div>
          {Object.entries(stats.bySpecies || {}).slice(0, 3).map(([species, count]) => (
            <div key={species} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-500 capitalize flex items-center gap-1">
                <span>{speciesIcons[species] || speciesIcons.other}</span>
                {species}
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={currentSearch}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search by tag, name, breed..."
              className="input py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Species</label>
            <select
              value={currentSpecies}
              onChange={(e) => handleFilterChange('species', e.target.value)}
              className="input py-2 min-w-[140px]"
            >
              <option value="">All Species</option>
              <optgroup label="Large Livestock">
                <option value="cattle">Cattle</option>
                <option value="horse">Horse</option>
                <option value="donkey">Donkey</option>
                <option value="mule">Mule</option>
              </optgroup>
              <optgroup label="Small Livestock">
                <option value="sheep">Sheep</option>
                <option value="goat">Goat</option>
                <option value="pig">Pig</option>
                <option value="llama">Llama</option>
                <option value="alpaca">Alpaca</option>
              </optgroup>
              <optgroup label="Poultry">
                <option value="chicken">Chicken</option>
                <option value="turkey">Turkey</option>
                <option value="duck">Duck</option>
                <option value="goose">Goose</option>
                <option value="guinea_fowl">Guinea Fowl</option>
                <option value="quail">Quail</option>
              </optgroup>
              <optgroup label="Other">
                <option value="rabbit">Rabbit</option>
                <option value="bee">Bee</option>
                <option value="other">Other</option>
              </optgroup>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Group</label>
            <select
              value={currentGroup}
              onChange={(e) => handleFilterChange('groupId', e.target.value)}
              className="input py-2 min-w-[140px]"
            >
              <option value="">All Groups</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={currentStatus}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="input py-2 min-w-[140px]"
            >
              <option value="ALL">All Statuses</option>
              <option value="active">Active</option>
              <option value="sold">Sold</option>
              <option value="deceased">Deceased</option>
              <option value="transferred">Transferred</option>
              <option value="culled">Culled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Livestock List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading livestock...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600">{error}</p>
          <button onClick={fetchData} className="mt-2 text-red-700 underline">
            Try again
          </button>
        </div>
      ) : animals.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">🐄</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No livestock found</h3>
          <p className="text-gray-500 mb-4">
            {currentSearch || currentSpecies || currentGroup
              ? 'Try adjusting your filters'
              : 'Start by adding your first livestock'}
          </p>
          <Link to="/app/animals/new" className="btn-primary">
            + Add Livestock
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Animal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Species / Breed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Group
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Age
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
                {animals.map((animal) => (
                  <tr key={animal.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl">
                          {speciesIcons[animal.species] || speciesIcons.other}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{animal.tagNumber}</p>
                          {animal.name && (
                            <p className="text-sm text-gray-500">{animal.name}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900 capitalize">{animal.species}</p>
                      {animal.breed && (
                        <p className="text-sm text-gray-500">{animal.breed}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {animal.groupId ? (
                        <span className="text-sm text-gray-900">{animal.groupId.name}</span>
                      ) : (
                        <span className="text-sm text-gray-400">No group</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">{formatAge(animal)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${
                          statusColors[animal.status] || statusColors.active
                        }`}
                      >
                        {animal.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/app/animals/${animal.id}`}
                        className="text-red-600 hover:text-red-700 font-medium text-sm"
                      >
                        View
                      </Link>
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
                Page {pagination.page} of {pagination.pages} ({pagination.total} animals)
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
