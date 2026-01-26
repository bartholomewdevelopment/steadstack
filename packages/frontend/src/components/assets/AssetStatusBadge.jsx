const statusConfig = {
  ACTIVE: { bg: 'bg-green-100', text: 'text-green-700', label: 'Active' },
  SOLD: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Sold' },
  RETIRED: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Retired' },
  LOST: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Lost' },
  ARCHIVED: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Archived' },
  DECEASED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Deceased' },
};

export default function AssetStatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.ACTIVE;

  return (
    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}
