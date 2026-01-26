import { useSite } from '../../contexts/SiteContext';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'RETIRED', label: 'Retired' },
  { value: 'LOST', label: 'Lost' },
  { value: 'ARCHIVED', label: 'Archived' },
  { value: 'DECEASED', label: 'Deceased' },
];

export default function AssetFilters({
  status,
  onStatusChange,
  search,
  onSearchChange,
  showDeceased = false,
}) {
  const filteredStatuses = showDeceased
    ? statusOptions
    : statusOptions.filter((s) => s.value !== 'DECEASED');

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, tag, ID..."
            className="input py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="input py-2 min-w-[150px]"
          >
            {filteredStatuses.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
