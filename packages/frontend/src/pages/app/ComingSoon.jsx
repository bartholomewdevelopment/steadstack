import { Link } from 'react-router-dom';

const moduleInfo = {
  events: {
    title: 'Events',
    description: 'Track every farm activity as an operational event. Feeding, treatments, harvests, maintenance - everything in one place.',
    icon: (
      <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
    features: [
      'Log any farm activity',
      'Recurring task scheduling',
      'Work order management',
      'Automatic inventory updates',
      'Cost tracking per event',
    ],
  },
  animals: {
    title: 'Livestock',
    description: 'Manage your livestock with detailed records for each animal. Track health, breeding, lineage, and more.',
    icon: (
      <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
      </svg>
    ),
    features: [
      'Individual animal records',
      'Health & treatment history',
      'Breeding & lineage tracking',
      'Weight & growth monitoring',
      'Tag & ID management',
    ],
  },
  inventory: {
    title: 'Inventory',
    description: 'Track feed, supplies, and equipment. Automatic deductions when you log events. Never run out of essentials.',
    icon: (
      <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
    features: [
      'Stock level tracking',
      'Automatic event deductions',
      'Reorder alerts',
      'Purchase order generation',
      'Multi-location support',
    ],
  },
  accounting: {
    title: 'Accounting',
    description: 'Double-entry accounting built for agriculture. Track costs per animal, per field, per activity.',
    icon: (
      <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    features: [
      'Double-entry ledger',
      'Event-to-ledger linking',
      'Cost per animal/field',
      'Balance sheet',
      'Tax-ready reports',
    ],
  },
  reports: {
    title: 'Reports',
    description: 'Generate P&L statements, balance sheets, and custom reports. Know exactly where your money goes.',
    icon: (
      <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    features: [
      'Profit & Loss statements',
      'Balance sheets',
      'Custom date ranges',
      'Per-site breakdown',
      'Export to PDF/CSV',
    ],
  },
};

export default function ComingSoon({ module }) {
  const info = moduleInfo[module] || {
    title: 'Coming Soon',
    description: 'This feature is under development.',
    icon: (
      <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
      </svg>
    ),
    features: [],
  };

  return (
    <div className="max-w-2xl mx-auto py-12">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-primary-100 text-primary-600 mb-6">
          {info.icon}
        </div>

        <h1 className="text-3xl font-display font-bold text-gray-900">{info.title}</h1>

        <p className="mt-4 text-lg text-gray-600">{info.description}</p>

        <div className="mt-8 inline-block">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-secondary-100 text-secondary-800 rounded-full text-sm font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Coming Soon
          </span>
        </div>

        {info.features.length > 0 && (
          <div className="mt-12 text-left">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">What to expect:</h2>
            <ul className="space-y-3">
              {info.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-primary-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-12 p-6 bg-gray-50 rounded-xl">
          <p className="text-gray-600">
            Want to be notified when {info.title} launches?
          </p>
          <Link to="/app/settings" className="btn-primary mt-4 inline-block">
            Manage Notifications
          </Link>
        </div>
      </div>
    </div>
  );
}
