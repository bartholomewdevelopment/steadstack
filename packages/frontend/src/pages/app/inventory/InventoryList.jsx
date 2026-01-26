import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { inventoryApi } from '../../../services/api';
import { HelpTooltip } from '../../../components/ui/Tooltip';

const categoryIcons = {
  FEED: '🌾',
  MEDICINE: '💊',
  SUPPLIES: '📦',
  EQUIPMENT_PARTS: '🔧',
  SEED: '🌱',
  FERTILIZER: '🧪',
  CHEMICAL: '🧪',
  FUEL: '⛽',
  OTHER: '📋',
};

export default function InventoryList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  // Filters from URL
  const currentCategory = searchParams.get('category') || '';
  const currentStatus = searchParams.get('activeOnly') || 'true';
  const currentSearch = searchParams.get('search') || '';
  const currentPage = parseInt(searchParams.get('page') || '1');

  useEffect(() => {
    fetchData();
  }, [currentCategory, currentStatus, currentSearch, currentPage]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = { page: currentPage, limit: 20 };
      if (currentCategory) params.category = currentCategory;
      if (currentStatus) params.activeOnly = currentStatus;
      if (currentSearch) params.search = currentSearch;

      const [itemsRes, categoriesRes] = await Promise.all([
        inventoryApi.list(params),
        inventoryApi.getCategories(),
      ]);

      setItems(itemsRes.data?.items || itemsRes.items || []);
      setPagination(itemsRes.data?.pagination || itemsRes.pagination || { page: 1, pages: 1, total: 0 });
      setCategories(categoriesRes.data?.categories || categoriesRes.categories || []);
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  // Group items by category for summary
  const categorySummary = (items || []).reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
            <HelpTooltip content="Track supplies across all sites. Set reorder points to get alerts when stock runs low." position="right" />
          </div>
          <p className="text-gray-600">Manage supplies, feed, and equipment</p>
        </div>
        <Link to="/app/inventory/new" className="btn-primary">
          + Add Item
        </Link>
      </div>

      {/* Category Cards */}
      {Object.keys(categorySummary).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {categories
            .filter((cat) => categorySummary[cat.value])
            .map((cat) => (
              <button
                key={cat.value}
                onClick={() =>
                  handleFilterChange(
                    'category',
                    currentCategory === cat.value ? '' : cat.value
                  )
                }
                className={`p-3 rounded-xl border text-left transition-colors ${
                  currentCategory === cat.value
                    ? 'bg-red-50 border-red-200'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span className="text-xl">{categoryIcons[cat.value]}</span>
                <p className="text-sm font-medium text-gray-900 mt-1">{cat.label}</p>
                <p className="text-xs text-gray-500">{categorySummary[cat.value]} items</p>
              </button>
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
              placeholder="Search by name or SKU..."
              className="input py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={currentCategory}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="input py-2 min-w-[150px]"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={currentStatus}
              onChange={(e) => handleFilterChange('activeOnly', e.target.value)}
              className="input py-2 min-w-[140px]"
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
              <option value="">All</option>
            </select>
          </div>
        </div>
      </div>

      {/* Items List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">Loading inventory...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600">{error}</p>
          <button onClick={fetchData} className="mt-2 text-red-700 underline">
            Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">📦</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No inventory items</h3>
          <p className="text-gray-500 mb-4">
            {currentSearch || currentCategory
              ? 'Try adjusting your filters'
              : 'Start by adding your first inventory item'}
          </p>
          <Link to="/app/inventory/new" className="btn-primary">
            + Add Item
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qty On Hand
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reorder Point
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.id} className={`hover:bg-gray-50 ${!item.active ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xl">
                          {categoryIcons[item.category] || categoryIcons.OTHER}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{item.name}</p>
                          {item.sku && <p className="text-sm text-gray-500">SKU: {item.sku}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full capitalize">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-medium ${
                        item.reorderPoint > 0 && item.qtyOnHand <= item.reorderPoint
                          ? 'text-red-600'
                          : 'text-gray-900'
                      }`}>
                        {item.qtyOnHand || 0}
                      </span>
                      {item.siteBalances?.length > 1 && (
                        <span className="text-xs text-gray-500 ml-1">
                          ({item.siteBalances.length} sites)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.unit}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatCurrency(item.defaultCostPerUnit)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.reorderPoint > 0 ? (
                        <span>
                          {item.reorderPoint} {item.unit}
                        </span>
                      ) : (
                        <span className="text-gray-400">Not set</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/app/inventory/${item.id}`}
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
                Page {pagination.page} of {pagination.pages} ({pagination.total} items)
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
