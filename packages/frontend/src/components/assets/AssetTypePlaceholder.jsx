import { Link } from 'react-router-dom';

const typeConfig = {
  LAND: {
    icon: '🏞️',
    title: 'Land',
    description: 'Track land parcels, pastures, and fields. Monitor acreage, soil types, and usage.',
    features: [
      'Parcel boundaries and acreage',
      'Soil type and quality tracking',
      'Lease and ownership records',
      'Usage history',
    ],
  },
  BUILDING: {
    icon: '🏚️',
    title: 'Buildings',
    description: 'Manage barns, sheds, silos, and other structures. Track maintenance and inspections.',
    features: [
      'Structure details and dimensions',
      'Construction and renovation dates',
      'Utility connections',
      'Inspection schedules',
    ],
  },
  EQUIPMENT: {
    icon: '⚙️',
    title: 'Equipment',
    description: 'Track implements, machinery, and specialized equipment. Monitor usage and maintenance.',
    features: [
      'Serial numbers and warranties',
      'Operating specifications',
      'Attachment tracking for tractors',
      'Usage hours logging',
    ],
  },
  INFRASTRUCTURE: {
    icon: '🚰',
    title: 'Infrastructure',
    description: 'Manage fences, water systems, roads, and utilities. Track repairs and upgrades.',
    features: [
      'Fence lines and gates',
      'Water wells and tanks',
      'Roads and access points',
      'Electrical and utility systems',
    ],
  },
  TOOL: {
    icon: '🔧',
    title: 'Tools',
    description: 'Track hand tools, power tools, and portable equipment. Know where everything is.',
    features: [
      'Tool inventory by location',
      'Check-out/check-in tracking',
      'Maintenance schedules',
      'Replacement planning',
    ],
  },
  OTHER: {
    icon: '📦',
    title: 'Other Assets',
    description: 'Track miscellaneous assets that don\'t fit other categories.',
    features: [
      'Custom categorization',
      'Flexible fields',
      'Value tracking',
      'Location assignment',
    ],
  },
};

export default function AssetTypePlaceholder({ type }) {
  const config = typeConfig[type] || {
    icon: '📦',
    title: 'Assets',
    description: 'Asset tracking coming soon.',
    features: [],
  };

  return (
    <div className="space-y-6">
      <div className="max-w-2xl mx-auto py-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gray-100 text-4xl mb-6">
            {config.icon}
          </div>

          <h1 className="text-2xl font-bold text-gray-900">{config.title}</h1>
          <p className="mt-3 text-gray-600">{config.description}</p>

          <div className="mt-6 inline-block">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Coming Soon
            </span>
          </div>

          {config.features.length > 0 && (
            <div className="mt-10 text-left bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">What to expect:</h2>
              <ul className="space-y-3">
                {config.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8">
            <Link to="/app/assets" className="text-primary-600 hover:text-primary-700 font-medium">
              ← Back to Assets Overview
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
